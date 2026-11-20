import { describe, it, expect, vi, beforeEach } from "vitest";
import type { WSContext } from "hono/ws";
import type { WebSocket } from "ws";

import { createWsHandler } from "../ws-handler.js";
import { WS_TYPES } from "../ws-protocol.js";
import type { SessionBridge } from "../session-bridge.js";
import type { ConfigBridge } from "../config-bridge.js";
import type { HistoryBridge } from "../history-bridge.js";

function createMockWs(): WSContext<WebSocket> & { sentMessages: string[] } {
  const sentMessages: string[] = [];
  return {
    readyState: 1,
    sentMessages,
    send(data: string) {
      sentMessages.push(data);
    },
    close: vi.fn(),
  } as unknown as WSContext<WebSocket> & { sentMessages: string[] };
}

function createMockSessionBridge(): SessionBridge {
  return {
    start: vi.fn(),
    stop: vi.fn(),
    getInitialState: vi.fn().mockResolvedValue([]),
    handleMessage: vi.fn().mockResolvedValue(undefined),
  } as unknown as SessionBridge;
}

function createMockConfigBridge(): ConfigBridge {
  return {
    handleMessage: vi.fn().mockResolvedValue(undefined),
  } as unknown as ConfigBridge;
}

function createMockHistoryBridge(): HistoryBridge {
  return {
    handleMessage: vi.fn().mockResolvedValue(undefined),
  } as unknown as HistoryBridge;
}

describe("ws-handler", () => {
  let clients: Set<WSContext<WebSocket>>;
  let sessionBridge: SessionBridge;
  let configBridge: ConfigBridge;
  let historyBridge: HistoryBridge;
  let handler: ReturnType<typeof createWsHandler>;

  beforeEach(() => {
    clients = new Set();
    sessionBridge = createMockSessionBridge();
    configBridge = createMockConfigBridge();
    historyBridge = createMockHistoryBridge();
    const mockConfig = { renderer: "web", theme: "system" } as never;
    handler = createWsHandler(clients, sessionBridge, configBridge, historyBridge, mockConfig);
  });

  it("adds client on open and sends system:sync", async () => {
    const ws = createMockWs();
    await handler.onOpen(new Event("open"), ws);
    expect(clients.has(ws)).toBe(true);
    expect(ws.sentMessages).toHaveLength(1);
    const msg = JSON.parse(ws.sentMessages[0]) as { type: string };
    expect(msg.type).toBe(WS_TYPES.SYSTEM_SYNC);
  });

  it("removes client on close", async () => {
    const ws = createMockWs();
    await handler.onOpen(new Event("open"), ws);
    handler.onClose(new Event("close"), ws);
    expect(clients.has(ws)).toBe(false);
  });

  it("routes session:list to session bridge", async () => {
    const ws = createMockWs();
    await handler.onOpen(new Event("open"), ws);
    await handler.onMessage(
      new MessageEvent("message", {
        data: JSON.stringify({ type: WS_TYPES.SESSION_LIST }),
      }),
      ws,
    );
    expect(sessionBridge.handleMessage).toHaveBeenCalledWith(
      ws,
      WS_TYPES.SESSION_LIST,
      undefined,
      undefined,
    );
  });

  it("routes config:get to config bridge", async () => {
    const ws = createMockWs();
    await handler.onOpen(new Event("open"), ws);
    await handler.onMessage(
      new MessageEvent("message", {
        data: JSON.stringify({ type: WS_TYPES.CONFIG_GET }),
      }),
      ws,
    );
    expect(configBridge.handleMessage).toHaveBeenCalled();
  });

  it("responds to system:ping with system:pong", async () => {
    const ws = createMockWs();
    await handler.onOpen(new Event("open"), ws);
    const initialCount = ws.sentMessages.length;
    await handler.onMessage(
      new MessageEvent("message", {
        data: JSON.stringify({ type: WS_TYPES.SYSTEM_PING, requestId: "r1" }),
      }),
      ws,
    );
    const pong = JSON.parse(ws.sentMessages[initialCount]) as {
      type: string;
      requestId: string;
    };
    expect(pong.type).toBe(WS_TYPES.SYSTEM_PONG);
    expect(pong.requestId).toBe("r1");
  });

  it("returns error for unknown message type", async () => {
    const ws = createMockWs();
    await handler.onOpen(new Event("open"), ws);
    const initial = ws.sentMessages.length;
    await handler.onMessage(
      new MessageEvent("message", {
        data: JSON.stringify({ type: "unknown:type" }),
      }),
      ws,
    );
    const err = JSON.parse(ws.sentMessages[initial]) as {
      type: string;
      payload: { error: string };
    };
    expect(err.type).toBe("error");
    expect(err.payload.error).toContain("Unknown message type");
  });

  it("rejects messages exceeding size limit", async () => {
    const ws = createMockWs();
    await handler.onOpen(new Event("open"), ws);
    const oversize = "x".repeat(1024 * 1024 + 1);
    const initial = ws.sentMessages.length;
    await handler.onMessage(
      new MessageEvent("message", { data: oversize }),
      ws,
    );
    const err = JSON.parse(ws.sentMessages[initial]) as {
      payload: { error: string };
    };
    expect(err.payload.error).toContain("too large");
  });
});
