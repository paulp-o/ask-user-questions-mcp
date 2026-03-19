/**
 * Tests for native OS notification wrapper
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NotificationConfig } from "../types.js";

// Mock util.promisify - must be hoisted (no external variables)
vi.mock("util", () => ({
  promisify: () => {
    return async () => ({ stdout: "", stderr: "" });
  },
}));

// Mock node-notifier for Windows/Linux
vi.mock("node-notifier", () => ({
  default: {
    notify: vi.fn((options, callback) => {
      if (callback) callback(null);
    }),
  },
}));

// Import after mocks are set up
import {
  sendNativeNotification,
  checkLinuxDependencies,
  isNativeNotificationSupported,
  getNativeNotificationSupportDescription,
} from "../native.js";

describe("Native Notifications", () => {
  const enabledConfig: NotificationConfig = { enabled: true, sound: true };
  const disabledConfig: NotificationConfig = { enabled: false, sound: true };
  const noSoundConfig: NotificationConfig = { enabled: true, sound: false };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("sendNativeNotification", () => {
    it("should send notification when enabled", async () => {
      const result = await sendNativeNotification(
        "AUQ",
        "Test message",
        enabledConfig,
      );

      // On all platforms, should return sent: true when successful
      expect(result.sent).toBe(true);
    });

    it("should not send notification when disabled", async () => {
      const result = await sendNativeNotification(
        "AUQ",
        "Test",
        disabledConfig,
      );

      expect(result.sent).toBe(false);
      // On all platforms, should not attempt to send when disabled
    });

    it("should return sent: true on successful notification", async () => {
      const result = await sendNativeNotification("AUQ", "Test", enabledConfig);
      expect(result.sent).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should handle enabled config with sound", async () => {
      const result = await sendNativeNotification("AUQ", "Test", enabledConfig);
      expect(result.sent).toBe(true);
    });

    it("should handle enabled config without sound", async () => {
      const result = await sendNativeNotification("AUQ", "Test", noSoundConfig);
      expect(result.sent).toBe(true);
    });
  });

  describe("checkLinuxDependencies", () => {
    const originalPlatform = process.platform;

    afterEach(() => {
      Object.defineProperty(process, "platform", { value: originalPlatform });
    });

    it("should do nothing on non-Linux platforms", async () => {
      Object.defineProperty(process, "platform", { value: "darwin" });

      // Should complete without error
      await expect(checkLinuxDependencies()).resolves.toBeUndefined();
    });

    it("should check for notify-send on Linux", async () => {
      Object.defineProperty(process, "platform", { value: "linux" });

      // Should complete without error when notify-send exists (mocked)
      await expect(checkLinuxDependencies()).resolves.toBeUndefined();
    });
  });

  describe("isNativeNotificationSupported", () => {
    const originalPlatform = process.platform;

    afterEach(() => {
      Object.defineProperty(process, "platform", { value: originalPlatform });
    });

    it("should return true for macOS", () => {
      Object.defineProperty(process, "platform", { value: "darwin" });
      expect(isNativeNotificationSupported()).toBe(true);
    });

    it("should return true for Windows", () => {
      Object.defineProperty(process, "platform", { value: "win32" });
      expect(isNativeNotificationSupported()).toBe(true);
    });

    it("should return true for Linux", () => {
      Object.defineProperty(process, "platform", { value: "linux" });
      expect(isNativeNotificationSupported()).toBe(true);
    });

    it("should return false for unsupported platforms", () => {
      Object.defineProperty(process, "platform", { value: "freebsd" });
      expect(isNativeNotificationSupported()).toBe(false);
    });
  });

  describe("getNativeNotificationSupportDescription", () => {
    const originalPlatform = process.platform;

    afterEach(() => {
      Object.defineProperty(process, "platform", { value: originalPlatform });
    });

    it("should return macOS description", () => {
      Object.defineProperty(process, "platform", { value: "darwin" });
      expect(getNativeNotificationSupportDescription()).toContain("macOS");
    });

    it("should return Windows description", () => {
      Object.defineProperty(process, "platform", { value: "win32" });
      expect(getNativeNotificationSupportDescription()).toContain("Windows");
    });

    it("should return Linux description", () => {
      Object.defineProperty(process, "platform", { value: "linux" });
      expect(getNativeNotificationSupportDescription()).toContain("Linux");
    });
  });
});
