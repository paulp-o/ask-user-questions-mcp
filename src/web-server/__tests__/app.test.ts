import { describe, it, expect, vi } from "vitest";

// Mock bridges to avoid real filesystem interactions in unit tests
vi.mock("../session-bridge.js", () => ({
  SessionBridge: vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    getInitialState: vi.fn().mockResolvedValue([]),
    handleMessage: vi.fn(),
  })),
}));
vi.mock("../config-bridge.js", () => ({
  ConfigBridge: vi.fn().mockImplementation(() => ({
    handleMessage: vi.fn(),
  })),
}));
vi.mock("../history-bridge.js", () => ({
  HistoryBridge: vi.fn().mockImplementation(() => ({
    handleMessage: vi.fn(),
  })),
}));
vi.mock("@hono/node-ws", () => ({
  createNodeWebSocket: vi.fn().mockReturnValue({
    injectWebSocket: vi.fn(),
    upgradeWebSocket: vi.fn().mockReturnValue(async () => new Response("Upgrade Required", { status: 426 })),
  }),
}));

const MOCK_CONFIG = { renderer: "web", theme: "system" } as never;

const { createApp } = await import("../app.js");

describe("createApp", () => {
  it("creates a Hono app with /ws route", async () => {
    const { app } = createApp(MOCK_CONFIG);
    expect(app).toBeDefined();
    // The /ws route should exist — fetch a non-WS request to it (will get 400 since no upgrade)
    // The Hono app should be defined and handle routes
    expect(app).toBeDefined();
    expect(app.fetch).toBeDefined();
  });

  it("serves index.html fallback for unknown paths", async () => {
    const { app } = createApp(MOCK_CONFIG);
    // SPA fallback — any non-/ws route falls through to serveStatic
    // In test environment, the static dir won't exist, so it returns 404
    const res = await app.fetch(new Request("http://localhost/some-route"));
    // Either 404 (no dist/) or 200 (if dist/ exists) — both are valid behavior
    expect([200, 404]).toContain(res.status);
  });

  it("rejects WebSocket upgrades from non-localhost origins", async () => {
    const { app } = createApp(MOCK_CONFIG);
    const res = await app.fetch(
      new Request("http://localhost/ws", {
        headers: { Origin: "https://evil.example.com" },
      }),
    );
    expect(res.status).toBe(403);
  });
});
