/**
 * Tests for terminal detection
 *
 * Note: With native OS notifications, all terminals now support notifications.
 * The protocol field is only relevant for progress bar support (osc9).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  detectTerminal,
  supportsProgressBar,
  supportsNotifications,
} from "../detect.js";

describe("Terminal Detection", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("detectTerminal", () => {
    it("should detect iTerm2 with progress bar support", () => {
      process.env.TERM_PROGRAM = "iTerm.app";
      const result = detectTerminal();

      expect(result.type).toBe("iterm");
      expect(result.protocol).toBe("osc9");
      expect(result.supportsNotifications).toBe(true);
      expect(result.supportsProgress).toBe(true);
    });

    it("should detect kitty without progress bar support", () => {
      process.env.TERM_PROGRAM = "kitty";
      const result = detectTerminal();

      expect(result.type).toBe("kitty");
      expect(result.protocol).toBe("none"); // No progress bar
      expect(result.supportsNotifications).toBe(true); // Native notifications work
      expect(result.supportsProgress).toBe(false);
    });

    it("should detect Ghostty with progress bar support", () => {
      process.env.TERM_PROGRAM = "ghostty";
      const result = detectTerminal();

      expect(result.type).toBe("ghostty");
      expect(result.protocol).toBe("osc9");
      expect(result.supportsNotifications).toBe(true);
      expect(result.supportsProgress).toBe(true);
    });

    it("should detect WezTerm via TERM_PROGRAM", () => {
      process.env.TERM_PROGRAM = "WezTerm";
      const result = detectTerminal();

      expect(result.type).toBe("wezterm");
      expect(result.protocol).toBe("osc9");
      expect(result.supportsNotifications).toBe(true);
      expect(result.supportsProgress).toBe(true);
    });

    it("should detect WezTerm via WEZTERM_PANE env var", () => {
      process.env.TERM_PROGRAM = undefined;
      process.env.WEZTERM_PANE = "123";
      const result = detectTerminal();

      expect(result.type).toBe("wezterm");
      expect(result.protocol).toBe("osc9");
    });

    it("should detect Alacritty via ALACRITTY_WINDOW_ID", () => {
      process.env.TERM_PROGRAM = undefined;
      process.env.ALACRITTY_WINDOW_ID = "12345";
      const result = detectTerminal();

      expect(result.type).toBe("alacritty");
      expect(result.protocol).toBe("none");
      expect(result.supportsNotifications).toBe(true); // Native notifications work
      expect(result.supportsProgress).toBe(false);
    });

    it("should detect Windows Terminal via WT_SESSION", () => {
      process.env.TERM_PROGRAM = undefined;
      process.env.WT_SESSION = "session-id";
      const result = detectTerminal();

      expect(result.type).toBe("windows-terminal");
      expect(result.protocol).toBe("osc9");
      expect(result.supportsNotifications).toBe(true);
      expect(result.supportsProgress).toBe(true);
    });

    it("should detect Apple Terminal without progress bar", () => {
      process.env.TERM_PROGRAM = "Apple_Terminal";
      const result = detectTerminal();

      expect(result.type).toBe("apple-terminal");
      expect(result.protocol).toBe("none");
      expect(result.supportsNotifications).toBe(true); // Native notifications work
      expect(result.supportsProgress).toBe(false);
    });

    it("should detect GNOME Terminal without progress bar", () => {
      process.env.TERM_PROGRAM = "gnome-terminal";
      const result = detectTerminal();

      expect(result.type).toBe("gnome-terminal");
      expect(result.protocol).toBe("none");
      expect(result.supportsNotifications).toBe(true); // Native notifications work
      expect(result.supportsProgress).toBe(false);
    });

    it("should detect rxvt/urxvt via TERM without progress bar", () => {
      process.env.TERM_PROGRAM = undefined;
      process.env.TERM = "rxvt-unicode-256color";
      const result = detectTerminal();

      expect(result.type).toBe("rxvt");
      expect(result.protocol).toBe("none"); // No progress bar
      expect(result.supportsNotifications).toBe(true);
      expect(result.supportsProgress).toBe(false);
    });

    it("should detect Hyper without progress bar", () => {
      process.env.TERM_PROGRAM = "Hyper";
      const result = detectTerminal();

      expect(result.type).toBe("hyper");
      expect(result.protocol).toBe("none"); // No progress bar
      expect(result.supportsNotifications).toBe(true);
    });

    it("should detect VS Code terminal without progress bar", () => {
      process.env.TERM_PROGRAM = "vscode";
      const result = detectTerminal();

      expect(result.type).toBe("vscode");
      expect(result.protocol).toBe("none"); // No progress bar
      expect(result.supportsNotifications).toBe(true);
    });

    it("should fall back to unknown for unrecognized terminals", () => {
      process.env.TERM_PROGRAM = "some-random-terminal";
      process.env.TERM = "xterm-256color";
      const result = detectTerminal();

      expect(result.type).toBe("unknown");
      expect(result.protocol).toBe("osc9");
      expect(result.supportsNotifications).toBe(true);
      expect(result.supportsProgress).toBe(true);
    });

    it("should include raw termProgram value", () => {
      process.env.TERM_PROGRAM = "iTerm.app";
      const result = detectTerminal();

      expect(result.termProgram).toBe("iTerm.app");
    });
  });

  describe("supportsProgressBar", () => {
    it("should return true for terminals with progress support", () => {
      process.env.TERM_PROGRAM = "iTerm.app";
      const detection = detectTerminal();
      expect(supportsProgressBar(detection)).toBe(true);
    });

    it("should return false for terminals without progress support", () => {
      process.env.TERM_PROGRAM = "kitty";
      const detection = detectTerminal();
      expect(supportsProgressBar(detection)).toBe(false);
    });
  });

  describe("supportsNotifications", () => {
    it("should return true for all terminals (native notifications)", () => {
      // iTerm2
      process.env.TERM_PROGRAM = "iTerm.app";
      expect(supportsNotifications(detectTerminal())).toBe(true);

      // Apple Terminal (previously didn't support OSC notifications)
      process.env.TERM_PROGRAM = "Apple_Terminal";
      expect(supportsNotifications(detectTerminal())).toBe(true);

      // GNOME Terminal
      process.env.TERM_PROGRAM = "gnome-terminal";
      expect(supportsNotifications(detectTerminal())).toBe(true);
    });
  });
});
