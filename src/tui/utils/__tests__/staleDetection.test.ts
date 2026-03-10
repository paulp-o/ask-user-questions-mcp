import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_GRACE_PERIOD,
  formatStaleToastMessage,
  isSessionAbandoned,
  isSessionStale,
} from "../staleDetection.js";

describe("staleDetection", () => {
  const now = new Date("2026-01-01T12:00:00.000Z");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("isSessionStale", () => {
    const TWO_HOURS = 7200000; // default staleThreshold from config

    it("should return true when session is older than threshold", () => {
      // Session created 3 hours ago, threshold is 2 hours
      const threeHoursAgo = now.getTime() - 3 * 3600000;
      expect(isSessionStale(threeHoursAgo, TWO_HOURS)).toBe(true);
    });

    it("should return false when session is younger than threshold", () => {
      // Session created 1 hour ago, threshold is 2 hours
      const oneHourAgo = now.getTime() - 1 * 3600000;
      expect(isSessionStale(oneHourAgo, TWO_HOURS)).toBe(false);
    });

    it("should return false when session is exactly at threshold", () => {
      // Edge case: exactly at threshold boundary (not greater than)
      const exactlyAtThreshold = now.getTime() - TWO_HOURS;
      expect(isSessionStale(exactlyAtThreshold, TWO_HOURS)).toBe(false);
    });

    it("should return false when stale session has recent interaction within grace period", () => {
      // Session created 3 hours ago (stale), but user interacted 10 minutes ago
      const threeHoursAgo = now.getTime() - 3 * 3600000;
      const tenMinutesAgo = now.getTime() - 10 * 60000;
      expect(isSessionStale(threeHoursAgo, TWO_HOURS, tenMinutesAgo)).toBe(
        false,
      );
    });

    it("should return true when stale session has old interaction outside grace period", () => {
      // Session created 3 hours ago, last interaction 45 minutes ago (outside 30min grace)
      const threeHoursAgo = now.getTime() - 3 * 3600000;
      const fortyFiveMinutesAgo = now.getTime() - 45 * 60000;
      expect(
        isSessionStale(threeHoursAgo, TWO_HOURS, fortyFiveMinutesAgo),
      ).toBe(true);
    });

    it("should respect custom grace period", () => {
      // Session created 3 hours ago, last interaction 45 minutes ago
      // With a 1-hour custom grace period, should NOT be stale
      const threeHoursAgo = now.getTime() - 3 * 3600000;
      const fortyFiveMinutesAgo = now.getTime() - 45 * 60000;
      const oneHourGrace = 3600000;
      expect(
        isSessionStale(
          threeHoursAgo,
          TWO_HOURS,
          fortyFiveMinutesAgo,
          oneHourGrace,
        ),
      ).toBe(false);
    });

    it("should use DEFAULT_GRACE_PERIOD when no grace period provided", () => {
      // Interaction 29 minutes ago (within default 30-minute grace)
      const threeHoursAgo = now.getTime() - 3 * 3600000;
      const twentyNineMinutesAgo = now.getTime() - 29 * 60000;
      expect(isSessionStale(threeHoursAgo, TWO_HOURS, twentyNineMinutesAgo)).toBe(
        false,
      );

      // Interaction 31 minutes ago (outside default 30-minute grace)
      const thirtyOneMinutesAgo = now.getTime() - 31 * 60000;
      expect(isSessionStale(threeHoursAgo, TWO_HOURS, thirtyOneMinutesAgo)).toBe(
        true,
      );
    });

    it("should handle undefined lastInteraction", () => {
      const threeHoursAgo = now.getTime() - 3 * 3600000;
      // No interaction => stale if age exceeds threshold
      expect(isSessionStale(threeHoursAgo, TWO_HOURS, undefined)).toBe(true);
    });

    it("should handle zero threshold (always stale if age > 0)", () => {
      const oneSecondAgo = now.getTime() - 1000;
      expect(isSessionStale(oneSecondAgo, 0)).toBe(true);
    });
  });

  describe("isSessionAbandoned", () => {
    it("should return true for 'abandoned' status", () => {
      expect(isSessionAbandoned("abandoned")).toBe(true);
    });

    it("should return false for 'pending' status", () => {
      expect(isSessionAbandoned("pending")).toBe(false);
    });

    it("should return false for 'completed' status", () => {
      expect(isSessionAbandoned("completed")).toBe(false);
    });

    it("should return false for 'in-progress' status", () => {
      expect(isSessionAbandoned("in-progress")).toBe(false);
    });

    it("should return false for 'rejected' status", () => {
      expect(isSessionAbandoned("rejected")).toBe(false);
    });

    it("should return false for 'timed_out' status", () => {
      expect(isSessionAbandoned("timed_out")).toBe(false);
    });

    it("should return false for empty string", () => {
      expect(isSessionAbandoned("")).toBe(false);
    });
  });

  describe("formatStaleToastMessage", () => {
    it("should format hours correctly for a 3-hour-old session", () => {
      const threeHoursAgo = now.getTime() - 3 * 3600000;
      const message = formatStaleToastMessage("Test Session", threeHoursAgo);
      expect(message).toBe(
        'Session "Test Session" may be orphaned (created 3h ago)',
      );
    });

    it("should show 0h for very recent sessions", () => {
      const thirtyMinutesAgo = now.getTime() - 30 * 60000;
      const message = formatStaleToastMessage("New Session", thirtyMinutesAgo);
      expect(message).toBe(
        'Session "New Session" may be orphaned (created 0h ago)',
      );
    });

    it("should show large hour counts for old sessions", () => {
      const twoDaysAgo = now.getTime() - 48 * 3600000;
      const message = formatStaleToastMessage("Old Session", twoDaysAgo);
      expect(message).toBe(
        'Session "Old Session" may be orphaned (created 48h ago)',
      );
    });

    it("should handle session title with special characters", () => {
      const twoHoursAgo = now.getTime() - 2 * 3600000;
      const message = formatStaleToastMessage("Session \"quoted\"", twoHoursAgo);
      expect(message).toBe(
        'Session "Session "quoted"" may be orphaned (created 2h ago)',
      );
    });
  });

  describe("DEFAULT_GRACE_PERIOD", () => {
    it("should be 30 minutes in milliseconds", () => {
      expect(DEFAULT_GRACE_PERIOD).toBe(1800000);
    });
  });
});