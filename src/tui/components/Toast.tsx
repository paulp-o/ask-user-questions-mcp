import { Box, Text } from "ink";
import React, { useEffect } from "react";

interface ToastProps {
  message: string;
  type?: "success" | "error" | "info";
  onDismiss: () => void;
  duration?: number; // in milliseconds
  title?: string; // Optional bold title shown before message
}

/**
 * Toast component for brief non-blocking notifications
 * Auto-dismisses after specified duration (default 2000ms)
 */
export const Toast: React.FC<ToastProps> = ({
  message,
  type = "success",
  onDismiss,
  duration = 2000,
  title,
}) => {
  // Auto-dismiss after duration
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  // Color based on type
  const color =
    type === "success" ? "green" : type === "error" ? "red" : "cyan";

  return (
    <Box
      borderColor={color}
      borderStyle="round"
      paddingX={2}
      paddingY={0}
      flexDirection="column"
    >
      {title && (
        <Text bold color={color}>
          {title}
        </Text>
      )}
      <Text color={color}>{message}</Text>
    </Box>
  );
};
