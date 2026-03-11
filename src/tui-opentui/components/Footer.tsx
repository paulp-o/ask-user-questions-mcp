import React, { useEffect, useState } from "react";

import { t } from "../../i18n/index.js";
import { useTheme } from "../ThemeProvider.js";
import { KEY_LABELS } from "../../tui/constants/keybindings.js";

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

interface FooterProps {
  focusContext: "option" | "custom-input" | "elaborate-input";
  multiSelect: boolean;
  isReviewScreen?: boolean;
  showSessionSwitching?: boolean;
  customInputValue?: string;
  /** True if CURRENT question has recommended options (for R key visibility) */
  hasRecommendedOptions?: boolean;
  /** True if ANY question in the session has recommended options (for Ctrl+R visibility) */
  hasAnyRecommendedInSession?: boolean;
  /** True when submitting answers (shows spinner) */
  isSubmitting?: boolean;
  /** True when an update is available */
  hasUpdate?: boolean;
}

type Keybinding = { key: string; action: string };

/**
 * Footer component — displays context-aware keybinding hints.
 * Shows different shortcuts based on current focus context and question type.
 */
export const Footer = ({
  focusContext,
  multiSelect,
  isReviewScreen = false,
  showSessionSwitching = false,
  customInputValue: _customInputValue = "",
  hasRecommendedOptions = false,
  hasAnyRecommendedInSession = false,
  isSubmitting = false,
  hasUpdate = false,
}: FooterProps): React.ReactNode => {
  const { theme } = useTheme();
  const [spinnerFrame, setSpinnerFrame] = useState(0);

  // Animate spinner when submitting
  useEffect(() => {
    if (!isSubmitting) return;
    const interval = setInterval(() => {
      setSpinnerFrame((prev) => (prev + 1) % SPINNER_FRAMES.length);
    }, 80);
    return () => clearInterval(interval);
  }, [isSubmitting]);

  const getKeybindings = (): Keybinding[] => {
    // Review screen mode
    if (isReviewScreen) {
      return [
        { key: KEY_LABELS.SUBMIT, action: t("footer.submit") },
        { key: KEY_LABELS.BACK, action: t("footer.back") },
      ];
    }

    // Custom input focused
    if (focusContext === "custom-input") {
      return [
        { key: KEY_LABELS.NAVIGATE_OPTIONS, action: t("footer.options") },
        { key: KEY_LABELS.CURSOR, action: t("footer.cursor") },
        { key: KEY_LABELS.NAVIGATE_QUESTIONS_TAB, action: t("footer.questions") },
        { key: KEY_LABELS.NEWLINE, action: t("footer.newline") },
        { key: KEY_LABELS.REJECT, action: t("footer.reject") },
      ];
    }

    // Elaborate input focused (Enter skips, not newline)
    if (focusContext === "elaborate-input") {
      return [
        { key: KEY_LABELS.NAVIGATE_OPTIONS, action: t("footer.options") },
        { key: KEY_LABELS.CURSOR, action: t("footer.cursor") },
        { key: "Enter/Tab", action: t("footer.next") },
        { key: KEY_LABELS.REJECT, action: t("footer.reject") },
      ];
    }

    // Option focused
    if (focusContext === "option") {
      const bindings: Keybinding[] = [
        { key: KEY_LABELS.NAVIGATE_OPTIONS, action: t("footer.options") },
        { key: KEY_LABELS.NAVIGATE_QUESTIONS, action: t("footer.questions") },
        { key: KEY_LABELS.NAVIGATE_QUESTIONS_TAB, action: t("footer.questions") },
      ];

      if (multiSelect) {
        bindings.push({ key: KEY_LABELS.SELECT, action: t("footer.toggle") });
        bindings.push({ key: KEY_LABELS.NEXT, action: t("footer.next") });
      } else {
        bindings.push({ key: KEY_LABELS.SELECT, action: t("footer.select") });
        bindings.push({ key: KEY_LABELS.SELECT_NEXT, action: t("footer.selectNext") });
      }

      if (hasRecommendedOptions) {
        bindings.push({ key: KEY_LABELS.RECOMMEND, action: t("footer.recommended") });
      }

      // Ctrl+R shows when ANY question in session has recommended (not just current)
      if (hasAnyRecommendedInSession) {
        bindings.push({ key: KEY_LABELS.QUICK_SUBMIT, action: t("footer.quickSubmit") });
      }

      if (showSessionSwitching) {
        bindings.push({ key: KEY_LABELS.SESSION_SWITCH, action: t("footer.sessions") });
        bindings.push({ key: "1-9", action: t("footer.jump") });
        bindings.push({ key: KEY_LABELS.SESSION_LIST, action: t("footer.list") });
      }

      bindings.push({ key: KEY_LABELS.THEME, action: t("footer.theme") });

      if (hasUpdate) {
        bindings.push({ key: KEY_LABELS.UPDATE, action: "Update" });
      }
      bindings.push({ key: KEY_LABELS.REJECT, action: t("footer.reject") });

      return bindings;
    }

    return [];
  };

  const keybindings = getKeybindings();

  return (
    <box
      style={{ paddingLeft: 2, paddingRight: 2, flexDirection: "row", flexWrap: "wrap", border: true, borderStyle: "rounded", borderColor: theme.colors.surface }}
    >
      {keybindings.map((binding, idx) => (
        <box key={idx} style={{ paddingRight: 2 }}>
          <text
            style={{
              bg: theme.components.footer.keyBg,
              fg: theme.components.footer.keyFg,
              bold: true,
            }}
          >
            {` ${binding.key} `}
          </text>
          <text style={{ fg: theme.components.footer.action, dim: true }}>
            {` ${binding.action}`}
          </text>
          {isSubmitting && binding.key === "Enter" && isReviewScreen ? (
            <text style={{ fg: theme.colors.pending, bold: true }}>
              {` ${SPINNER_FRAMES[spinnerFrame]}`}
            </text>
          ) : null}
        </box>
      ))}
    </box>
  );
};
