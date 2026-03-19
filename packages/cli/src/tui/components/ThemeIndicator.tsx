import React, { useEffect, useRef, useState } from "react";

import { t } from "../../i18n/index.js";
import { useTheme } from "../ThemeProvider.js";

/**
 * ThemeIndicator — shows a temporary centered notification when theme changes.
 * Displays for 1.5 seconds then hides.
 */
export const ThemeIndicator: React.FC = () => {
  const { theme, themeName } = useTheme();
  const [visible, setVisible] = useState(false);
  const prevThemeRef = useRef(themeName);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip showing indicator on first render
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevThemeRef.current = themeName;
      return;
    }

    // Only show when theme actually changes
    if (themeName !== prevThemeRef.current) {
      prevThemeRef.current = themeName;
      setVisible(true);

      const timer = setTimeout(() => {
        setVisible(false);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [themeName]);

  if (!visible) {
    return null;
  }

  return (
    <box style={{ justifyContent: "center", marginTop: 0, marginBottom: 0 }}>
      <box style={{ flexDirection: "row" }}>
        <text style={{ fg: theme.colors.textDim }}>{`${t("ui.themeLabel")} `}</text>
        <text style={{ fg: theme.colors.primary }}>{themeName}</text>
      </box>
    </box>
  );
};
