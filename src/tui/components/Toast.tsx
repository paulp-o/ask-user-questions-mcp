import { Box, Text } from "ink";
import React, { useEffect } from "react";

import { useTheme } from "../ThemeContext.js";

interface ToastProps {
  message: string;
  type?: "success" | "error" | "info";
  onDismiss: () => void;
  duration?: number; // in milliseconds
  title?: string; // Optional bold title shown before message
  variant?: "default" | "pill";
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
  variant = "default",
}) => {
  const { theme } = useTheme();
  // Auto-dismiss after duration
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  // Color based on type
  const color =
    type === "success"
      ? theme.components.toast.success
      : type === "error"
        ? theme.components.toast.error
        : theme.components.toast.info;

  const isPill = variant === "pill";
  const backgroundColor =
    isPill && type === "success"
      ? theme.components.toast.successPillBg
      : undefined;

  return (
    <Box
      borderColor={theme.components.toast.border}
      borderStyle={isPill ? undefined : "round"}
      backgroundColor={backgroundColor}
      justifyContent={isPill ? "center" : undefined}
      paddingX={2}
      paddingY={0}
      flexDirection="column"
    >
      {title && (
        <Text bold color={color}>
          {title}
        </Text>
      )}
      {message && <Text color={theme.colors.text}>{message}</Text>}
    </Box>
  );
};
