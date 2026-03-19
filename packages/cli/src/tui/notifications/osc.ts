/**
 * OSC Escape Sequence Generators
 *
 * Low-level functions to generate OSC 9 escape sequences for progress bars.
 * Note: OSC notification sequences (OSC 9/99/777) have been replaced with
 * native OS notifications via node-notifier. This file now only contains
 * progress bar functionality.
 */

import { type ProgressBarOptions } from "./types.js";

/**
 * OSC sequence delimiters
 */
const ESC = "\x1b]"; // ESC ]
const BEL = "\x07"; // BEL character

/**
 * Generate an OSC 9 progress bar escape sequence (iTerm2/ConEmu protocol)
 *
 * Format: \x1b]9;4;{state};{percent}\x07
 * Supported by: iTerm2, Ghostty, WezTerm, Windows Terminal
 *
 * Progress states:
 * - 0: Remove progress indicator
 * - 1: Set progress value (0-100)
 * - 2: Show indeterminate progress (spinning) / error state
 * - 3: Show completed (briefly, then remove) / indeterminate
 * - 4: Paused state (not supported by all terminals)
 *
 * @param options - Progress bar options
 * @returns The complete OSC 9 progress bar escape sequence
 */
export function generateProgressBar(options: ProgressBarOptions): string {
  const { state, percent } = options;

  // For state 1 (set progress value), include the percentage
  if (state === 1 && percent !== undefined) {
    // Clamp percentage to 0-100 range
    const clampedPercent = Math.max(0, Math.min(100, Math.round(percent)));
    return `${ESC}9;4;${state};${clampedPercent}${BEL}`;
  }

  // For other states, omit the percentage
  return `${ESC}9;4;${state}${BEL}`;
}
