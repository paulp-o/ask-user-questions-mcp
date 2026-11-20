import getPort from "get-port";
import { serve } from "@hono/node-server";

import type { AUQConfig } from "@auq/shared";

import { createApp } from "./app.js";

export interface WebServerOptions {
  open?: boolean;
  port?: number;
  config: AUQConfig;
}

/**
 * Start the AUQ web server.
 *
 * Resolves when the server shuts down (SIGINT/SIGTERM or explicit close).
 */
export async function startWebServer(opts: WebServerOptions): Promise<void> {
  const { open: openBrowser = true, port: preferredPort } = opts;

  const port = await getPort({ port: preferredPort ?? 3000, host: "127.0.0.1" });

  const { app, injectWebSocket, sessionBridge, clients } = createApp(opts.config);

  const server = serve({
    fetch: app.fetch,
    port,
    hostname: "127.0.0.1",
  });

  injectWebSocket(server);
  sessionBridge.start();

  const url = `http://127.0.0.1:${port}`;
  console.log(`\n🌐 AUQ Web UI running at ${url}\n`);

  if (openBrowser) {
    const { default: openPkg } = await import("open");
    await openPkg(url);
  }

  return new Promise((resolve) => {
    function shutdown(signal: string) {
      console.log(`\n${signal} received. Shutting down web server...`);
      sessionBridge.stop();

      for (const client of clients) {
        client.close(1001, "Server shutting down");
      }
      clients.clear();

      server.close((err) => {
        if (err) {
          console.error("[web-server] Close error:", err);
        }
        resolve();
        process.exit(err ? 1 : 0);
      });

      setTimeout(() => {
        console.error("[web-server] Forced exit after timeout");
        resolve();
        process.exit(1);
      }, 10000);
    }

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  });
}
