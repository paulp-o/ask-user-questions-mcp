import { describe, it, expect, vi, beforeEach } from "vitest";
import type { WSContext } from "hono/ws";
import type { WebSocket } from "ws";

import { WS_TYPES } from "../ws-protocol.js";
import { ConfigBridge } from "../config-bridge.js";

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

describe("ConfigBridge", () => {
  let bridge: ConfigBridge;

  beforeEach(() => {
    const mockLoader = {
      getConfigPaths: vi.fn().mockReturnValue({
        local: "/tmp/test-local.auqrc.json",
        global: "/tmp/test-global.auqrc.json",
        localExists: false,
        globalExists: false,
      }),
      reloadConfig: vi.fn().mockReturnValue({
        maxOptions: 5,
        maxQuestions: 5,
        renderer: "opentui",
      }),
    };
    bridge = ConfigBridge.create(mockLoader.getConfigPaths, mockLoader.reloadConfig);
  });

  it("config:get returns config and paths", async () => {
    const ws = createMockWs();
    await bridge.handleMessage(ws, WS_TYPES.CONFIG_GET, undefined, "req1");
    expect(ws.sentMessages).toHaveLength(1);
    const msg = JSON.parse(ws.sentMessages[0]) as {
      type: string;
      requestId: string;
      payload: { config: unknown; paths: unknown };
    };
    expect(msg.type).toBe(WS_TYPES.CONFIG_GET_RESULT);
    expect(msg.requestId).toBe("req1");
    expect(msg.payload.config).toBeDefined();
    expect(msg.payload.paths).toBeDefined();
  });

  it("config:set validates with Zod and rejects invalid values", async () => {
    const ws = createMockWs();
    await bridge.handleMessage(ws, WS_TYPES.CONFIG_SET, {
      scope: "local",
      values: { renderer: "invalid-renderer" },
    });
    expect(ws.sentMessages).toHaveLength(1);
    const msg = JSON.parse(ws.sentMessages[0]) as {
      type: string;
      payload: { ok: boolean; error: string };
    };
    expect(msg.type).toBe(WS_TYPES.CONFIG_SET_RESULT);
    expect(msg.payload.ok).toBe(false);
    expect(msg.payload.error).toBeDefined();
  });

  it("config:export returns raw config object", async () => {
    const ws = createMockWs();
    await bridge.handleMessage(ws, WS_TYPES.CONFIG_EXPORT, { scope: "local" });
    expect(ws.sentMessages).toHaveLength(1);
    const msg = JSON.parse(ws.sentMessages[0]) as {
      type: string;
      payload: { raw: unknown };
    };
    expect(msg.type).toBe(WS_TYPES.CONFIG_EXPORT_RESULT);
    expect(msg.payload.raw).toBeDefined();
  });
});
