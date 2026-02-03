/**
 * Tests for notification batching
 */

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from "vitest";
import { createNotificationBatcher } from "../batch.js";
import type { NotificationConfig } from "../types.js";

describe("Notification Batching", () => {
  let stdoutWriteSpy: MockInstance;

  beforeEach(() => {
    vi.useFakeTimers();
    stdoutWriteSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
  });

  afterEach(() => {
    vi.useRealTimers();
    stdoutWriteSpy.mockRestore();
  });

  const enabledConfig: NotificationConfig = { enabled: true, sound: true };
  const disabledConfig: NotificationConfig = { enabled: false, sound: true };

  describe("createNotificationBatcher", () => {
    it("should create a batcher with queue, flush, cancel, and getPendingCount", () => {
      const batcher = createNotificationBatcher(enabledConfig);

      expect(batcher.queue).toBeDefined();
      expect(batcher.flush).toBeDefined();
      expect(batcher.cancel).toBeDefined();
      expect(batcher.getPendingCount).toBeDefined();
    });
  });

  describe("queue", () => {
    it("should queue notifications and send after batch window", () => {
      const batcher = createNotificationBatcher(enabledConfig, 500);

      batcher.queue("session-1");
      expect(batcher.getPendingCount()).toBe(1);

      // Advance timer but not past batch window
      vi.advanceTimersByTime(400);
      expect(stdoutWriteSpy).not.toHaveBeenCalled();

      // Advance past batch window
      vi.advanceTimersByTime(100);
      expect(stdoutWriteSpy).toHaveBeenCalled();
      expect(batcher.getPendingCount()).toBe(0);
    });

    it("should batch multiple rapid notifications into one", () => {
      const batcher = createNotificationBatcher(enabledConfig, 500);

      batcher.queue("session-1");
      vi.advanceTimersByTime(100);
      batcher.queue("session-2");
      vi.advanceTimersByTime(100);
      batcher.queue("session-3");

      expect(batcher.getPendingCount()).toBe(3);

      // Advance past batch window
      vi.advanceTimersByTime(500);

      // Should have sent one notification with count 3
      expect(stdoutWriteSpy).toHaveBeenCalledTimes(1);
      const call = stdoutWriteSpy.mock.calls[0][0] as string;
      expect(call).toContain("3 new question(s)");
    });

    it("should not queue when notifications are disabled", () => {
      const batcher = createNotificationBatcher(disabledConfig, 500);

      batcher.queue("session-1");
      expect(batcher.getPendingCount()).toBe(0);

      vi.advanceTimersByTime(600);
      expect(stdoutWriteSpy).not.toHaveBeenCalled();
    });

    it("should reset timer on each new queue", () => {
      const batcher = createNotificationBatcher(enabledConfig, 500);

      batcher.queue("session-1");
      vi.advanceTimersByTime(400);

      // Queue another, which should reset the timer
      batcher.queue("session-2");
      vi.advanceTimersByTime(400);

      // Still not sent
      expect(stdoutWriteSpy).not.toHaveBeenCalled();

      // Now advance past new batch window
      vi.advanceTimersByTime(100);
      expect(stdoutWriteSpy).toHaveBeenCalled();
    });
  });

  describe("flush", () => {
    it("should immediately send pending notifications", () => {
      const batcher = createNotificationBatcher(enabledConfig, 500);

      batcher.queue("session-1");
      batcher.queue("session-2");

      const result = batcher.flush();

      expect(result).not.toBeNull();
      expect(result?.sent).toBe(true);
      expect(stdoutWriteSpy).toHaveBeenCalled();
      expect(batcher.getPendingCount()).toBe(0);
    });

    it("should return null if no pending notifications", () => {
      const batcher = createNotificationBatcher(enabledConfig, 500);

      const result = batcher.flush();
      expect(result).toBeNull();
    });

    it("should cancel the pending timer", () => {
      const batcher = createNotificationBatcher(enabledConfig, 500);

      batcher.queue("session-1");
      batcher.flush();

      // Advance past batch window - should not trigger another send
      vi.advanceTimersByTime(600);
      expect(stdoutWriteSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("cancel", () => {
    it("should cancel all pending notifications", () => {
      const batcher = createNotificationBatcher(enabledConfig, 500);

      batcher.queue("session-1");
      batcher.queue("session-2");
      expect(batcher.getPendingCount()).toBe(2);

      batcher.cancel();

      expect(batcher.getPendingCount()).toBe(0);
      vi.advanceTimersByTime(600);
      expect(stdoutWriteSpy).not.toHaveBeenCalled();
    });
  });

  describe("getPendingCount", () => {
    it("should return accurate count of pending events", () => {
      const batcher = createNotificationBatcher(enabledConfig, 500);

      expect(batcher.getPendingCount()).toBe(0);

      batcher.queue("session-1");
      expect(batcher.getPendingCount()).toBe(1);

      batcher.queue("session-2");
      expect(batcher.getPendingCount()).toBe(2);

      batcher.flush();
      expect(batcher.getPendingCount()).toBe(0);
    });
  });
});
