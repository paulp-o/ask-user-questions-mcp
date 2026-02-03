/**
 * OSC Escape Sequence Generators
 *
 * Low-level functions to generate OSC 9 (iTerm2), OSC 99 (kitty), and OSC 777 (rxvt)
 * escape sequences for terminal notifications and progress bars.
 */

import {
  type OSC99NotificationOptions,
  type ProgressBarOptions,
} from "./types.js";

/**
 * OSC sequence delimiters
 */
const ESC = "\x1b]"; // ESC ]
const BEL = "\x07"; // BEL character

/**
 * Generate an OSC 9 notification escape sequence (iTerm2 protocol)
 *
 * Format: \x1b]9;{message}\x07
 *
 * @param message - The notification message
 * @returns The complete OSC 9 escape sequence
 */
export function generateOSC9Notification(message: string): string {
  return `${ESC}9;${message}${BEL}`;
}

/**
 * Generate an OSC 99 notification escape sequence (kitty protocol)
 *
 * Format: \x1b]99;{params}\x07
 * Params format: f={appName}:t={type}:d=0:{sound}:p=body;{base64body}
 * Where sound is `s=dialog-information` if enabled
 *
 * @param options - OSC 99 notification options
 * @returns The complete OSC 99 escape sequence
 */
export function generateOSC99Notification(
  options: OSC99NotificationOptions,
): string {
  const {
    message,
    appName = "auq",
    notificationType = "im",
    sound = true,
  } = options;

  // Base64 encode the message body
  const base64Body = btoa(message);

  // Build the params string
  // Format: f={appName}:t={type}:d=0:{sound}:p=body;{base64body}
  const soundParam = sound ? "s=dialog-information" : "";
  const params = `f=${appName}:t=${notificationType}:d=0${soundParam ? ":" + soundParam : ""}:p=body;${base64Body}`;

  return `${ESC}99;${params}${BEL}`;
}

/**
 * Generate an OSC 777 notification escape sequence (rxvt/urxvt protocol)
 *
 * Format: \x1b]777;notify;{title};{body}\x07
 * Used by: urxvt, Ghostty, WezTerm
 *
 * @param title - The notification title
 * @param body - The notification body/message
 * @returns The complete OSC 777 escape sequence
 */
export function generateOSC777Notification(
  title: string,
  body: string,
): string {
  return `${ESC}777;notify;${title};${body}${BEL}`;
}

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
