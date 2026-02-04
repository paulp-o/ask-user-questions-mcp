import { Box, Text } from "ink";
import React, { useEffect, useState } from "react";

import { t } from "../../i18n/index.js";
import { useTheme } from "../ThemeContext.js";
import packageJson from "../../../package.json" with { type: "json" };

interface HeaderProps {
  pendingCount: number;
}

/**
 * Header component - displays app logo and status
 * Shows at the top of the TUI with gradient branding and live-updating pending queue count
 */
export const Header: React.FC<HeaderProps> = ({ pendingCount }) => {
  const { theme } = useTheme();
  const [flash, setFlash] = useState(false);
  const [prevCount, setPrevCount] = useState(pendingCount);

  // Flash effect when count changes
  useEffect(() => {
    if (pendingCount !== prevCount) {
      setFlash(true);
      setPrevCount(pendingCount);
      const timer = setTimeout(() => setFlash(false), 300);
      return () => clearTimeout(timer);
    }
  }, [pendingCount, prevCount]);

  // Get version from package.json
  const version = React.useMemo(() => {
    return packageJson.version || "unknown";
  }, []);

  const tagline = t("header.title");

  return (
    <Box
      borderColor={theme.components.header.border}
      borderStyle="round"
      flexDirection="row"
      justifyContent="space-between"
      paddingX={1}
      paddingY={0}
    >
      <Box flexDirection="row" alignItems="center">
        <Text bold color={theme.colors.primary}>
          AUQ
        </Text>
        <Text color="#8A949E"> ⋆ {tagline}</Text>
      </Box>

      <Box flexDirection="row" alignItems="center">
        <Text dimColor>v{version}</Text>
        <Text dimColor> </Text>
        <Text
          backgroundColor={theme.components.header.pillBg}
          bold={flash}
          color={
            flash
              ? theme.components.header.queueFlash
              : pendingCount > 0
                ? theme.components.header.queueActive
                : theme.components.header.queueEmpty
          }
        >
          {pendingCount > 0 ? ` ${pendingCount} queued ` : " idle "}
        </Text>
      </Box>
    </Box>
  );
};
