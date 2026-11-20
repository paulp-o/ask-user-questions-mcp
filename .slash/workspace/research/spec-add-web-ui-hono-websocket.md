# Research: Hono HTTP Framework with WebSocket Support

**Date**: 2026-03-28

## Summary

This document provides concrete, copy-paste-ready TypeScript code examples for setting up a Hono HTTP server with WebSocket support using `@hono/node-server` and `@hono/node-ws`. The project uses Bun as the runtime but requires `@hono/node-server` for Node.js compatibility.

---

## 1. Setting Up Hono App with node-server and WebSocket Support

### Install Dependencies

```bash
bun add hono @hono/node-server @hono/node-ws get-port
```

### Basic Server Setup with WebSocket

```typescript
// src/index.ts
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { createNodeWebSocket } from "@hono/node-ws";

const app = new Hono();

// Initialize WebSocket helper with the app
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

// Define WebSocket endpoint
app.get(
  "/ws",
  upgradeWebSocket((c) => {
    return {
      onMessage(event, ws) {
        console.log(`Message from client: ${event.data}`);
        ws.send(`Server received: ${event.data}`);
      },
      onClose: () => {
        console.log("Connection closed");
      },
      onError: (event) => {
        console.error("WebSocket error:", event);
      },
    };
  }),
);

// Regular HTTP routes
app.get("/", (c) => c.text("Hello Hono!"));
app.get("/api/health", (c) => c.json({ status: "ok" }));

// Start server
const server = serve(app);

// Inject WebSocket handling into the HTTP server
injectWebSocket(server);

console.log(`Server is running on http://localhost:${server.port}`);

export default app;
```

**Evidence** ([Hono node-ws README](https://github.com/honojs/middleware/tree/main/packages/node-ws)):

```typescript
import { createNodeWebSocket } from '@hono/node-ws'
import { Hono } from 'hono'
import { serve } from '@hono/node-server'

const app = new Hono()
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app })

app.get('/ws', upgradeWebSocket((c) => ({ ... })))

const server = serve(app)
injectWebSocket(server)
```

---

## 2. Serving Static Files with SPA Fallback

### Directory Structure

```
.
├── src/
│   └── index.ts
└── static/
    ├── index.html
    ├── styles.css
    └── js/
        └── app.js
```

### Static File Server with SPA Fallback

```typescript
// src/index.ts
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { createNodeWebSocket } from "@hono/node-ws";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATIC_ROOT = join(__dirname, "../static");

const app = new Hono();

// Initialize WebSocket
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

// WebSocket route
app.get(
  "/ws",
  upgradeWebSocket((c) => {
    return {
      onMessage(event, ws) {
        ws.send(`Echo: ${event.data}`);
      },
    };
  }),
);

// Static files - serve from /static/* path
app.use("/static/*", serveStatic({ root: STATIC_ROOT }));

// API routes (example)
app.get("/api/hello", (c) => c.json({ message: "Hello API!" }));

// SPA Fallback: serve index.html for all non-file routes
// This must be the LAST route
app.get("*", async (c) => {
  const indexPath = join(STATIC_ROOT, "index.html");
  return serveStatic({ root: STATIC_ROOT, path: "index.html" })(c);
});

// Start server
const server = serve({
  fetch: app.fetch,
  port: 3000,
});

injectWebSocket(server);

console.log(`Server running at http://localhost:${server.port}`);

export default app;
```

**Evidence** ([Hono Node.js Docs](https://hono.dev/docs/getting-started/nodejs)):

```typescript
import { serveStatic } from "@hono/node-server/serve-static";

// Serve static files from ./static directory
app.use("/static/*", serveStatic({ root: "./" }));

// Serve favicon
app.use("/favicon.ico", serveStatic({ path: "./favicon.ico" }));

// Catch-all for SPA (serves from root)
app.use("*", serveStatic({ root: "./static" }));
```

**Note on path resolution**: The `root` option resolves relative to `process.cwd()`. For reliable paths, use `import.meta.url` as shown above.

---

## 3. WebSocket Upgrade Handling - Broadcast to All Clients

### Managing Connected Clients

```typescript
// src/index.ts
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { createNodeWebSocket, type ServerWebSocket } from "@hono/node-ws";

const app = new Hono();

// Store connected WebSocket clients
const clients = new Set<ServerWebSocket>();

const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

