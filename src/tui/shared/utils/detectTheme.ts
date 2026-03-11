/** Theme mode preference - "system" for auto-detection or a specific theme name */
export type ThemeMode = "system" | string;

/** Resolved theme after system detection - either the dark or light AUQ theme */
export type ResolvedTheme = "AUQ dark" | "AUQ light";

let cachedResult: ResolvedTheme | null = null;

/**
 * Detect whether the system prefers dark or light mode.
 * Uses the COLORFGBG environment variable if available, otherwise defaults to dark.
 * Results are cached for performance.
 *
 * @returns The resolved theme name ("AUQ dark" or "AUQ light")
 */
export function detectSystemTheme(): ResolvedTheme {
  if (cachedResult !== null) {
    return cachedResult;
  }

  const colorfgbg = process.env.COLORFGBG;
  if (colorfgbg) {
    const parts = colorfgbg.split(";");
    if (parts.length >= 2) {
      const bg = parseInt(parts[1], 10);
      if (!isNaN(bg)) {
        cachedResult = bg < 8 ? "AUQ dark" : "AUQ light";
        return cachedResult;
      }
    }
  }

  cachedResult = "AUQ dark";
  return cachedResult;
}

/**
 * Clear the cached theme detection result.
 * Call this when the system theme may have changed.
 */
export function clearDetectionCache(): void {
  cachedResult = null;
}
