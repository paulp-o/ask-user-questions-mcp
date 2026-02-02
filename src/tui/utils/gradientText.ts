import gradient from "gradient-string";

import type { Theme } from "../themes/types.js";
import { darkTheme } from "../themes/dark.js";

/**
 * Create a gradient function from theme colors
 */
function createGradient(theme: Theme) {
  const colors = [
    theme.gradient.start,
    theme.gradient.middle,
    theme.gradient.end,
  ];
  return gradient(colors);
}

/**
 * Default gradient using dark theme (for backward compatibility)
 */
const defaultGradient = createGradient(darkTheme);

/**
 * Apply theme gradient to text.
 * If no theme is provided, uses the default dark theme gradient.
 * Returns ANSI-colored string compatible with Ink <Text> components.
 */
export function gradientText(text: string, theme?: Theme): string {
  if (theme) {
    return createGradient(theme)(text);
  }
  return defaultGradient(text);
}

/**
 * Apply theme gradient to welcome/decorative text.
 * @deprecated Use gradientText(text, theme) instead
 */
export function welcomeText(text: string): string {
  return defaultGradient(text);
}

/**
 * Apply theme gradient to goodbye/decorative text.
 * @deprecated Use gradientText(text, theme) instead
 */
export function goodbyeText(text: string): string {
  return defaultGradient(text);
}

/**
 * Legacy export for backward compatibility
 * @deprecated Import gradientText and pass theme instead
 */
export const themeGradient = defaultGradient;
