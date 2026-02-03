/**
 * OSC Notification Types
 *
 * Types and interfaces for OSC 9 (iTerm2), OSC 99 (kitty), and OSC 777 (rxvt)
 * terminal notifications with comprehensive terminal support.
 */

/**
 * Supported terminal protocols for notifications
 * - osc9: iTerm2 protocol (most widely supported)
 * - osc99: Kitty protocol (advanced features, Base64 encoded)
 * - osc777: rxvt extension protocol (notify extension)
 * - none: Terminal doesn't support notifications
 */
export type TerminalProtocol = "osc9" | "osc99" | "osc777" | "none";

/**
 * Detected terminal type
 * Based on TERM_PROGRAM environment variable and other detection methods
 */
export type TerminalType =
  | "iterm" // iTerm.app - OSC 9, progress bar
  | "kitty" // kitty - OSC 99 (preferred), OSC 9 compat
  | "ghostty" // ghostty - OSC 9, OSC 777, progress bar
  | "wezterm" // WezTerm - OSC 9, OSC 777, progress bar
  | "alacritty" // Alacritty - no notification support (bell only)
  | "apple-terminal" // Terminal.app - no notification support
  | "gnome-terminal" // GNOME Terminal - no notification support
  | "konsole" // Konsole - no notification support
  | "hyper" // Hyper - try OSC 9
  | "vscode" // VS Code integrated terminal - limited support
  | "rxvt" // rxvt/urxvt - OSC 777
  | "windows-terminal" // Windows Terminal - OSC 9
  | "unknown"; // Unknown terminal, try OSC 9

/**
 * Terminal detection result
 */
export interface TerminalDetection {
  type: TerminalType;
  protocol: TerminalProtocol;
  /** The raw TERM_PROGRAM value */
  termProgram: string | undefined;
  /** Whether this terminal supports notifications */
  supportsNotifications: boolean;
  /** Whether this terminal supports progress bar (OSC 9;4) */
  supportsProgress: boolean;
}

/**
 * Notification configuration from .auqrc.json
 */
export interface NotificationConfig {
  /** Whether notifications are enabled (default: true) */
  enabled: boolean;
  /** Whether to play sound with notifications (default: true) */
  sound: boolean;
}

/**
 * Default notification configuration
 */
export const DEFAULT_NOTIFICATION_CONFIG: NotificationConfig = {
  enabled: true,
  sound: true,
};

/**
 * OSC 9 notification options (iTerm2)
 */
export interface OSC9NotificationOptions {
  /** The notification message */
  message: string;
}

/**
 * OSC 99 notification options (kitty)
 * See: https://sw.kovidgoyal.net/kitty/desktop-notifications/
 */
export interface OSC99NotificationOptions {
  /** The notification message (will be Base64 encoded) */
  message: string;
  /** Application identifier (default: "auq") */
  appName?: string;
  /** Notification type: "im" for instant message (default: "im") */
  notificationType?: string;
  /** Whether to play notification sound */
  sound?: boolean;
}

/**
 * OSC 9 progress bar state
 * See: https://iterm2.com/documentation-escape-codes.html
 */
export type ProgressState =
  /** Remove progress indicator */
  | 0
  /** Set progress value (0-100) */
  | 1
  /** Show indeterminate progress (spinning) */
  | 2
  /** Show completed (briefly, then remove) */
  | 3;

/**
 * Progress bar options for OSC 9
 */
export interface ProgressBarOptions {
  /** Progress state */
  state: ProgressState;
  /** Progress percentage (0-100), only used when state is 1 */
  percent?: number;
}

/**
 * Notification event for batching
 */
export interface NotificationEvent {
  /** Session ID that triggered the notification */
  sessionId: string;
  /** Timestamp of the event */
  timestamp: number;
}

/**
 * Batching state for rapid notifications
 */
export interface BatchingState {
  /** Pending notification events */
  events: NotificationEvent[];
  /** Timer ID for debounce */
  timerId: ReturnType<typeof setTimeout> | null;
  /** Batch window in milliseconds (default: 500ms) */
  batchWindow: number;
}

/**
 * Result of sending a notification
 */
export interface NotificationResult {
  /** Whether the notification was sent successfully */
  sent: boolean;
  /** The protocol used */
  protocol: TerminalProtocol;
  /** Error message if sending failed */
  error?: string;
}
