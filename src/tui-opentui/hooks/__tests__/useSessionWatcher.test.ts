/**
 * Tests for session switching utilities used by useSessionWatcher.
 * The hook itself requires a React renderer, so we test its
 * underlying pure utility functions directly.
 */
import { test, expect, describe } from "bun:test";
import {
  getNextSessionIndex,
  getPrevSessionIndex,
  getDirectJumpIndex,
  getAdjustedIndexAfterRemoval,
} from "../../../tui/shared/utils/sessionSwitching.js";
import type { SessionData } from "../useSessionWatcher.js";
import { makeSessionRequest } from "../../__tests__/fixtures.js";

// ─── getNextSessionIndex ─────────────────────────────────────────────────────
describe("getNextSessionIndex", () => {
  test("returns same index when queue has 1 item", () => {
    expect(getNextSessionIndex(0, 1)).toBe(0);
  });

  test("returns same index when queue has 0 items", () => {
    expect(getNextSessionIndex(0, 0)).toBe(0);
  });

  test("advances to next index normally", () => {
    expect(getNextSessionIndex(0, 3)).toBe(1);
    expect(getNextSessionIndex(1, 3)).toBe(2);
  });

  test("wraps from last to first index", () => {
    expect(getNextSessionIndex(2, 3)).toBe(0);
    expect(getNextSessionIndex(9, 10)).toBe(0);
  });

  test("wraps with 2 sessions", () => {
    expect(getNextSessionIndex(0, 2)).toBe(1);
    expect(getNextSessionIndex(1, 2)).toBe(0);
  });
});

// ─── getPrevSessionIndex ─────────────────────────────────────────────────────
describe("getPrevSessionIndex", () => {
  test("returns same index when queue has 1 item", () => {
    expect(getPrevSessionIndex(0, 1)).toBe(0);
  });

  test("returns same index when queue has 0 items", () => {
    expect(getPrevSessionIndex(0, 0)).toBe(0);
  });

  test("goes to previous index normally", () => {
    expect(getPrevSessionIndex(2, 3)).toBe(1);
    expect(getPrevSessionIndex(1, 3)).toBe(0);
  });

  test("wraps from first to last index", () => {
    expect(getPrevSessionIndex(0, 3)).toBe(2);
    expect(getPrevSessionIndex(0, 10)).toBe(9);
  });

  test("wraps with 2 sessions", () => {
    expect(getPrevSessionIndex(1, 2)).toBe(0);
    expect(getPrevSessionIndex(0, 2)).toBe(1);
  });
});

// ─── getDirectJumpIndex ──────────────────────────────────────────────────────
describe("getDirectJumpIndex", () => {
  test("returns null for key 0 (out of 1-9 range)", () => {
    expect(getDirectJumpIndex(0, 0, 5)).toBeNull();
  });

  test("returns null for key 10 (out of 1-9 range)", () => {
    expect(getDirectJumpIndex(10, 0, 5)).toBeNull();
  });

  test("returns null when target index equals current index", () => {
    // key=1 => targetIndex=0, currentIndex=0 => same => null
    expect(getDirectJumpIndex(1, 0, 5)).toBeNull();
    // key=3 => targetIndex=2, currentIndex=2 => same => null
    expect(getDirectJumpIndex(3, 2, 5)).toBeNull();
  });

  test("returns null when target index is out of queue range", () => {
    // key=5 => targetIndex=4, queueLength=3 => out of range
    expect(getDirectJumpIndex(5, 0, 3)).toBeNull();
  });

  test("returns correct 0-based index for a valid jump", () => {
    // key=2 => targetIndex=1, currentIndex=0, queueLength=3 => valid
    expect(getDirectJumpIndex(2, 0, 3)).toBe(1);
    // key=1 => targetIndex=0, currentIndex=2, queueLength=3 => valid
    expect(getDirectJumpIndex(1, 2, 3)).toBe(0);
    // key=9 => targetIndex=8, currentIndex=0, queueLength=10 => valid
    expect(getDirectJumpIndex(9, 0, 10)).toBe(8);
  });

  test("returns 0-based index (not 1-based)", () => {
    // key=3 => targetIndex=2 (0-based)
    expect(getDirectJumpIndex(3, 0, 5)).toBe(2);
  });
});

// ─── getAdjustedIndexAfterRemoval ────────────────────────────────────────────
describe("getAdjustedIndexAfterRemoval", () => {
  test("returns 0 when queue becomes empty", () => {
    expect(getAdjustedIndexAfterRemoval(0, 0, 0)).toBe(0);
  });

  test("decrements active index when removed before active", () => {
    // queue was [A, B, C] with active=2 (C), remove index=0 (A)
    // => new queue [B, C], active should be 1
    expect(getAdjustedIndexAfterRemoval(0, 2, 2)).toBe(1);
  });

  test("keeps active index when removed after active", () => {
    // queue was [A, B, C] with active=0 (A), remove index=2 (C)
    // => new queue [A, B], active stays 0
    expect(getAdjustedIndexAfterRemoval(2, 0, 2)).toBe(0);
  });

  test("shifts to next when removed at active (not last item)", () => {
    // queue was [A, B, C] with active=1 (B), remove index=1 (B)
    // => new queue [A, C], removedIndex=1 < newQueueLength=2 => stays at 1
    expect(getAdjustedIndexAfterRemoval(1, 1, 2)).toBe(1);
  });

  test("moves to last when removed at active (was last item)", () => {
    // queue was [A, B, C] with active=2 (C), remove index=2 (C)
    // => new queue [A, B], removedIndex=2 >= newQueueLength=2 => newQueueLength-1=1
    expect(getAdjustedIndexAfterRemoval(2, 2, 2)).toBe(1);
  });

  test("handles removal at index 0 from 2-item queue when active=1", () => {
    // queue was [A, B] with active=1 (B), remove index=0 (A)
    // => new queue [B], removedIndex=0 < active=1 => active-1=0
    expect(getAdjustedIndexAfterRemoval(0, 1, 1)).toBe(0);
  });
});

// ─── SessionData type shape ───────────────────────────────────────────────────
describe("SessionData shape", () => {
  test("makeSessionRequest produces valid session request for SessionData", () => {
    const request = makeSessionRequest();
    // Validate that it can serve as SessionData.sessionRequest
    const data: SessionData = {
      sessionId: request.sessionId,
      sessionPath: "/tmp/test-session",
      sessionRequest: request,
      timestamp: Date.now(),
    };
    expect(data.sessionId).toBe("test-session-1");
    expect(data.sessionRequest.questions).toHaveLength(1);
    expect(data.timestamp).toBeGreaterThan(0);
  });

  test("SessionData allows optional status and createdAt fields", () => {
    const request = makeSessionRequest();
    const data: SessionData = {
      sessionId: request.sessionId,
      sessionPath: "/tmp/session",
      sessionRequest: request,
      timestamp: 1234567890,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    expect(data.status).toBe("pending");
    expect(typeof data.createdAt).toBe("string");
  });
});