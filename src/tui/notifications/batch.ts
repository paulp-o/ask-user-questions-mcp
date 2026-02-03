/**
 * Notification Batching
 *
 * Aggregates rapid session arrivals into a single notification with count.
 * Uses debounce/batch logic to prevent notification spam.
 */

import type {
  NotificationConfig,
  NotificationEvent,
  NotificationResult,
} from "./types.js";
import { sendNotification, formatNotificationMessage } from "./notify.js";

/**
 * Default batch window in milliseconds
 */
const DEFAULT_BATCH_WINDOW = 500;

/**
 * Notification batcher interface
 */
export interface NotificationBatcher {
  /** Queue a notification for a new session */
  queue(sessionId: string): void;
  /** Force send any pending notifications immediately */
  flush(): NotificationResult | null;
  /** Cancel all pending notifications and clear state */
  cancel(): void;
  /** Get the number of pending events */
  getPendingCount(): number;
}

/**
 * Creates a notification batcher that aggregates rapid events.
 *
 * @param config - Notification configuration
 * @param batchWindow - Batch window in milliseconds (default: 500ms)
 * @returns NotificationBatcher instance
 */
export function createNotificationBatcher(
  config: NotificationConfig,
  batchWindow: number = DEFAULT_BATCH_WINDOW,
): NotificationBatcher {
  // Internal state
  let pendingEvents: NotificationEvent[] = [];
  let timerId: ReturnType<typeof setTimeout> | null = null;

  /**
   * Sends a batched notification with the current pending count
   */
  function sendBatchedNotification(): NotificationResult | null {
    if (pendingEvents.length === 0) {
      return null;
    }

    const count = pendingEvents.length;
    const message = formatNotificationMessage(count);
    const result = sendNotification(message, config);

    // Clear state after sending
    pendingEvents = [];
    timerId = null;

    return result;
  }

  /**
   * Queues a notification for a new session.
   * Starts or resets the batch timer.
   */
  function queue(sessionId: string): void {
    // If notifications are disabled, do nothing
    if (!config.enabled) {
      return;
    }

    // Add event to pending list
    pendingEvents.push({
      sessionId,
      timestamp: Date.now(),
    });

    // Reset the batch timer
    if (timerId !== null) {
      clearTimeout(timerId);
    }

    // Set new timer to send after batch window
    timerId = setTimeout(() => {
      sendBatchedNotification();
    }, batchWindow);
  }

  /**
   * Forces send any pending notifications immediately.
   */
  function flush(): NotificationResult | null {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }

    return sendBatchedNotification();
  }

  /**
   * Cancels all pending notifications and clears state.
   */
  function cancel(): void {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
    pendingEvents = [];
  }

  /**
   * Gets the number of pending events.
   */
  function getPendingCount(): number {
    return pendingEvents.length;
  }

  return {
    queue,
    flush,
    cancel,
    getPendingCount,
  };
}
