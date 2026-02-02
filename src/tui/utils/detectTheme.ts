export type ThemeMode = "system" | string;
export type ResolvedTheme = "AUQ dark" | "AUQ light";

let cachedResult: ResolvedTheme | null = null;

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

export function clearDetectionCache(): void {
  cachedResult = null;
}
