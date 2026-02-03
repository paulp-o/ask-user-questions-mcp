/**
 * Tests for OSC escape sequence generators
 */

import { describe, expect, it } from "vitest";
import {
  generateOSC9Notification,
  generateOSC99Notification,
  generateOSC777Notification,
  generateProgressBar,
} from "../osc.js";

describe("OSC Escape Sequence Generators", () => {
  describe("generateOSC9Notification", () => {
    it("should generate correct OSC 9 sequence", () => {
      const result = generateOSC9Notification("Hello World");
      expect(result).toBe("\x1b]9;Hello World\x07");
    });

    it("should handle empty message", () => {
      const result = generateOSC9Notification("");
      expect(result).toBe("\x1b]9;\x07");
    });

    it("should handle special characters", () => {
      const result = generateOSC9Notification("Test: 1/2 questions");
      expect(result).toBe("\x1b]9;Test: 1/2 questions\x07");
    });
  });

  describe("generateOSC99Notification", () => {
    it("should generate correct OSC 99 sequence with defaults", () => {
      const result = generateOSC99Notification({ message: "Hello" });
      // Message "Hello" -> Base64 "SGVsbG8="
      expect(result).toContain("\x1b]99;");
      expect(result).toContain("f=auq");
      expect(result).toContain("t=im");
      expect(result).toContain("d=0");
      expect(result).toContain("s=dialog-information");
      expect(result).toContain("p=body;");
      expect(result).toContain(btoa("Hello"));
      expect(result.endsWith("\x07")).toBe(true);
    });

    it("should omit sound parameter when sound is false", () => {
      const result = generateOSC99Notification({
        message: "Test",
        sound: false,
      });
      expect(result).not.toContain("s=dialog-information");
    });

    it("should use custom app name", () => {
      const result = generateOSC99Notification({
        message: "Test",
        appName: "myapp",
      });
      expect(result).toContain("f=myapp");
    });

    it("should use custom notification type", () => {
      const result = generateOSC99Notification({
        message: "Test",
        notificationType: "alert",
      });
      expect(result).toContain("t=alert");
    });
  });

  describe("generateOSC777Notification", () => {
    it("should generate correct OSC 777 sequence", () => {
      const result = generateOSC777Notification("AUQ", "New question");
      expect(result).toBe("\x1b]777;notify;AUQ;New question\x07");
    });

    it("should handle empty title", () => {
      const result = generateOSC777Notification("", "Message only");
      expect(result).toBe("\x1b]777;notify;;Message only\x07");
    });

    it("should handle special characters in body", () => {
      const result = generateOSC777Notification("App", "Question 1/5: How?");
      expect(result).toBe("\x1b]777;notify;App;Question 1/5: How?\x07");
    });
  });

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
