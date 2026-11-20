import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { Hono } from "hono";
import { serveStatic } from "@hono/node-server/serve-static";
import { createNodeWebSocket } from "@hono/node-ws";
import type { WSContext } from "hono/ws";
import type { WebSocket } from "ws";
import type { AUQConfig } from "@auq/shared";

import { SessionBridge } from "./session-bridge.js";
import { ConfigBridge } from "./config-bridge.js";
import { HistoryBridge } from "./history-bridge.js";
import { createWsHandler } from "./ws-handler.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Resolve static files path relative to compiled JS location
// In production: dist/src/web-server/ → packages/web-ui/dist/
const STATIC_ROOT = join(__dirname, "../../packages/web-ui/dist");

export function createApp(config: AUQConfig) {
  const app = new Hono();
  const clients = new Set<WSContext<WebSocket>>();

  const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

  const sessionBridge = new SessionBridge(clients);
  const configBridge = new ConfigBridge();
  const historyBridge = new HistoryBridge();
  const wsHandler = createWsHandler(
    clients,
    sessionBridge,
    configBridge,
    historyBridge,
    config,
  );

  // WebSocket upgrade — localhost Origin validation
  app.get(
    "/ws",
    async (c, next) => {
      const origin = c.req.header("Origin");
      if (
        origin &&
        !origin.startsWith("http://localhost") &&
        !origin.startsWith("http://127.0.0.1")
      ) {
        return c.text("Forbidden", 403);
      }
      await next();
    },
    upgradeWebSocket(() => ({
      onOpen: (e, ws) => wsHandler.onOpen(e, ws),
      onMessage: (e, ws) => wsHandler.onMessage(e, ws),
      onClose: (e, ws) => wsHandler.onClose(e, ws),
      onError: (e, ws) => wsHandler.onError(e, ws),
    })),
  );

  // Static assets
  app.use("/assets/*", serveStatic({ root: STATIC_ROOT }));

  // SPA fallback — serve index.html for all non-file routes
  app.get("*", serveStatic({ root: STATIC_ROOT, path: "index.html" }));

  return { app, injectWebSocket, sessionBridge, clients };
}
