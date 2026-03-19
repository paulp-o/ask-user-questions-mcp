/**
 * Notification Module
 *
 * Provides native OS notifications (via node-notifier) and OSC progress bar
 * functionality for terminal dock icons.
 *
 * Native notifications supported on:
 * - macOS: Notification Center (works out of the box)
 * - Windows: Action Center (works out of the box)
 * - Linux: notify-send (requires libnotify-bin package)
 *
 * Progress bars supported in:
 * - iTerm2, Ghostty, WezTerm, Windows Terminal
 */

// Types
export type {
  TerminalProtocol,
  TerminalType,
  TerminalDetection,
  NotificationConfig,
  ProgressState,
  ProgressBarOptions,
  NotificationEvent,
  BatchingState,
  NotificationResult,
} from "./types.js";

export { DEFAULT_NOTIFICATION_CONFIG } from "./types.js";

// Terminal detection (for progress bar support)
export {
  detectTerminal,
  supportsProgressBar,
  supportsNotifications,
} from "./detect.js";

// Low-level OSC sequence generators (progress bar only)
export { generateProgressBar } from "./osc.js";

// Native notification API
export {
  sendNativeNotification,
  checkLinuxDependencies,
  isNativeNotificationSupported,
  type NativeNotificationResult,
} from "./native.js";

// High-level notification API
export { sendNotification, formatNotificationMessage } from "./notify.js";

// Progress bar API
export { showProgress, clearProgress, calculateProgress } from "./progress.js";

// Batching API
export {
  createNotificationBatcher,
  type NotificationBatcher,
} from "./batch.js";
