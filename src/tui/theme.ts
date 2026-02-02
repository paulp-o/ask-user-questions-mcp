/**
 * Theme System
 *
 * This file provides backward compatibility for components that haven't
 * migrated to the new useTheme() hook yet.
 *
 * NEW CODE SHOULD USE:
 * - import { useTheme } from "./ThemeContext.js"
 * - const { theme } = useTheme()
 *
 * @deprecated Direct theme import is deprecated. Use useTheme() hook instead.
 */

// Re-export from new theme system for backward compatibility
export { darkTheme as theme } from "./themes/dark.js";
export type { Theme } from "./themes/types.js";

// Re-export gradient colors for backward compatibility
import { darkTheme } from "./themes/dark.js";

/**
 * @deprecated Use theme.gradient from useTheme() hook instead
 */
export const gradientColors = [
  darkTheme.gradient.start,
  darkTheme.gradient.middle,
  darkTheme.gradient.end,
] as const;
