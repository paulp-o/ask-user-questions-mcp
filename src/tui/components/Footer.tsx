import { Box, Text } from "ink";
import React from "react";

import { theme } from "../theme.js";

interface FooterProps {
  focusContext: "option" | "custom-input";
  multiSelect: boolean;
  isReviewScreen?: boolean;
  customInputValue?: string;
  hasRecommendedOptions?: boolean;
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
  hasRecommendedOptions = false,
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
      return [
        { key: "↑↓", action: "Options" },
        { key: "←→", action: "Cursor" },
        { key: "Tab/S+Tab", action: "Questions" },
        { key: "Enter", action: "Newline" },
        { key: "Esc", action: "Reject" },
      ];
    }

    // Option focused
    if (focusContext === "option") {
      const bindings: Keybinding[] = [
        { key: "↑↓", action: "Options" },
        { key: "←→", action: "Questions" },
        { key: "Tab/S+Tab", action: "Questions" },
      ];

      if (multiSelect) {
        bindings.push({ key: "Space", action: "Toggle" });
      } else {
        bindings.push({ key: "Enter", action: "Select" });
      }

      bindings.push({ key: "E", action: "Elaborate" });
      bindings.push({ key: "D", action: "Rephrase" });

      if (hasRecommendedOptions) {
        bindings.push({ key: "Ctrl+Enter", action: "Quick Submit" });
      }

      bindings.push({ key: "Esc", action: "Reject" });

      return bindings;
    }

    return [];
  };

  const keybindings = getKeybindings();

  return (
    <Box
      borderColor={theme.components.footer.border}
      borderStyle="round"
      paddingX={1}
      paddingY={0}
      flexDirection="row"
      flexWrap="wrap"
    >
      {keybindings.map((binding, idx) => (
        <Box key={idx} paddingRight={2}>
          <Text
            backgroundColor={theme.components.footer.keyBg}
            bold
            color={theme.components.footer.keyFg}
          >
            {` ${binding.key} `}
          </Text>
          <Text color={theme.components.footer.action} dimColor>
            {` ${binding.action}`}
          </Text>
        </Box>
      ))}
    </Box>
  );
};
