/**
 * Stale Session Detection Utilities
 *
 * Pure functions for computing session staleness. No I/O or React dependencies.
 * Design Decision 4: "Stale is computed flag, not persisted status"
 * Design Decision 8: "Interaction resets stale check for that session"
 */

/**
 * Default grace period in milliseconds (30 minutes).
 * If a user interacted with a session within this window, it is not considered stale.
 */
export const DEFAULT_GRACE_PERIOD = 1800000; // 30 minutes

/**
 * Determine whether a session should be considered stale based on its age,
 * a configurable threshold, and an optional last-interaction timestamp.
 *
 * @param requestTimestamp - When the session was originally created (epoch ms)
 * @param staleThreshold - Maximum allowed age before a session is stale (ms)
 * @param lastInteraction - Last time the user interacted with this session (epoch ms)
 * @param gracePeriod - Time after an interaction during which the session is not stale (ms)
 * @returns true if the session is stale
 */
export function isSessionStale(
  requestTimestamp: number,
  staleThreshold: number,
  lastInteraction?: number,
  gracePeriod: number = DEFAULT_GRACE_PERIOD,
): boolean {
  const now = Date.now();

  // If the user interacted recently (within grace period), session is not stale
  if (lastInteraction && now - lastInteraction < gracePeriod) {
    return false;
  }

  return now - requestTimestamp > staleThreshold;
}

/**
 * Check whether a session has been explicitly marked as abandoned
 * (e.g. AI disconnected).
 *
 * @param status - The session's current status string
 * @returns true if status is "abandoned"
 */
export function isSessionAbandoned(status: string): boolean {
  return status === "abandoned";
}

/**
 * Build a human-readable toast message for a stale session.
 *
 * @param sessionTitle - Display name or ID of the session
 * @param createdAtMs - Session creation time in epoch milliseconds
 * @returns Formatted message string
 */
export function formatStaleToastMessage(
  sessionTitle: string,
  createdAtMs: number,
): string {
  const hoursAgo = Math.floor((Date.now() - createdAtMs) / 3600000);
  return `Session "${sessionTitle}" may be orphaned (created ${hoursAgo}h ago)`;
}