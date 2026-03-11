import { TextAttributes } from "@opentui/core";
import React, { useState } from "react";
import { useKeyboard } from "@opentui/react";

import { t } from "../../i18n/index.js";
import { useTheme } from "../ThemeProvider.js";
import { KEYS } from "../../tui/constants/keybindings.js";
import { SingleLineTextInput } from "./SingleLineTextInput.js";

interface ConfirmationDialogProps {
  message: string;
  onReject: (reason: string | null) => void;
  onCancel: () => void;
  onQuit: () => void;
}

/**
 * ConfirmationDialog shows a 3-option prompt for session rejection.
 * Options: Reject & inform AI, Cancel, or Quit CLI.
 * If user chooses to reject, shows a two-step flow to optionally collect rejection reason.
 */
export const ConfirmationDialog = ({
  message,
  onReject,
  onCancel,
  onQuit,
}: ConfirmationDialogProps): React.ReactNode => {
  const { theme } = useTheme();

  const [focusedIndex, setFocusedIndex] = useState(0);
  const [showReasonInput, setShowReasonInput] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const handleReasonSubmit = () => {
    onReject(rejectionReason.trim() || null);
  };

  const handleSkipReason = () => {
    onReject(null);
  };

  const options = [
    {
      key: "y",
      label: t("confirmation.rejectYes"),
      action: () => setShowReasonInput(true),
    },
    { key: "n", label: t("confirmation.rejectNo"), action: onCancel },
  ];

  useKeyboard((key) => {
    // If in reason input mode, handle Esc to skip
    if (showReasonInput) {
      if (key.name === "escape") {
        handleSkipReason();
      }
      return; // Let native input handle other keys
    }

    // Arrow key navigation
    if (key.name === "up") {
      setFocusedIndex((prev) => Math.max(0, prev - 1));
    }
    if (key.name === "down") {
      setFocusedIndex((prev) => Math.min(options.length - 1, prev + 1));
    }

    // Enter key - select focused option
    if (key.name === "return") {
      options[focusedIndex].action();
    }

    // Letter shortcuts
    if (KEYS.CONFIRM_YES.test(key.sequence || key.name)) {
      setShowReasonInput(true);
    }
    if (KEYS.CONFIRM_NO.test(key.sequence || key.name)) {
      onCancel();
    }

    // Esc key - same as quit
    if (key.name === "escape") {
      onQuit();
    }
  });

  // Step 2: Reason input screen
  if (showReasonInput) {
    return (
      <box
        style={{
          borderColor: theme.borders.warning,
          borderStyle: "rounded",
          flexDirection: "column",
          padding: 1,
        }}
      >
        <box style={{ marginBottom: 1 }}>
          <text style={{ attributes: TextAttributes.BOLD, fg: theme.colors.warning }}>
            {t("confirmation.rejectTitle")}
          </text>
        </box>
        <box style={{ marginBottom: 1 }}>
          <text style={{ attributes: TextAttributes.DIM }}>{t("confirmation.rejectMessage")}</text>
        </box>
        <box style={{ marginBottom: 1 }}>
          <SingleLineTextInput
            isFocused={true}
            onChange={setRejectionReason}
            onSubmit={handleReasonSubmit}
            placeholder="Type your reason here..."
            value={rejectionReason}
          />
        </box>
        <box style={{ marginTop: 1 }}>
          <text style={{ attributes: TextAttributes.DIM }}>
            {`Enter ${t("footer.submit")} | Esc ${t("footer.cancel")}`}
          </text>
        </box>
      </box>
    );
  }

  // Step 1: Confirmation options
  return (
    <box
      style={{
        borderColor: theme.borders.warning,
        borderStyle: "rounded",
        flexDirection: "column",
        padding: 1,
      }}
    >
      <box style={{ marginBottom: 1 }}>
        <text style={{ attributes: TextAttributes.BOLD, fg: theme.colors.warning }}>
          {message}
        </text>
      </box>
      {options.map((option, index) => {
        const isFocused = index === focusedIndex;
        return (
          <box key={index} style={{ marginTop: index > 0 ? 1 : 0 }}>
            <text
              style={{
                bg: isFocused
                  ? theme.components.options.focusedBg
                  : undefined,
                attributes: isFocused ? TextAttributes.BOLD : TextAttributes.NONE,
                fg: isFocused ? theme.colors.focused : theme.colors.text,
              }}
            >
              {`${isFocused ? "> " : "  "}${index + 1}. ${option.label} (${option.key})`}
            </text>
          </box>
        );
      })}
      <box style={{ marginTop: 1 }}>
        <text style={{ attributes: TextAttributes.DIM }}>{"\u2191\u2193 " + t("confirmation.keybindings")}</text>
      </box>
    </box>
  );
};