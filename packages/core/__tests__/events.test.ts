import { describe, expect, it, vi } from "vitest";

import { createSessionEventEmitter } from "../src/session/events.js";

describe("session events", () => {
  it("creates an event emitter instance", () => {
    const emitter = createSessionEventEmitter();

    expect(emitter).toBeDefined();
    expect(typeof emitter.on).toBe("function");
    expect(typeof emitter.emit).toBe("function");
    expect(typeof emitter.removeListener).toBe("function");
  });

  it("fires typed lifecycle events", () => {
    const emitter = createSessionEventEmitter();
    const sessionPayload = { id: "session-1", status: "pending" };

    const onCreated = vi.fn();
    const onAnswered = vi.fn();
    const onRejected = vi.fn();
    const onTimeout = vi.fn();

    emitter.on("session:created", onCreated);
    emitter.on("session:answered", onAnswered);
    emitter.on("session:rejected", onRejected);
    emitter.on("session:timeout", onTimeout);

    emitter.emit("session:created", sessionPayload);
    emitter.emit("session:answered", sessionPayload);
    emitter.emit("session:rejected", sessionPayload);
    emitter.emit("session:timeout", "session-1");

    expect(onCreated).toHaveBeenCalledTimes(1);
    expect(onAnswered).toHaveBeenCalledTimes(1);
    expect(onRejected).toHaveBeenCalledTimes(1);
    expect(onTimeout).toHaveBeenCalledTimes(1);
    expect(onCreated).toHaveBeenCalledWith(sessionPayload);
    expect(onAnswered).toHaveBeenCalledWith(sessionPayload);
    expect(onRejected).toHaveBeenCalledWith(sessionPayload);
    expect(onTimeout).toHaveBeenCalledWith("session-1");
  });

  it("passes payloads to listeners", () => {
    const emitter = createSessionEventEmitter();
    const onCreated = vi.fn();
    const onTimeout = vi.fn();

    emitter.on("session:created", onCreated);
    emitter.on("session:timeout", onTimeout);

    emitter.emit("session:created", { id: "session-typed" });
    emitter.emit("session:timeout", "session-typed");

    expect(onCreated).toHaveBeenCalledWith({ id: "session-typed" });
    expect(onTimeout).toHaveBeenCalledWith("session-typed");
  });

  it("supports multiple listeners for the same event", () => {
    const emitter = createSessionEventEmitter();
    const sessionPayload = { id: "session-2", status: "completed" };

    const firstListener = vi.fn();
    const secondListener = vi.fn();

    emitter.on("session:answered", firstListener);
    emitter.on("session:answered", secondListener);

    emitter.emit("session:answered", sessionPayload);

    expect(firstListener).toHaveBeenCalledTimes(1);
    expect(secondListener).toHaveBeenCalledTimes(1);
    expect(firstListener).toHaveBeenCalledWith(sessionPayload);
    expect(secondListener).toHaveBeenCalledWith(sessionPayload);
  });

  it("removes listener with removeListener", () => {
    const emitter = createSessionEventEmitter();
    const listener = vi.fn();

    emitter.on("session:timeout", listener);
    emitter.removeListener("session:timeout", listener);
    emitter.emit("session:timeout", "session-3");

    expect(listener).not.toHaveBeenCalled();
  });
});