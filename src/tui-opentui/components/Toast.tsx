import React, { useEffect, useState } from "react";
import { TextAttributes } from "@opentui/core";

import { useTheme } from "../ThemeProvider.js";

interface ToastProps {
  message: string;
  type?: "success" | "error" | "info" | "warning";
  onDismiss: () => void;
  duration?: number;
  title?: string;
  variant?: "default" | "pill";
}

/**
 * Toast component for brief non-blocking notifications.
 * Auto-dismisses after specified duration (default 3000ms).
 * Uses OpenTUI Timeline for smooth lifecycle management.
 */
export const Toast: React.FC<ToastProps> = ({
  message,
  type = "success",
  onDismiss,
  duration = 3000,
  title,
  variant = "default",
}) => {
  const { theme } = useTheme();
  const [visible, setVisible] = useState(true);

  // Auto-dismiss after duration
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  if (!visible) return null;

  // Color based on type
  const colorMap: Record<string, string> = {
    success: theme.components.toast.success,
    error: theme.components.toast.error,
    info: theme.components.toast.info,
    warning: theme.colors.warning,
  };
  const color = colorMap[type] ?? theme.components.toast.info;

  const isPill = variant === "pill";
  const backgroundColor =
    isPill && type === "success"
      ? theme.components.toast.successPillBg
      : undefined;

  return (
    <box
      style={{
        borderColor: theme.components.toast.border,
        borderStyle: isPill ? undefined : "rounded" as const,
        backgroundColor: backgroundColor,
        justifyContent: isPill ? "center" : undefined,
        paddingX: 2,
        paddingY: 0,
        flexDirection: "column",
      }}
    >
      {title && (
        <text style={{ fg: color, attributes: TextAttributes.BOLD }}>{title}</text>
      )}
      {message && (
        <text style={{ fg: theme.colors.text }}>{message}</text>
      )}
    </box>
  );
};