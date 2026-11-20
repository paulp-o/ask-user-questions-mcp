import type { WSContext } from "hono/ws";
import type { WebSocket } from "ws";
import type { AUQConfig } from "@auq/shared";

import { createMessage, WS_TYPES } from "./ws-protocol.js";
import type { SessionBridge } from "./session-bridge.js";
import type { ConfigBridge } from "./config-bridge.js";
import type { HistoryBridge } from "./history-bridge.js";
const SESSION_TYPES = new Set([
  WS_TYPES.SESSION_LIST,
  WS_TYPES.SESSION_ANSWER,
  WS_TYPES.SESSION_REJECT,
]);

const CONFIG_TYPES = new Set([
  WS_TYPES.CONFIG_GET,
  WS_TYPES.CONFIG_SET,
  WS_TYPES.CONFIG_RESET,
  WS_TYPES.CONFIG_EXPORT,
  WS_TYPES.CONFIG_IMPORT,
]);

const HISTORY_TYPES = new Set([WS_TYPES.HISTORY_LIST, WS_TYPES.HISTORY_DETAIL]);

const MESSAGE_SIZE_LIMIT = 1024 * 1024; // 1MB
const RATE_LIMIT_WINDOW_MS = 1000;
const RATE_LIMIT_MAX_MESSAGES = 100;

interface ClientState {
  messageCount: number;
  windowStart: number;
}

export function createWsHandler(
  clients: Set<WSContext<WebSocket>>,
  sessionBridge: SessionBridge,
  configBridge: ConfigBridge,
  historyBridge: HistoryBridge,
  config: AUQConfig,
) {
  const clientStates = new WeakMap<WSContext<WebSocket>, ClientState>();

  return {
    async onOpen(_event: Event, ws: WSContext<WebSocket>) {
      clients.add(ws);
      clientStates.set(ws, { messageCount: 0, windowStart: Date.now() });

      // Send full state sync on connect
      // Send full state sync on connect
      try {
        const sessions = await sessionBridge.getInitialState();
        ws.send(
          JSON.stringify(
            createMessage(WS_TYPES.SYSTEM_SYNC, { sessions, config }),
          ),
        );
      } catch (err) {
        console.error("[ws] Failed to send system:sync:", err);
      }
    },

    async onMessage(event: MessageEvent, ws: WSContext<WebSocket>) {
      const raw =
        typeof event.data === "string"
          ? event.data
          : Buffer.isBuffer(event.data)
            ? event.data.toString("utf-8")
            : String(event.data);

      // Enforce message size limit
      if (raw.length > MESSAGE_SIZE_LIMIT) {
        ws.send(
          JSON.stringify(
            createMessage("error", { error: "Message too large (max 1MB)" }),
          ),
        );
        return;
      }

      // Rate limiting
      const state = clientStates.get(ws);
      if (state) {
        const now = Date.now();
        if (now - state.windowStart > RATE_LIMIT_WINDOW_MS) {
          state.messageCount = 0;
          state.windowStart = now;
        }
        state.messageCount++;
        if (state.messageCount > RATE_LIMIT_MAX_MESSAGES) {
          ws.send(
            JSON.stringify(
              createMessage("error", { error: "Rate limit exceeded" }),
            ),
          );
          return;
        }
      }

      let msg: { type: string; payload?: unknown; requestId?: string };
      try {
        msg = JSON.parse(raw) as typeof msg;
      } catch {
        ws.send(
          JSON.stringify(
            createMessage("error", { error: "Invalid JSON message" }),
          ),
        );
        return;
      }

      const { type, payload, requestId } = msg;

      // system:ping → system:pong
      if (type === WS_TYPES.SYSTEM_PING) {
        ws.send(
          JSON.stringify(createMessage(WS_TYPES.SYSTEM_PONG, null, requestId)),
        );
        return;
      }

      // Route to appropriate bridge
      try {
        if ((SESSION_TYPES as Set<string>).has(type)) {
          await sessionBridge.handleMessage(ws, type, payload, requestId);
        } else if ((CONFIG_TYPES as Set<string>).has(type)) {
          await configBridge.handleMessage(ws, type, payload, requestId);
        } else if ((HISTORY_TYPES as Set<string>).has(type)) {
          await historyBridge.handleMessage(ws, type, payload, requestId);
        } else {
          ws.send(
            JSON.stringify(
              createMessage("error", { error: `Unknown message type: ${type}` }, requestId),
            ),
          );
        }
      } catch (err) {
        console.error(`[ws] Error handling message type ${type}:`, err);
        ws.send(
          JSON.stringify(
            createMessage(
              "error",
              { error: `Internal error handling ${type}` },
              requestId,
            ),
          ),
        );
      }
    },

    onClose(_event: Event, ws: WSContext<WebSocket>) {
      clients.delete(ws);
      clientStates.delete(ws);
    },

    onError(event: Event, ws: WSContext<WebSocket>) {
      console.error("[ws] WebSocket error:", event);
      clients.delete(ws);
    },
  };
}
