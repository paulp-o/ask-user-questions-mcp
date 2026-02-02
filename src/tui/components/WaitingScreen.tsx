import { Box, Text, useInput } from "ink";
import React, { useEffect, useState } from "react";
import { AnimatedGradient } from "./AnimatedGradient.js";
import { useTheme } from "../ThemeContext.js";

interface WaitingScreenProps {
  queueCount: number;
}

/**
 * WaitingScreen displays when no question sets are being processed
 * Shows "Waiting for AI..." message or queue status
 */
export const WaitingScreen: React.FC<WaitingScreenProps> = ({ queueCount }) => {
  const { theme } = useTheme();

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
      <Box flexDirection="column" alignItems="center" paddingY={1}>
        <Box
          borderColor={theme.borders.neutral}
          borderStyle="round"
          flexDirection="column"
          paddingX={2}
          paddingY={1}
          width="100%"
        >
          <Box justifyContent="center">
            <AnimatedGradient text="Waiting for a question set…" />
          </Box>
          <Box justifyContent="center" marginTop={1}>
            <Text dimColor>
              Ctrl+C quit
              <Text color={theme.colors.textDim}> •</Text> {elapsedSeconds}s
            </Text>
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" alignItems="center" paddingY={1}>
      <Box
        borderColor={theme.borders.neutral}
        borderStyle="round"
        flexDirection="column"
        paddingX={2}
        paddingY={1}
        width="100%"
      >
        <Box justifyContent="center">
          <AnimatedGradient
            text={`Processing… (${queueCount} waiting in queue)`}
          />
        </Box>
        <Box justifyContent="center" marginTop={1}>
          <Text dimColor>
            Ctrl+C quit
            <Text color={theme.colors.textDim}> •</Text> {elapsedSeconds}s
          </Text>
        </Box>
      </Box>
    </Box>
  );
};
