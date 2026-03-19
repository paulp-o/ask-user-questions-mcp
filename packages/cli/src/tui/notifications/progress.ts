/**
 * Progress Bar API
 *
 * High-level functions to control progress bars in terminal dock icons using OSC 9 sequences.
 */

import type { NotificationConfig } from "./types.js";
import { detectTerminal, supportsProgressBar } from "./detect.js";
import { generateProgressBar } from "./osc.js";

/**
 * Shows a progress bar in the terminal dock icon.
 *
 * @param percent - The progress percentage (0-100)
 * @param config - The notification configuration
 * @returns true if the progress bar was shown successfully, false otherwise
 */
export function showProgress(
  percent: number,
  config: NotificationConfig,
): boolean {
  // Return false if config.enabled is false
  if (!config.enabled) {
    return false;
  }

  // Detect terminal and check if it supports progress bars
  const detection = detectTerminal();
  if (!supportsProgressBar(detection)) {
    return false;
  }

  // Clamp percent to 0-100
  const clampedPercent = Math.max(0, Math.min(100, percent));

  // Generate progress sequence with state=1 and percent
  const sequence = generateProgressBar({ state: 1, percent: clampedPercent });

  // Write to process.stdout.write()
  process.stdout.write(sequence);

  return true;
}

/**
 * Clears the progress bar from the terminal dock icon.
 *
 * @param config - The notification configuration
 * @returns true if the progress bar was cleared successfully, false otherwise
 */
export function clearProgress(config: NotificationConfig): boolean {
  // Return false if config.enabled is false
  if (!config.enabled) {
    return false;
  }

  // Check terminal support
  const detection = detectTerminal();
  if (!supportsProgressBar(detection)) {
    return false;
  }

  // Generate progress sequence with state=0 (remove)
  const sequence = generateProgressBar({ state: 0 });

  // Write to process.stdout.write()
  process.stdout.write(sequence);

  return true;
}

/**
 * Calculates the progress percentage from answered and total counts.
 *
 * @param answered - The number of answered items
 * @param total - The total number of items
 * @returns The progress percentage rounded to the nearest integer
 */
export function calculateProgress(answered: number, total: number): number {
  return Math.round((answered / total) * 100);
}
