/**
 * Tests for OSC escape sequence generators (progress bar only)
 *
 * Note: OSC notification tests (OSC 9/99/777) have been removed as notifications
 * now use native OS notifications via node-notifier. This file tests only the
 * progress bar functionality which still uses OSC sequences.
 */

import { describe, expect, it } from "vitest";
import { generateProgressBar } from "../osc.js";

describe("OSC Escape Sequence Generators", () => {
  describe("generateProgressBar", () => {
    it("should generate remove progress sequence (state 0)", () => {
      const result = generateProgressBar({ state: 0 });
      expect(result).toBe("\x1b]9;4;0\x07");
    });

    it("should generate set progress sequence with percent (state 1)", () => {
      const result = generateProgressBar({ state: 1, percent: 50 });
      expect(result).toBe("\x1b]9;4;1;50\x07");
    });

    it("should clamp percent to 0-100", () => {
      expect(generateProgressBar({ state: 1, percent: -10 })).toBe(
        "\x1b]9;4;1;0\x07",
      );
      expect(generateProgressBar({ state: 1, percent: 150 })).toBe(
        "\x1b]9;4;1;100\x07",
      );
    });

    it("should round percent to integer", () => {
      const result = generateProgressBar({ state: 1, percent: 33.7 });
      expect(result).toBe("\x1b]9;4;1;34\x07");
    });

    it("should generate indeterminate progress sequence (state 2)", () => {
      const result = generateProgressBar({ state: 2 });
      expect(result).toBe("\x1b]9;4;2\x07");
    });

    it("should generate completed progress sequence (state 3)", () => {
      const result = generateProgressBar({ state: 3 });
      expect(result).toBe("\x1b]9;4;3\x07");
    });

    it("should ignore percent for non-state-1 states", () => {
      const result = generateProgressBar({ state: 0, percent: 50 });
      expect(result).toBe("\x1b]9;4;0\x07");
    });
  });
});
