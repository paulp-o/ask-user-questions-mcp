import { Box, Text, useInput } from "ink";
import React, { useEffect, useState } from "react";
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
  const [startTime] = useState(new Date());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Update elapsed time every second
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      setElapsedSeconds(elapsed);
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime]);

  // Handle 'q' key to quit
  useInput((input, key) => {
    if (input === "q") {
      process.exit(0);
    }
  });

  if (queueCount === 0) {
    return (
      <Box flexDirection="column">
        {/* <Text color={theme.colors.warning}>No pending question sets found.</Text> */}
        <Box justifyContent="center" paddingY={1}>
          <AnimatedGradient text="Waiting for AI to ask questions…" />
        </Box>
        <Box justifyContent="center" paddingY={1}>
          <Text dimColor>Press Ctrl+C to quit</Text>
        </Box>
        <Box justifyContent="center" paddingY={1}>
          <Text dimColor>Time elapsed: {elapsedSeconds}s</Text>
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
        <Text dimColor>Press Ctrl+C to quit</Text>
      </Box>
      <Box justifyContent="center" paddingY={1}>
        <Text dimColor>Time elapsed: {elapsedSeconds}s</Text>
      </Box>
    </Box>
  );
};
