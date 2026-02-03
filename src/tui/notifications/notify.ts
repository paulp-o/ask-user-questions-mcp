/**
 * High-Level Notification API
 *
 * Provides an easy-to-use interface for sending terminal notifications
 * using OSC 9 (iTerm2), OSC 99 (kitty), and OSC 777 (rxvt) protocols.
 * Automatically detects terminal and uses the appropriate protocol.
 */

import type {
  NotificationConfig,
  NotificationResult,
  TerminalProtocol,
} from "./types.js";
import { detectTerminal, supportsNotifications } from "./detect.js";
import {
  generateOSC9Notification,
  generateOSC99Notification,
  generateOSC777Notification,
} from "./osc.js";

/** Default title for OSC 777 notifications */
const DEFAULT_TITLE = "AUQ";

/**
 * Sends a notification to the terminal using the appropriate OSC protocol.
 *
 * Supports:
 * - OSC 9 (iTerm2, Ghostty, WezTerm, Windows Terminal, Hyper)
 * - OSC 99 (kitty)
 * - OSC 777 (rxvt/urxvt)
 *
 * @param message - The notification message to display
 * @param config - Notification configuration
 * @returns NotificationResult indicating success/failure and protocol used
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
    // Detect terminal type and appropriate protocol
    const detection = detectTerminal();
    const { protocol } = detection;

    // Check if terminal supports notifications
    if (!supportsNotifications(detection) || protocol === "none") {
      return {
        sent: false,
        protocol: "none",
        error: `Terminal "${detection.type}" does not support notifications`,
      };
    }

    // Generate the appropriate OSC sequence based on protocol
    let oscSequence: string;
    switch (protocol) {
      case "osc99":
        // Kitty protocol with Base64 encoding
        oscSequence = generateOSC99Notification({
          message,
          appName: "auq",
          notificationType: "im",
          sound: config.sound,
        });
        break;
      case "osc777":
        // rxvt protocol with title;body format
        oscSequence = generateOSC777Notification(DEFAULT_TITLE, message);
        break;
      case "osc9":
      default:
        // iTerm2 protocol (most widely supported)
        oscSequence = generateOSC9Notification(message);
        break;
    }

    // Write directly to stdout to avoid console buffering
    process.stdout.write(oscSequence);

    return {
      sent: true,
      protocol,
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