app.get(
  "/ws",
  upgradeWebSocket((c) => {
    return {
      onOpen(event, ws) {
        clients.add(ws);
        console.log(`Client connected. Total: ${clients.size}`);
        // Broadcast to all clients
        broadcast(`User joined. Total: ${clients.size}`);
      },
      onMessage(event, ws) {
        console.log(`Received: ${event.data}`);
        // Broadcast message to all connected clients
        broadcast(`Message: ${event.data}`, ws);
      },
      onClose: () => {
        clients.delete(ws);
        console.log(`Client disconnected. Total: ${clients.size}`);
        broadcast(`User left. Total: ${clients.size}`);
      },
      onError: (event) => {
        console.error("WebSocket error:", event);
      },
    };
  }),
);

// Broadcast helper function
function broadcast(message: string, exclude?: ServerWebSocket) {
  const data = JSON.stringify({ message, timestamp: Date.now() });
  for (const client of clients) {
    if (client !== exclude && client.readyState === 1) {
      // 1 = OPEN
      client.send(data);
    }
  }
}

// Regular HTTP routes
app.get("/", (c) => c.text("Welcome!"));

// Start server
const server = serve(app);
injectWebSocket(server);

console.log(`Server running on http://localhost:${server.port}`);

export default app;
```

### TypeScript Types for WebSocket

The `ServerWebSocket` type is exported from `@hono/node-ws`:

```typescript
import type { ServerWebSocket } from "@hono/node-ws";

// Ready state constants:
// 0 = CONNECTING
// 1 = OPEN
// 2 = CLOSING
// 3 = CLOSED

if (ws.readyState === 1) {
  // OPEN
  ws.send("Hello client!");
}
```

**Evidence** ([Hono WebSocket Helper Docs](https://hono.dev/docs/helpers/websocket)):

```typescript
app.get(
  "/ws",
  upgradeWebSocket((c) => {
    return {
      onMessage(event, ws) {
        console.log(`Message from client: ${event.data}`);
        ws.send("Hello from server!");
      },
      onClose: () => {
        console.log("Connection closed");
      },
    };
  }),
);
```

---

## 4. Graceful Shutdown

### Complete Example with Graceful Shutdown

```typescript
// src/index.ts
import { Hono } from "hono";
import { serve, type Server } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { createNodeWebSocket, type ServerWebSocket } from "@hono/node-ws";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATIC_ROOT = join(__dirname, "../static");

const app = new Hono();
const clients = new Set<ServerWebSocket>();

const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

// WebSocket endpoint
app.get(
  "/ws",
  upgradeWebSocket((c) => {
    return {
      onOpen(_, ws) {
        clients.add(ws);
      },
      onMessage(event, ws) {
        const data = JSON.stringify({
          message: event.data,
          timestamp: Date.now(),
        });
        for (const client of clients) {
          if (client !== ws && client.readyState === 1) {
            client.send(data);
          }
        }
      },
      onClose() {
        clients.delete(ws);
      },
    };
  }),
);

// Static files
app.use("/static/*", serveStatic({ root: STATIC_ROOT }));

// SPA fallback
app.get("*", serveStatic({ root: STATIC_ROOT, path: "index.html" }));

// Start server
const server: Server = serve({
  fetch: app.fetch,
  port: 3000,
});

injectWebSocket(server);

console.log(`Server running on http://localhost:${server.port}`);

