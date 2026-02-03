/**
 * Utility for detecting recommended options in question labels.
 * Supports multiple languages and bracket styles.
 */

/**
 * Regex patterns for detecting recommended markers in labels.
 * Requires matching delimiters: either (word) or [word].
 * Matches case-insensitively and supports both parentheses and brackets.
 */
export const RECOMMENDED_PATTERNS = {
  /** Matches (recommended) or [recommended] - case insensitive, requires matching delimiters */
  EN: /(?:\(recommended\)|\[recommended\])/i,
  /** Matches (추천) or [추천] - requires matching delimiters */
  KO: /(?:\(추천\)|\[추천\])/,
} as const;

/**
 * Combined regex for detecting any recommended pattern.
 * Requires matching delimiters: either (word) or [word].
 * Matches case-insensitively for English, exactly for Korean.
 */
const RECOMMENDED_REGEX =
  /(?:\(recommended\)|\[recommended\]|\(추천\)|\[추천\])/i;

/**
 * Detects if a label contains a recommended pattern.
 * Supports English "recommended" and Korean "추천" in parentheses or brackets.
 * Case-insensitive matching.
 *
 * @param label - The option label to check
 * @returns true if the label contains a recommended marker
 *
 * @example
 * isRecommendedOption("Option A (recommended)") // true
 * isRecommendedOption("[추천] Option B") // true
 * isRecommendedOption("Option C") // false
 */
export function isRecommendedOption(label: string): boolean {
  return RECOMMENDED_REGEX.test(label);
}

/**
 * Extracts the clean label by removing recommended markers.
 * Removes recommended patterns and trims whitespace.
 *
 * @param label - The option label with potential recommended marker
 * @returns The clean label without recommended markers
 *
 * @example
 * extractCleanLabel("Option A (recommended)") // "Option A"
 * extractCleanLabel("[추천] Option B") // "Option B"
 * extractCleanLabel("  Option C  ") // "Option C"
 */
export function extractCleanLabel(label: string): string {
  return label.replace(RECOMMENDED_REGEX, "").trim().replace(/\s+/g, " ");
}
