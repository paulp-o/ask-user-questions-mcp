/**
 * OSC Notification Module
 *
 * Provides OSC 9 (iTerm2), OSC 99 (kitty), and OSC 777 (rxvt) terminal
 * notification support with progress bar functionality and notification batching.
 *
 * Supported terminals:
 * - iTerm2 (OSC 9, progress bar)
 * - kitty (OSC 99)
 * - Ghostty (OSC 9, OSC 777, progress bar)
 * - WezTerm (OSC 9, OSC 777, progress bar)
 * - Windows Terminal (OSC 9, progress bar)
 * - Hyper (OSC 9)
 * - rxvt/urxvt (OSC 777)
 * - VS Code terminal (OSC 9)
 *
 * Unsupported terminals (gracefully skipped):
 * - Alacritty (no notification support)
 * - Terminal.app (no notification support)
 * - GNOME Terminal (no notification support)
 * - Konsole (no notification support)
 */

// Types
export type {
  TerminalProtocol,
  TerminalType,
  TerminalDetection,
  NotificationConfig,
  OSC9NotificationOptions,
  OSC99NotificationOptions,
  ProgressState,
  ProgressBarOptions,
  NotificationEvent,
  BatchingState,
  NotificationResult,
} from "./types.js";

export { DEFAULT_NOTIFICATION_CONFIG } from "./types.js";

// Terminal detection
export {
  detectTerminal,
  supportsProgressBar,
  supportsNotifications,
} from "./detect.js";

// Low-level OSC sequence generators
export {
  generateOSC9Notification,
  generateOSC99Notification,
  generateOSC777Notification,
  generateProgressBar,
} from "./osc.js";

// High-level notification API
export { sendNotification, formatNotificationMessage } from "./notify.js";

// Progress bar API
export { showProgress, clearProgress, calculateProgress } from "./progress.js";

// Batching API (exported from batch.ts)
export {
  createNotificationBatcher,
  type NotificationBatcher,
} from "./batch.js";
