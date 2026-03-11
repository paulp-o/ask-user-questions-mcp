import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useKeyboard } from "@opentui/react";
import type { SyntaxStyle } from "@opentui/core";
import type { Theme } from "../tui/shared/themes/types.js";
import {
  getTheme,
  listThemes,
  hasTheme,
  darkTheme,
} from "../tui/shared/themes/index.js";
import { detectSystemTheme } from "../tui/shared/utils/detectTheme.js";
import { getSavedTheme, saveTheme } from "../tui/shared/utils/config.js";
import { generateSyntaxStyle } from "./utils/syntaxStyle.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ThemeMode = "system" | string;

export interface ThemeContextValue {
  /** Resolved theme object (never null). */
  theme: Theme;
  /** Current mode — "system" or a named theme key. */
  themeName: ThemeMode;
  /** Pre-built SyntaxStyle derived from the active theme. */
  syntaxStyle: SyntaxStyle;
  /** Advance to the next theme in the cycle. */
  cycleTheme: () => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Consume the nearest ThemeProvider.
 * Throws if called outside of one (fail-fast, no silent undefined).
 */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

/** Resolve a ThemeMode into a concrete Theme object. */
function resolveTheme(mode: ThemeMode): Theme {
  if (mode === "system") {
    const detected = detectSystemTheme();
    return getTheme(detected) ?? darkTheme;
  }
  return getTheme(mode) ?? darkTheme;
}

/**
 * Determine initial theme:
 *   1. Explicit prop override (if not "system")
 *   2. Persisted user preference from config
 *   3. Fallback to "system"
 */
function getInitialTheme(prop?: ThemeMode): ThemeMode {
  if (prop && prop !== "system") return prop;

  const saved = getSavedTheme();
  if (saved && (saved === "system" || hasTheme(saved))) return saved;

  return "system";
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export interface ThemeProviderProps {
  /** Override starting theme — skips config lookup when set. */
  initialTheme?: ThemeMode;
  children: React.ReactNode;
}

export function ThemeProvider({
  initialTheme,
  children,
}: ThemeProviderProps) {
  const [themeName, setThemeName] = useState<ThemeMode>(() =>
    getInitialTheme(initialTheme),
  );

  // Resolve the full Theme + SyntaxStyle when the mode changes.
  const theme = useMemo(() => resolveTheme(themeName), [themeName]);
  const syntaxStyle = useMemo(() => generateSyntaxStyle(theme), [theme]);

  const cycleTheme = useCallback(() => {
    setThemeName((current) => {
      const allThemes = ["system", ...listThemes()];
      const idx = allThemes.indexOf(current);
      const next = (idx + 1) % allThemes.length;
      return allThemes[next];
    });
  }, []);

  // Ctrl+T to cycle theme — matches ink behaviour.
  useKeyboard((key) => {
    if (key.ctrl && key.name === "t") {
      cycleTheme();
    }
  });

  // Persist theme choice whenever it changes.
  useEffect(() => {
    saveTheme(themeName);
  }, [themeName]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, themeName, syntaxStyle, cycleTheme }),
    [theme, themeName, syntaxStyle, cycleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}