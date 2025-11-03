import { Box, Text } from "ink";
import React from "react";
import { AnimatedGradient } from "./AnimatedGradient.js";
// import { theme } from "../theme.js";

interface WaitingScreenProps {
  queueCount: number;
}

/**
 * WaitingScreen displays when no question sets are being processed
 * Shows "Waiting for AI..." message or queue status
 */
export const WaitingScreen: React.FC<WaitingScreenProps> = ({ queueCount }) => {
  if (queueCount === 0) {
    return (
      <Box flexDirection="column">
        {/* <Text color={theme.colors.warning}>No pending question sets found.</Text> */}
        <Box justifyContent="center" paddingY={1}>
          <AnimatedGradient text="Waiting for AI to ask questions…" />
        </Box>
        <Box justifyContent="center" paddingY={1}>
          <Text dimColor>Press q to quit</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <AnimatedGradient
        text={`Processing question set... (${queueCount} remaining in queue)`}
      />
      <Box justifyContent="center" paddingY={1}>
        <Text dimColor>Press q to quit</Text>
      </Box>
    </Box>
  );
};
