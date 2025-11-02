import { Box, Text } from "ink";
import React from "react";

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
      <Box flexDirection="column" padding={1}>
        <Text color="yellow">No pending question sets found.</Text>
        <Text dimColor>Waiting for AI to ask questions...</Text>
        <Text dimColor>Press q to quit</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text color="cyan">
        Processing question set... ({queueCount} remaining in queue)
      </Text>
      <Text dimColor>Press q to quit</Text>
    </Box>
  );
};
