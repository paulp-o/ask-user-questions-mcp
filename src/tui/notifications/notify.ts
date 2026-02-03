/**
 * High-Level Notification API
 *
 * Provides an easy-to-use interface for sending native OS notifications.
 * Uses node-notifier for cross-platform support (macOS, Windows, Linux).
 */

import type { NotificationConfig, NotificationResult } from "./types.js";
import {
  sendNativeNotification,
  type NativeNotificationResult,
} from "./native.js";

/** Default title for notifications */
const DEFAULT_TITLE = "AUQ";

/**
 * Sends a native OS notification.
 *
 * Platform support:
 * - macOS: Notification Center (works out of the box)
 * - Windows: Action Center (works out of the box)
 * - Linux: notify-send (requires libnotify-bin package)
 *
 * @param message - The notification message to display
 * @param config - Notification configuration
 * @returns NotificationResult indicating success/failure
 */
export function sendNotification(
  message: string,
  config: NotificationConfig,
): NotificationResult {
  // Check if notifications are enabled in config
  if (!config.enabled) {
    return {
      sent: false,
      protocol: "none",
      error: "Notifications disabled",
    };
  }

  try {
    // Send native notification (fire and forget - don't await)
    // We use Promise.resolve to handle the async function without blocking
    sendNativeNotification(DEFAULT_TITLE, message, config)
      .then((result: NativeNotificationResult) => {
        if (!result.sent && result.error) {
          // Error already logged in native.ts
        }
      })
      .catch(() => {
        // Errors already handled in native.ts
      });

    // Return success immediately (notification is async)
    return {
      sent: true,
      protocol: "native",
    };
  } catch (error) {
    return {
      sent: false,
      protocol: "none",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Formats a notification message for new questions.
 *
 * @param count - The number of new questions
 * @returns Formatted notification message
 */
export function formatNotificationMessage(count: number): string {
  return `AUQ: ${count} new question(s)`;
}
