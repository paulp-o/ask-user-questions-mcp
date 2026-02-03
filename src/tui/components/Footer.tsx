import { Box, Text } from "ink";
import React from "react";

import { t } from "../../i18n/index.js";
import { useTheme } from "../ThemeContext.js";

interface FooterProps {
  focusContext: "option" | "custom-input";
  multiSelect: boolean;
  isReviewScreen?: boolean;
  customInputValue?: string;
  /** True if CURRENT question has recommended options (for R key visibility) */
  hasRecommendedOptions?: boolean;
  /** True if ANY question in the session has recommended options (for Ctrl+R visibility) */
  hasAnyRecommendedInSession?: boolean;
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
  hasAnyRecommendedInSession = false,
}) => {
  const { theme } = useTheme();
  const getKeybindings = (): Keybinding[] => {
    // Review screen mode
    if (isReviewScreen) {
      return [
        { key: "Enter", action: t("footer.submit") },
        { key: "n", action: t("footer.back") },
      ];
    }

    // Custom input focused
    if (focusContext === "custom-input") {
      return [
        { key: "↑↓", action: t("footer.options") },
        { key: "←→", action: t("footer.cursor") },
        { key: "Tab/S+Tab", action: t("footer.questions") },
        { key: "Enter", action: t("footer.newline") },
        { key: "Esc", action: t("footer.reject") },
      ];
    }

    // Option focused
    if (focusContext === "option") {
      const bindings: Keybinding[] = [
        { key: "↑↓", action: t("footer.options") },
        { key: "←→", action: t("footer.questions") },
        { key: "Tab/S+Tab", action: t("footer.questions") },
      ];

      if (multiSelect) {
        bindings.push({ key: "Space", action: t("footer.toggle") });
      } else {
        bindings.push({ key: "Enter", action: t("footer.select") });
      }

      if (hasRecommendedOptions) {
        bindings.push({ key: "R", action: t("footer.recommended") });
      }

      // Ctrl+R shows when ANY question in session has recommended (not just current)
      if (hasAnyRecommendedInSession) {
        bindings.push({ key: "Ctrl+R", action: t("footer.quickSubmit") });
      }

      bindings.push({ key: "Ctrl+T", action: t("footer.theme") });
      bindings.push({ key: "Esc", action: t("footer.reject") });

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
