import { Box, Text } from "ink";
import React from "react";

import { theme } from "../theme.js";

interface FooterProps {
  focusContext: "option" | "custom-input";
  multiSelect: boolean;
  isReviewScreen?: boolean;
  customInputValue?: string;
}

type Keybinding = { key: string; action: string };

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
  const getKeybindings = (): Keybinding[] => {
    // Review screen mode
    if (isReviewScreen) {
      return [
        { key: "Enter", action: "Submit" },
        { key: "n", action: "Back" },
      ];
    }

    // Custom input focused
    if (focusContext === "custom-input") {
      const hasContent = customInputValue.trim().length > 0;
      const bindings: Keybinding[] = [
        { key: "↑↓", action: "Options" },
        { key: "Tab", action: "Next" },
      ];

      if (hasContent) {
        bindings.push({ key: "Enter", action: "Submit" });
      }

      bindings.push(
        { key: "Shift+Enter", action: "Newline" },
        { key: "Esc", action: "Reject" },
      );

      return bindings;
    }

    // Option focused
    if (focusContext === "option") {
      const bindings: Keybinding[] = [
        { key: "↑↓", action: "Options" },
        { key: "←→", action: "Questions" },
      ];

      if (multiSelect) {
        bindings.push(
          { key: "Space", action: "Toggle" },
          { key: "Tab", action: "Submit" },
        );
      } else {
        bindings.push({ key: "Enter", action: "Select" });
      }

      bindings.push({ key: "Esc", action: "Reject" });

      return bindings;
    }

    return [];
  };

  const keybindings = getKeybindings();

  return (
    <Box borderColor={theme.borders.neutral} borderStyle="single" paddingX={1}>
      <Text dimColor>
        {keybindings.map((binding, idx) => (
          <React.Fragment key={idx}>
            {idx > 0 && <Text dimColor> | </Text>}
            <Text bold color="cyan">
              {binding.key}
            </Text>
            <Text dimColor> {binding.action}</Text>
          </React.Fragment>
        ))}
      </Text>
    </Box>
  );
};
