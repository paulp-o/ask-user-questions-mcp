import gradient from "gradient-string";

import { gradientColors } from "../theme.js";

/**
 * Theme-based gradient for decorative text in the TUI.
 * Colors are defined in theme.ts and can be customized in one place.
 */
export const themeGradient = gradient(gradientColors as unknown as string[]);

/**
 * Apply theme gradient to welcome/decorative text.
 * Returns ANSI-colored string compatible with Ink <Text> components.
 */
export function welcomeText(text: string): string {
  return themeGradient(text);
}

/**
 * Apply theme gradient to goodbye/decorative text.
 * Returns ANSI-colored string compatible with Ink <Text> components.
 */
export function goodbyeText(text: string): string {
  return themeGradient(text);
}

export function gradientText(text: string): string {
  return themeGradient(text);
}
