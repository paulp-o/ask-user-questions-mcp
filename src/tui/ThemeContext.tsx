import React, { createContext, useContext } from "react";
import type { Theme } from "./themes/types.js";

/**
 * ThemeMode can be:
 * - "system": Auto-detect from terminal
 * - Any built-in theme name: "dark", "light", "nord", "dracula", etc.
 * - Any custom theme name loaded from ~/.config/auq/themes/
 */
export type ThemeMode = "system" | string;

export interface ThemeContextValue {
  theme: Theme;
  themeName: ThemeMode;
  cycleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