// Graceful shutdown handler
function shutdown(signal: string) {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  // Close all WebSocket connections
  for (const client of clients) {
    client.close(1001, "Server shutting down");
  }
  clients.clear();

  // Close HTTP server
  server.close((err) => {
    if (err) {
      console.error("Error during server close:", err);
      process.exit(1);
    }
    console.log("Server closed successfully");
    process.exit(0);
  });

  // Force exit after timeout
  setTimeout(() => {
    console.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

export default app;
```

**Evidence** ([Hono Node.js Docs - Graceful shutdown](https://hono.dev/docs/getting-started/nodejs)):

```typescript
const server = serve(app);

// graceful shutdown
process.on("SIGINT", () => {
  server.close();
  process.exit(0);
});
process.on("SIGTERM", () => {
  server.close((err) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    process.exit(0);
  });
});
```

---

## 5. Using get-port to Find Available Port

### Automatic Port Selection

```typescript
// src/index.ts
import { Hono } from "hono";
import { serve, type Server } from "@hono/node-server";
import { createNodeWebSocket } from "@hono/node-ws";
import getPort, { portNumbers } from "get-port";

async function startServer() {
  const app = new Hono();

  // Initialize WebSocket
  const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

  // WebSocket route
  app.get(
    "/ws",
    upgradeWebSocket((c) => ({
      onMessage(event, ws) {
        ws.send(`Echo: ${event.data}`);
      },
    })),
  );

  // Regular routes
  app.get("/", (c) => c.text("Hello!"));

  // Get available port
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await getPort({
    port: portNumbers(preferredPort, preferredPort + 100), // Try range 3000-3100
    host: "0.0.0.0",
  });

  console.log(`Preferred port ${preferredPort} not available, using ${port}`);

  // Start server
  const server: Server = serve({
    fetch: app.fetch,
    port,
  });

  injectWebSocket(server);

  console.log(`Server running on http://localhost:${server.port}`);

  return { server, app };
}

startServer().catch(console.error);
```

### get-port Options (TypeScript Types)

```typescript
import type { Options as GetPortOptions } from "get-port";

const options: GetPortOptions = {
  // Single port or array of preferred ports
  port: 3000,
  // or: port: [3000, 3001, 3002],
  // or: port: portNumbers(3000, 3100), // range

  // Host to check (default: 0.0.0.0)
  host: "0.0.0.0",

  // Exclude ports
  exclude: [3001, 8080],
};
```

**Evidence** ([get-port npm](https://www.npmjs.com/package/get-port)):

```typescript
import getPort from "get-port";

const port = await getPort({ port: 3000 });
// Returns 3000 if available, otherwise a random available port
```

---

## Complete Production-Ready Example

```typescript
// src/index.ts
import { Hono } from "hono";
import { serve, type Server } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { createNodeWebSocket, type ServerWebSocket } from "@hono/node-ws";
import getPort from "get-port";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATIC_ROOT = join(__dirname, "../static");

async function main() {
  const app = new Hono();
  const clients = new Set<ServerWebSocket>();

  // Initialize WebSocket helper
  const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

  // ========== WebSocket Routes ==========
  app.get(
    "/ws",
    upgradeWebSocket((c) => ({
      onOpen(_, ws) {
        clients.add(ws);
        broadcast({ type: "system", message: "User joined" });
      },
      onMessage(event, ws) {
        broadcast({ type: "message", data: event.data }, ws);
      },
      onClose() {
        clients.delete(ws);
        broadcast({ type: "system", message: "User left" });
      },
      onError(event) {
        console.error("WS Error:", event);
      },
    })),
  );

  // ========== HTTP Routes ==========
  app.get("/api/health", (c) =>
    c.json({ status: "ok", clients: clients.size }),
  );

  // ========== Static Files ==========
  // Serve /static/* files from static directory
  app.use("/static/*", serveStatic({ root: STATIC_ROOT }));

  // SPA Fallback - serve index.html for all non-API routes
  app.get("*", async (c) => {
    // Try to serve the requested file first
    const response = await serveStatic({ root: STATIC_ROOT })(c);
    // If file not found, serve index.html for SPA
    if (response.status === 404) {
      return serveStatic({ root: STATIC_ROOT, path: "index.html" })(c);
    }
    return response;
  });

  // ========== Server Startup ==========
  const port = await getPort({ port: 3000, host: "0.0.0.0" });

  const server: Server = serve({
    fetch: app.fetch,
    port,
  });

  injectWebSocket(server);

  console.log(`🚀 Server running at http://localhost:${server.port}`);
  console.log(`📁 Static files from: ${STATIC_ROOT}`);

  // ========== Graceful Shutdown ==========
  function shutdown(signal: string) {
    console.log(`\n${signal} received. Shutting down...`);

    // Close WebSocket connections
    for (const client of clients) {
      client.close(1001, "Server shutdown");
    }
    clients.clear();

    server.close((err) => {
      if (err) {
        console.error("Close error:", err);
        process.exit(1);
      }
      console.log("✅ Server closed");
      process.exit(0);
    });

    setTimeout(() => {
      console.error("Forced exit");
      process.exit(1);
    }, 10000);
  }

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch(console.error);

export default app;
```

---

## Key Packages Summary

| Package                          | Purpose             | Import                                                                  |
| -------------------------------- | ------------------- | ----------------------------------------------------------------------- |
| `hono`                           | Core framework      | `import { Hono } from 'hono'`                                           |
| `@hono/node-server`              | Node.js HTTP server | `import { serve } from '@hono/node-server'`                             |
| `@hono/node-server/serve-static` | Static file serving | `import { serveStatic } from '@hono/node-server/serve-static'`          |
| `@hono/node-ws`                  | WebSocket support   | `import { createNodeWebSocket, upgradeWebSocket } from '@hono/node-ws'` |
| `get-port`                       | Find available port | `import getPort from 'get-port'`                                        |

---

## References

- [Hono Official Docs](https://hono.dev)
- [Hono Node.js Getting Started](https://hono.dev/docs/getting-started/nodejs)
- [Hono WebSocket Helper](https://hono.dev/docs/helpers/websocket)
- [@hono/node-ws GitHub](https://github.com/honojs/middleware/tree/main/packages/node-ws)
- [get-port npm](https://www.npmjs.com/package/get-port)
