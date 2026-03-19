import { describe, expect, it, vi } from "vitest";

import { SseEmitter, createKeepalive } from "../../src/lib/sse-emitter";

const decode = (chunk: Uint8Array): string => new TextDecoder().decode(chunk);

describe("SseEmitter", () => {
  it("broadcasts to connected clients", () => {
    const emitter = new SseEmitter();
    const enqueue = vi.fn();

    emitter.addClient({ enqueue });
    emitter.broadcast("session-created", { sessionId: "s-1" });

    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(decode(enqueue.mock.calls[0][0])).toContain("event: session-created");
    expect(decode(enqueue.mock.calls[0][0])).toContain('"sessionId":"s-1"');
  });

  it("stops sending to removed clients", () => {
    const emitter = new SseEmitter();
    const enqueue = vi.fn();
    const client = { enqueue };

    emitter.addClient(client);
    emitter.removeClient(client);
    emitter.broadcast("session-answered", { sessionId: "s-2" });

    expect(enqueue).not.toHaveBeenCalled();
  });

  it("sends keepalive pings", () => {
    vi.useFakeTimers();
    const enqueue = vi.fn();

    const stop = createKeepalive({ enqueue }, 30000);
    vi.advanceTimersByTime(30000);

    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(decode(enqueue.mock.calls[0][0])).toBe(": ping\n\n");

    stop();
    vi.useRealTimers();
  });
});