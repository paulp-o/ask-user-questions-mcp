import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useInput } from "ink";
import { ThemeContext, ThemeMode, ThemeContextValue } from "./ThemeContext.js";
import type { Theme } from "./themes/types.js";
import { getTheme, listThemes, darkTheme, hasTheme } from "./themes/index.js";
import { detectSystemTheme } from "./utils/detectTheme.js";
import { getSavedTheme, saveTheme } from "./utils/config.js";

interface ThemeProviderProps {
  initialTheme?: ThemeMode;
  children: React.ReactNode;
}

function resolveTheme(mode: ThemeMode): Theme {
  if (mode === "system") {
    const detected = detectSystemTheme();
    // For system mode, prefer light theme if detected, otherwise dark
    return getTheme(detected) ?? darkTheme;
  }
  // Try to get the requested theme, fallback to dark
  return getTheme(mode) ?? darkTheme;
}

/**
 * Determine the initial theme to use
 * Priority: 1) prop override, 2) saved config, 3) "system"
 */
function getInitialTheme(initialThemeProp?: ThemeMode): ThemeMode {
  // If explicitly passed, use that
  if (initialThemeProp && initialThemeProp !== "system") {
    return initialThemeProp;
  }

  // Try to load from config
  const savedTheme = getSavedTheme();
  if (savedTheme && (savedTheme === "system" || hasTheme(savedTheme))) {
    return savedTheme;
  }

  // Default to system
  return "system";
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  initialTheme,
  children,
}) => {
  const [themeName, setThemeName] = useState<ThemeMode>(() =>
    getInitialTheme(initialTheme),
  );

  const cycleTheme = useCallback(() => {
    setThemeName((current) => {
      const allThemes = ["system", ...listThemes()];
      const currentIndex = allThemes.indexOf(current);
      const nextIndex = (currentIndex + 1) % allThemes.length;
      return allThemes[nextIndex];
    });
  }, []);

  // Ctrl+T to cycle theme
  useInput((input, key) => {
    if (key.ctrl && input === "t") {
      cycleTheme();
    }
  });

  // Persist theme choice when it changes
  useEffect(() => {
    saveTheme(themeName);
  }, [themeName]);

  const theme = useMemo(() => resolveTheme(themeName), [themeName]);

  const contextValue: ThemeContextValue = useMemo(
    () => ({ theme, themeName, cycleTheme }),
    [theme, themeName, cycleTheme],
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};
