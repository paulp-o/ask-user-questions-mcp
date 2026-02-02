import { Box, Text } from "ink";
import React, { useEffect, useRef, useState } from "react";

import { useTheme } from "../ThemeContext.js";

/**
 * ThemeIndicator - Shows a temporary centered notification when theme changes
 * Displays for 1.5 seconds then fades out
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
    <Box justifyContent="center" marginY={0}>
      <Text color={theme.colors.textDim}>
        theme: <Text color={theme.colors.primary}>{themeName}</Text>
      </Text>
    </Box>
  );
};
