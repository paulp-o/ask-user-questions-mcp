/**
 * Native OS Notifications
 *
 * Cross-platform native notifications using node-notifier (Windows/Linux)
 * and osascript (macOS for reliability).
 * Replaces OSC terminal notifications with OS-native notifications.
 */

import notifier from "node-notifier";
import { exec } from "child_process";
import { promisify } from "util";
import type { NotificationConfig } from "./types.js";

const execAsync = promisify(exec);

/**
 * Send notification on macOS using osascript (more reliable than terminal-notifier)
 */
async function sendMacOSNotification(
  title: string,
  message: string,
  sound: boolean,
): Promise<{ sent: boolean; error?: string }> {
  try {
    // Escape double quotes in title and message
    const escapedTitle = title.replace(/"/g, '\\"');
    const escapedMessage = message.replace(/"/g, '\\"');

    const soundClause = sound ? ' sound name "default"' : "";
    const script = `display notification "${escapedMessage}" with title "${escapedTitle}"${soundClause}`;

    await execAsync(`osascript -e '${script}'`);
    return { sent: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { sent: false, error: errorMessage };
  }
}

/**
 * Result of sending a native notification
 */
export interface NativeNotificationResult {
  /** Whether the notification was sent successfully */
  sent: boolean;
  /** Error message if sending failed */
  error?: string;
}

/** Track if we've already warned about missing Linux dependencies */
let hasWarnedLinuxDeps = false;

/**
 * Check if notify-send is available on Linux systems
 * Logs a warning only once if missing
 */
export async function checkLinuxDependencies(): Promise<void> {
  // Only relevant on Linux
  if (process.platform !== "linux") {
    return;
  }

  // Only warn once
  if (hasWarnedLinuxDeps) {
    return;
  }

  try {
    await execAsync("which notify-send");
  } catch {
    hasWarnedLinuxDeps = true;
    console.warn(
      "[auq] Warning: notify-send not found. Native notifications on Linux require libnotify-bin.",
    );
    console.warn(
      "[auq] Install with: sudo apt-get install libnotify-bin (Debian/Ubuntu) or equivalent for your distro.",
    );
  }
}

/**
 * Build notification options based on platform
 */
function buildNotificationOptions(
  title: string,
  message: string,
  config: NotificationConfig,
): notifier.Notification {
  const baseOptions: notifier.Notification = {
    title,
    message,
  };

  // Platform-specific options
  if (process.platform === "darwin") {
    // macOS: NotificationCenter requires sound name string, not boolean
    // Use 'default' for system default sound, or false to disable
    return {
      ...baseOptions,
      sound: config.sound ? "default" : false,
    } as notifier.Notification;
  }

  if (process.platform === "win32") {
    // Windows: WindowsToaster supports sound boolean and appID
    return {
      ...baseOptions,
      sound: config.sound,
      appID: "com.auq.mcp",
    } as notifier.Notification;
  }

  // Linux: Basic options only, sound handled by system
  return baseOptions;
}

/**
 * Send a native OS notification
 *
 * Uses osascript on macOS (more reliable) and node-notifier on Windows/Linux.
 *
 * @param title - The notification title
 * @param message - The notification message
 * @param config - Notification configuration
 * @returns Promise resolving to the notification result
 */
export async function sendNativeNotification(
  title: string,
  message: string,
  config: NotificationConfig,
): Promise<NativeNotificationResult> {
  // Check if notifications are enabled
  if (!config.enabled) {
    return { sent: false };
  }

  // macOS: Use osascript for reliability (terminal-notifier can be flaky)
  if (process.platform === "darwin") {
    return sendMacOSNotification(title, message, config.sound);
  }

  // Linux: Check dependencies on first use
  if (process.platform === "linux") {
    await checkLinuxDependencies();
  }

  // Windows/Linux: Use node-notifier
  const options = buildNotificationOptions(title, message, config);

  try {
    await new Promise<void>((resolve, reject) => {
      notifier.notify(options, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    return { sent: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Log once to avoid spam
    console.warn(`[auq] Native notification failed: ${errorMessage}`);

    return {
      sent: false,
      error: errorMessage,
    };
  }
}

/**
 * Check if native notifications are supported on this platform
 *
 * @returns true if native notifications can be used
 */
export function isNativeNotificationSupported(): boolean {
  // node-notifier supports macOS, Windows, and Linux (with notify-send)
  const supportedPlatforms = ["darwin", "win32", "linux"];
  return supportedPlatforms.includes(process.platform);
}

/**
 * Get the platform-specific notification capability description
 *
 * @returns Human-readable description of native notification support
 */
export function getNativeNotificationSupportDescription(): string {
  switch (process.platform) {
    case "darwin":
      return "macOS native notifications via Notification Center";
    case "win32":
      return "Windows native notifications via Action Center";
    case "linux":
      return "Linux native notifications via notify-send (requires libnotify-bin)";
    default:
      return `Native notifications not supported on ${process.platform}`;
  }
}
