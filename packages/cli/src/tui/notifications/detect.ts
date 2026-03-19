/**
 * Terminal Detection
 *
 * Detects terminal type for progress bar support (OSC 9;4).
 * Note: Notifications now use native OS notifications via node-notifier,
 * so terminal detection is only needed for progress bar functionality.
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
 * Note: protocol is now only relevant for progress bar (osc9)
 * Notifications use native OS notifications on all platforms
 */
const TERMINAL_MAP: Record<string, TerminalCapabilities> = {
  // iTerm2 - OSC 9;4 progress bar support
  "iTerm.app": {
    type: "iterm",
    protocol: "osc9",
    supportsNotifications: true, // Native notifications work everywhere
    supportsProgress: true,
  },
  // kitty - No progress bar support
  kitty: {
    type: "kitty",
    protocol: "none",
    supportsNotifications: true,
    supportsProgress: false,
  },
  // Ghostty - OSC 9;4 progress bar support
  ghostty: {
    type: "ghostty",
    protocol: "osc9",
    supportsNotifications: true,
    supportsProgress: true,
  },
  // WezTerm - OSC 9;4 progress bar support
  WezTerm: {
    type: "wezterm",
    protocol: "osc9",
    supportsNotifications: true,
    supportsProgress: true,
  },
  // Hyper - No progress bar support
  Hyper: {
    type: "hyper",
    protocol: "none",
    supportsNotifications: true,
    supportsProgress: false,
  },
  // VS Code integrated terminal - No progress bar support
  vscode: {
    type: "vscode",
    protocol: "none",
    supportsNotifications: true,
    supportsProgress: false,
  },
  // Apple Terminal - No progress bar support
  Apple_Terminal: {
    type: "apple-terminal",
    protocol: "none",
    supportsNotifications: true,
    supportsProgress: false,
  },
  // GNOME Terminal - No progress bar support
  "gnome-terminal": {
    type: "gnome-terminal",
    protocol: "none",
    supportsNotifications: true,
    supportsProgress: false,
  },
  // Konsole - No progress bar support
  konsole: {
    type: "konsole",
    protocol: "none",
    supportsNotifications: true,
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
  // Alacritty has no progress bar support, but native notifications work
  if (process.env.ALACRITTY_WINDOW_ID || process.env.ALACRITTY_SOCKET) {
    return {
      type: "alacritty",
      protocol: "none",
      termProgram,
      supportsNotifications: true,
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

  // Check TERM for rxvt/urxvt - no progress bar support
  if (term && (term.includes("rxvt") || term.includes("urxvt"))) {
    return {
      type: "rxvt",
      protocol: "none",
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
