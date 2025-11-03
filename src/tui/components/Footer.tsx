import { Box, Text } from "ink";
import React from "react";

import { theme } from "../theme.js";

interface FooterProps {
  focusContext: "option" | "custom-input";
  multiSelect: boolean;
  isReviewScreen?: boolean;
  customInputValue?: string;
}

/**
 * Footer component - displays context-aware keybindings
 * Shows different shortcuts based on current focus context and question type
 */
export const Footer: React.FC<FooterProps> = ({
  focusContext,
  multiSelect,
  isReviewScreen = false,
  customInputValue = "",
}) => {
  const renderKeybindings = () => {
    // Review screen mode
    if (isReviewScreen) {
      return "Enter Submit | n Back";
    }

    // Custom input focused
    if (focusContext === "custom-input") {
      const hasContent = customInputValue.trim().length > 0;
      const parts: string[] = [];

      parts.push("↑↓ Options");
      parts.push("Tab Next");

      if (hasContent) {
        parts.push("Enter Submit");
      }

      parts.push("Shift+Enter Newline");
      parts.push("Esc Reject");

      return parts.join(" | ");
    }

    // Option focused
    if (focusContext === "option") {
      const parts: string[] = [];

      parts.push("↑↓ Options");
      parts.push("←→ Questions");

      if (multiSelect) {
        parts.push("Space Toggle");
        parts.push("Tab Submit");
      } else {
        parts.push("Enter Select");
      }

      parts.push("Esc Reject");
      parts.push("q Quit");

      return parts.join(" | ");
    }

    return "";
  };

  return (
    <Box
      borderColor={theme.borders.neutral}
      borderStyle="single"
      paddingX={1}
    >
      <Text dimColor>{renderKeybindings()}</Text>
    </Box>
  );
};
