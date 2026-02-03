/**
 * Terminal Detection
 *
 * Detects terminal type and selects appropriate OSC protocol based on environment variables.
 * Supports comprehensive terminal detection for: iTerm2, kitty, Ghostty, WezTerm,
 * Alacritty, Terminal.app, GNOME Terminal, Konsole, Hyper, VS Code, rxvt, Windows Terminal.
 */

import type {
  TerminalDetection,
  TerminalProtocol,
  TerminalType,
} from "./types.js";

/**
 * Terminal capability configuration
 */
interface TerminalCapabilities {
  type: TerminalType;
  protocol: TerminalProtocol;
  supportsNotifications: boolean;
  supportsProgress: boolean;
}

/**
 * Map of TERM_PROGRAM values to terminal capabilities
 */
const TERMINAL_MAP: Record<string, TerminalCapabilities> = {
  // iTerm2 - Full OSC 9 support with progress bar
  "iTerm.app": {
    type: "iterm",
    protocol: "osc9",
    supportsNotifications: true,
    supportsProgress: true,
  },
  // kitty - OSC 99 preferred (advanced features)
  kitty: {
    type: "kitty",
    protocol: "osc99",
    supportsNotifications: true,
    supportsProgress: false, // kitty doesn't support OSC 9;4 progress
  },
  // Ghostty - OSC 9 notifications, OSC 9;4 progress bar
  ghostty: {
    type: "ghostty",
    protocol: "osc9",
    supportsNotifications: true,
    supportsProgress: true,
  },
  // WezTerm - OSC 9 notifications, OSC 9;4 progress bar
  WezTerm: {
    type: "wezterm",
    protocol: "osc9",
    supportsNotifications: true,
    supportsProgress: true,
  },
  // Hyper - Try OSC 9 (limited support)
  Hyper: {
    type: "hyper",
    protocol: "osc9",
    supportsNotifications: true,
    supportsProgress: false,
  },
  // VS Code integrated terminal
  vscode: {
    type: "vscode",
    protocol: "osc9",
    supportsNotifications: true,
    supportsProgress: false,
  },
  // Apple Terminal - No notification support
  Apple_Terminal: {
    type: "apple-terminal",
    protocol: "none",
    supportsNotifications: false,
    supportsProgress: false,
  },
  // GNOME Terminal - No notification support
  "gnome-terminal": {
    type: "gnome-terminal",
    protocol: "none",
    supportsNotifications: false,
    supportsProgress: false,
  },
  // Konsole - No notification support
  konsole: {
    type: "konsole",
    protocol: "none",
    supportsNotifications: false,
    supportsProgress: false,
  },
};

/**
 * Detects the terminal type and selects the appropriate OSC protocol.
 * Uses multiple environment variables for comprehensive detection.
 * Does not cache results - allows runtime changes to environment.
 *
 * Detection order:
 * 1. TERM_PROGRAM environment variable (primary)
 * 2. Terminal-specific env vars (ALACRITTY_*, WEZTERM_*, etc.)
 * 3. TERM variable patterns (rxvt, xterm, etc.)
 * 4. Fall back to unknown with OSC 9 (most compatible)
 *
 * @returns TerminalDetection object with full capabilities
 */
export function detectTerminal(): TerminalDetection {
  const termProgram = process.env.TERM_PROGRAM;
  const term = process.env.TERM;

  // Check TERM_PROGRAM first (most reliable)
  if (termProgram && TERMINAL_MAP[termProgram]) {
    const caps = TERMINAL_MAP[termProgram];
    return {
      ...caps,
      termProgram,
    };
  }

  // Check for Alacritty (uses ALACRITTY_* env vars, not TERM_PROGRAM)
  if (process.env.ALACRITTY_WINDOW_ID || process.env.ALACRITTY_SOCKET) {
    return {
      type: "alacritty",
      protocol: "none",
      termProgram,
      supportsNotifications: false,
      supportsProgress: false,
    };
  }

  // Check for WezTerm via alternative env vars
  if (process.env.WEZTERM_PANE || process.env.WEZTERM_UNIX_SOCKET) {
    return {
      type: "wezterm",
      protocol: "osc9",
      termProgram,
      supportsNotifications: true,
      supportsProgress: true,
    };
  }

  // Check for Windows Terminal
  if (process.env.WT_SESSION) {
    return {
      type: "windows-terminal",
      protocol: "osc9",
      termProgram,
      supportsNotifications: true,
      supportsProgress: true,
    };
  }

  // Check TERM for rxvt/urxvt (uses OSC 777)
  if (term && (term.includes("rxvt") || term.includes("urxvt"))) {
    return {
      type: "rxvt",
      protocol: "osc777",
      termProgram,
      supportsNotifications: true,
      supportsProgress: false,
    };
  }

  // Unknown terminal - try OSC 9 as it's most widely supported/ignored
  return {
    type: "unknown",
    protocol: "osc9",
    termProgram,
    supportsNotifications: true,
    supportsProgress: true,
  };
}

/**
 * Checks if the detected terminal supports progress bars.
 *
 * @param detection - The terminal detection result
 * @returns true if the terminal supports progress bars
 */
export function supportsProgressBar(detection: TerminalDetection): boolean {
  return detection.supportsProgress;
}

/**
 * Checks if the detected terminal supports notifications.
 *
 * @param detection - The terminal detection result
 * @returns true if the terminal supports notifications
 */
export function supportsNotifications(detection: TerminalDetection): boolean {
  return detection.supportsNotifications;
}
