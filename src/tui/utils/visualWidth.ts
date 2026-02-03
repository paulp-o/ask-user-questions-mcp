import stringWidth from "string-width";

/**
 * CJK Visual Width Utilities
 *
 * These utilities handle the difference between character count and visual column width
 * in terminal rendering. CJK (Chinese, Japanese, Korean) characters typically occupy
 * 2 terminal columns but count as 1 character in JavaScript strings.
 *
 * This causes issues with:
 * - Background colors being too short (ANSI codes applied per character, not per column)
 * - Cursor positioning being off by half the number of CJK characters
 */

/**
 * Get the visual width (terminal columns) of a string.
 * CJK characters count as 2 columns, most others as 1.
 *
 * @param text - The string to measure
 * @returns The number of terminal columns the string occupies
 */
export function getVisualWidth(text: string): number {
  return stringWidth(text);
}

/**
 * Pad a string to a target visual width using spaces.
 * Useful for ensuring background colors extend to the correct visual width.
 *
 * @param text - The string to pad
 * @param targetWidth - The desired visual width in terminal columns
 * @returns The padded string
 */
export function padToVisualWidth(text: string, targetWidth: number): string {
  const currentWidth = getVisualWidth(text);
  if (currentWidth >= targetWidth) {
    return text;
  }
  return text + " ".repeat(targetWidth - currentWidth);
}

/**
 * Truncate a string to fit within a target visual width.
 * Appends ellipsis if truncation occurs.
 *
 * @param text - The string to truncate
 * @param maxWidth - The maximum visual width in terminal columns
 * @returns The truncated string (with ellipsis if truncated)
 */
export function truncateToVisualWidth(text: string, maxWidth: number): string {
  if (maxWidth <= 0) return "";

  const currentWidth = getVisualWidth(text);
  if (currentWidth <= maxWidth) {
    return text;
  }

  // Need to truncate - find the right cut point
  let result = "";
  let width = 0;
  const ellipsis = "…";
  const ellipsisWidth = getVisualWidth(ellipsis);
  const targetWidth = maxWidth - ellipsisWidth;

  if (targetWidth <= 0) {
    return maxWidth >= ellipsisWidth ? ellipsis : "";
  }

  for (const char of text) {
    const charWidth = getVisualWidth(char);
    if (width + charWidth > targetWidth) {
      break;
    }
    result += char;
    width += charWidth;
  }

  return result + ellipsis;
}

/**
 * Fit a string to exactly the target visual width.
 * Truncates if too long, pads with spaces if too short.
 *
 * @param text - The string to fit
 * @param targetWidth - The exact visual width to achieve
 * @returns The fitted string
 */
export function fitToVisualWidth(text: string, targetWidth: number): string {
  const truncated = truncateToVisualWidth(text, targetWidth);
  return padToVisualWidth(truncated, targetWidth);
}

/**
 * Convert a visual column position to a character index in the string.
 * Useful for cursor positioning when the user clicks or navigates visually.
 *
 * @param text - The string to search in
 * @param visualPos - The visual column position (0-based)
 * @returns The character index corresponding to that visual position
 */
export function visualPositionToCharIndex(
  text: string,
  visualPos: number,
): number {
  if (visualPos <= 0) return 0;

  let currentVisualPos = 0;
  let charIndex = 0;

  for (const char of text) {
    if (currentVisualPos >= visualPos) {
      return charIndex;
    }
    const charWidth = getVisualWidth(char);
    currentVisualPos += charWidth;
    charIndex++;
  }

  return charIndex;
}

/**
 * Convert a character index to a visual column position.
 * Useful for rendering the cursor at the correct terminal column.
 *
 * @param text - The string to measure
 * @param charIndex - The character index (0-based)
 * @returns The visual column position
 */
export function charIndexToVisualPosition(
  text: string,
  charIndex: number,
): number {
  if (charIndex <= 0) return 0;

  const chars = [...text];
  const limitedIndex = Math.min(charIndex, chars.length);
  const substring = chars.slice(0, limitedIndex).join("");

  return getVisualWidth(substring);
}

/**
 * Get the character at a visual position, accounting for wide characters.
 * If the visual position falls in the middle of a wide character, returns that character.
 *
 * @param text - The string to search in
 * @param visualPos - The visual column position (0-based)
 * @returns The character at that position, or empty string if out of bounds
 */
export function getCharAtVisualPosition(
  text: string,
  visualPos: number,
): string {
  const charIndex = visualPositionToCharIndex(text, visualPos);
  const chars = [...text];
  return chars[charIndex] ?? "";
}

/**
 * Check if a character is a wide character (typically CJK).
 * Wide characters occupy 2 terminal columns.
 *
 * @param char - A single character to check
 * @returns true if the character is wide (2 columns)
 */
export function isWideChar(char: string): boolean {
  return getVisualWidth(char) > 1;
}
