import { Box, Text, useInput } from "ink";
import React, { useState } from "react";
import { theme } from "../theme.js";
import { MultiLineTextInput } from "./MultiLineTextInput.js";

interface ConfirmationDialogProps {
  message: string;
  onReject: (reason: string | null) => void;
  onCancel: () => void;
  onQuit: () => void;
}

/**
 * ConfirmationDialog shows a 3-option prompt for session rejection
 * Options: Reject & inform AI, Cancel, or Quit CLI
 * If user chooses to reject, shows a two-step flow to optionally collect rejection reason
 */
export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  message,
  onReject,
  onCancel,
  onQuit,
}) => {
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
      label: "Yes, inform the AI that I rejected this question set",
      action: () => setShowReasonInput(true),
    },
    { key: "n", label: "No, go back to answering questions", action: onCancel },
  ];

  useInput((input, key) => {
    // If in reason input mode, handle Esc to skip
    if (showReasonInput) {
      if (key.escape) {
        handleSkipReason();
      }
      return; // Let MultiLineTextInput handle other keys
    }

    // Arrow key navigation
    if (key.upArrow) {
      setFocusedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
    }
    if (key.downArrow) {
      setFocusedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
    }

    // Enter key - select focused option
    if (key.return) {
      options[focusedIndex].action();
    }

    // Letter shortcuts
    if (input === "y" || input === "Y") {
      setShowReasonInput(true);
    }
    if (input === "n" || input === "N") {
      onCancel();
    }

    // Esc key - same as quit
    if (key.escape) {
      onQuit();
    }
  });

  // Step 2: Reason input screen
  if (showReasonInput) {
    return (
      <Box
        borderColor={theme.borders.warning}
        borderStyle="single"
        flexDirection="column"
        padding={1}
      >
        <Box marginBottom={1}>
          <Text bold color={theme.colors.warning}>
            Why are you rejecting this question set?
          </Text>
        </Box>
        <Box marginBottom={1}>
          <Text dimColor>(Optional - helps the AI improve)</Text>
        </Box>
        <Box marginBottom={1}>
          <MultiLineTextInput
            isFocused={true}
            onChange={setRejectionReason}
            onSubmit={handleReasonSubmit}
            placeholder="Type your reason here..."
            value={rejectionReason}
          />
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Enter Submit | Shift+Enter Newline | Esc Skip</Text>
        </Box>
      </Box>
    );
  }

  // Step 1: Confirmation options
  return (
    <Box
      borderColor={theme.borders.warning}
      borderStyle="single"
      flexDirection="column"
      padding={1}
    >
      <Box marginBottom={1}>
        <Text bold color={theme.colors.warning}>
          {message}
        </Text>
      </Box>
      {options.map((option, index) => {
        const isFocused = index === focusedIndex;
        return (
          <Box key={index} marginTop={index > 0 ? 0.5 : 0}>
            <Text
              bold={isFocused}
              color={isFocused ? theme.colors.focused : theme.colors.text}
            >
              {isFocused ? "→ " : "  "}
              {index + 1}. {option.label} ({option.key})
            </Text>
          </Box>
        );
      })}
      <Box marginTop={1}>
        <Text dimColor>
          ↑↓ Navigate | Enter Select | y/n Shortcuts | Esc Quit
        </Text>
      </Box>
    </Box>
  );
};
