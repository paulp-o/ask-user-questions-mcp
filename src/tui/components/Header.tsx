import { Box, Text } from "ink";
import gradient from "gradient-string";
import React, { useEffect, useState } from "react";

import { theme } from "../theme.js";

interface HeaderProps {
  pendingCount: number;
}

/**
 * Header component - displays app logo and status
 * Shows at the top of the TUI with gradient branding and live-updating pending queue count
 */
export const Header: React.FC<HeaderProps> = ({ pendingCount }) => {
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

  // Use the selected gradient theme from theme.ts
  const headerText = (
    gradient as unknown as Record<string, (text: string) => string>
  )[theme.headerGradient](".𖥔 AUQ ⋆ Ask User Questions MCP ⋆ ");

  return (
    <Box
      borderColor={theme.components.header.border}
      borderStyle="single"
      flexDirection="row"
      justifyContent="space-between"
      paddingX={1}
    >
      <Text bold>{headerText}</Text>
      <Box>
        <Text dimColor>│</Text>
        <Text
          bold={flash}
          color={
            flash
              ? theme.components.header.queueFlash
              : pendingCount > 0
                ? theme.components.header.queueActive
                : theme.components.header.queueEmpty
          }
        >
          {" "}
          {pendingCount} more on queue
        </Text>
      </Box>
    </Box>
  );
};
