/**
 * Notification Types
 *
 * Types and interfaces for native OS notifications and OSC progress bars.
 * Notifications use node-notifier for cross-platform support (macOS, Windows, Linux).
 * Progress bars use OSC 9;4 sequences for terminals that support them.
 */

/**
 * Supported protocols
 * - native: OS-native notifications via node-notifier (default for notifications)
 * - osc9: iTerm2 protocol (used for progress bar only)
 * - none: Feature disabled or unsupported
 */
export type TerminalProtocol = "native" | "osc9" | "none";

/**
 * Detected terminal type
 * Based on TERM_PROGRAM environment variable and other detection methods.
 * Used primarily for determining progress bar support.
 */
export type TerminalType =
  | "iterm" // iTerm.app - progress bar supported
  | "kitty" // kitty - no progress bar
  | "ghostty" // Ghostty - progress bar supported
  | "wezterm" // WezTerm - progress bar supported
  | "alacritty" // Alacritty - no progress bar
  | "apple-terminal" // Terminal.app - no progress bar
  | "gnome-terminal" // GNOME Terminal - no progress bar
  | "konsole" // Konsole - no progress bar
  | "hyper" // Hyper - no progress bar
  | "vscode" // VS Code terminal - no progress bar
  | "rxvt" // rxvt/urxvt - no progress bar
  | "windows-terminal" // Windows Terminal - progress bar supported
  | "unknown"; // Unknown terminal

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
