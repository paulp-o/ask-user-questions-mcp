import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import type { Theme } from "./types.js";
import { darkTheme } from "./dark.js";
import { registerTheme } from "./index.js";

/**
 * Get the config directory for AUQ themes
 * Respects XDG_CONFIG_HOME on Linux, defaults to ~/.config/auq/themes
 */
function getThemesDirectory(): string {
  const xdgConfig = process.env.XDG_CONFIG_HOME;
  const baseConfig = xdgConfig || path.join(os.homedir(), ".config");
  return path.join(baseConfig, "auq", "themes");
}

/**
 * Deep merge two objects, with source overriding target
 */
function deepMerge<T extends object>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key of Object.keys(source) as (keyof T)[]) {
    const sourceValue = source[key];
    const targetValue = target[key];

    if (
      sourceValue !== undefined &&
      typeof sourceValue === "object" &&
      sourceValue !== null &&
      !Array.isArray(sourceValue) &&
      typeof targetValue === "object" &&
      targetValue !== null
    ) {
      // Recursively merge objects
      result[key] = deepMerge(
        targetValue as object,
        sourceValue as object,
      ) as T[keyof T];
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue as T[keyof T];
    }
  }

  return result;
}

/**
 * Validate a theme file against basic structure requirements
 */
function validateThemeFile(
  data: unknown,
): data is Partial<Theme> & { name: string } {
  if (typeof data !== "object" || data === null) {
    return false;
  }

  const obj = data as Record<string, unknown>;

  // Name is required
  if (typeof obj.name !== "string" || obj.name.length === 0) {
    return false;
  }

  return true;
}

/**
 * Load a single theme file
 * Returns the theme if valid, or null if invalid/missing
 */
export function loadThemeFile(filePath: string): Theme | null {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(content) as unknown;

    if (!validateThemeFile(data)) {
      console.error(
        `[AUQ] Invalid theme file: ${filePath} - missing required 'name' field`,
      );
      return null;
    }

    // Merge with dark theme as base
    const mergedTheme = deepMerge(darkTheme, data as Partial<Theme>);

    // Override the name from the file
    return {
      ...mergedTheme,
      name: data.name as "dark" | "light",
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error(`[AUQ] Failed to load theme file ${filePath}:`, error);
    }
    return null;
  }
}

/**
 * Discover and load all custom themes from the themes directory
 * Registers them in the theme registry
 */
export function loadCustomThemes(): void {
  const themesDir = getThemesDirectory();

  // Check if directory exists
  if (!fs.existsSync(themesDir)) {
    return; // No custom themes directory, nothing to load
  }

  try {
    const files = fs.readdirSync(themesDir);

    for (const file of files) {
      if (!file.endsWith(".theme.json")) {
        continue;
      }

      const filePath = path.join(themesDir, file);
      const theme = loadThemeFile(filePath);

      if (theme) {
        registerTheme(theme.name, theme);
      }
    }
  } catch (error) {
    console.error(`[AUQ] Failed to read themes directory:`, error);
  }
}

/**
 * Get the themes directory path (for display purposes)
 */
export function getThemesDirectoryPath(): string {
  return getThemesDirectory();
}
