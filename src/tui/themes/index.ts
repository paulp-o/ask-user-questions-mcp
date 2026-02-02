import type { Theme } from "./types.js";
import { darkTheme } from "./dark.js";
import { lightTheme } from "./light.js";
import { nordTheme } from "./nord.js";
import { draculaTheme } from "./dracula.js";
import { catppuccinMochaTheme } from "./catppuccin-mocha.js";
import { catppuccinLatteTheme } from "./catppuccin-latte.js";
import { solarizedDarkTheme } from "./solarized-dark.js";
import { solarizedLightTheme } from "./solarized-light.js";
import { gruvboxDarkTheme } from "./gruvbox-dark.js";
import { gruvboxLightTheme } from "./gruvbox-light.js";
import { tokyoNightTheme } from "./tokyo-night.js";
import { oneDarkTheme } from "./one-dark.js";
import { monokaiTheme } from "./monokai.js";
import { githubDarkTheme } from "./github-dark.js";
import { githubLightTheme } from "./github-light.js";
import { rosePineTheme } from "./rose-pine.js";

/**
 * Built-in themes registry
 * Order determines cycling order with Ctrl+T
 */
const builtInThemes: Map<string, Theme> = new Map([
  ["AUQ dark", darkTheme],
  ["AUQ light", lightTheme],
  ["nord", nordTheme],
  ["dracula", draculaTheme],
  ["catppuccin-mocha", catppuccinMochaTheme],
  ["catppuccin-latte", catppuccinLatteTheme],
  ["solarized-dark", solarizedDarkTheme],
  ["solarized-light", solarizedLightTheme],
  ["gruvbox-dark", gruvboxDarkTheme],
  ["gruvbox-light", gruvboxLightTheme],
  ["tokyo-night", tokyoNightTheme],
  ["one-dark", oneDarkTheme],
  ["monokai", monokaiTheme],
  ["github-dark", githubDarkTheme],
  ["github-light", githubLightTheme],
  ["rose-pine", rosePineTheme],
]);

/**
 * Custom themes loaded from user config directory
 */
const customThemes: Map<string, Theme> = new Map();

/**
 * Register a custom theme
 */
export function registerTheme(name: string, theme: Theme): void {
  customThemes.set(name, theme);
}

/**
 * Get a theme by name
 * @param name Theme name ('dark', 'light', or custom theme name)
 * @returns Theme object or undefined if not found
 */
export function getTheme(name: string): Theme | undefined {
  return builtInThemes.get(name) ?? customThemes.get(name);
}

/**
 * List all available theme names
 */
export function listThemes(): string[] {
  return [...builtInThemes.keys(), ...customThemes.keys()];
}

/**
 * Check if a theme exists
 */
export function hasTheme(name: string): boolean {
  return builtInThemes.has(name) || customThemes.has(name);
}

// Re-export built-in themes for convenience
export {
  darkTheme,
  lightTheme,
  nordTheme,
  draculaTheme,
  catppuccinMochaTheme,
  catppuccinLatteTheme,
  solarizedDarkTheme,
  solarizedLightTheme,
  gruvboxDarkTheme,
  gruvboxLightTheme,
  tokyoNightTheme,
  oneDarkTheme,
  monokaiTheme,
  githubDarkTheme,
  githubLightTheme,
  rosePineTheme,
};
export type { Theme };
