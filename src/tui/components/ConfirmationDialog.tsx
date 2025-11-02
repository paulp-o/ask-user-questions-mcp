import { Box, Text, useInput } from "ink";
import React, { useState } from "react";

interface ConfirmationDialogProps {
  message: string;
  onReject: () => void;
  onCancel: () => void;
  onQuit: () => void;
}

/**
 * ConfirmationDialog shows a 3-option prompt for session rejection
 * Options: Reject & inform AI, Cancel, or Quit CLI
 */
export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  message,
  onReject,
  onCancel,
  onQuit,
}) => {
  const [focusedIndex, setFocusedIndex] = useState(0);

  const options = [
    { key: "y", label: "Yes, inform the AI that I rejected this question set", action: onReject },
    { key: "n", label: "No, go back to answering questions", action: onCancel },
    { key: "q", label: "I'm just trying to quit the CLI, I'll answer later", action: onQuit },
  ];

  useInput((input, key) => {
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
      onReject();
    }
    if (input === "n" || input === "N") {
      onCancel();
    }
    if (input === "q" || input === "Q") {
      onQuit();
    }

    // Esc key - same as quit
    if (key.escape) {
      onQuit();
    }
  });

  return (
    <Box
      borderColor="yellow"
      borderStyle="single"
      flexDirection="column"
      padding={1}
    >
      <Box marginBottom={1}>
        <Text bold color="yellow">
          {message}
        </Text>
      </Box>
      {options.map((option, index) => {
        const isFocused = index === focusedIndex;
        return (
          <Box key={index} marginTop={index > 0 ? 0.5 : 0}>
            <Text
              bold={isFocused}
              color={isFocused ? "cyan" : "white"}
            >
              {isFocused ? "→ " : "  "}
              {index + 1}. {option.label} ({option.key})
            </Text>
          </Box>
        );
      })}
      <Box marginTop={1}>
        <Text dimColor>↑↓ Navigate | Enter Select | y/n/q Shortcuts</Text>
      </Box>
    </Box>
  );
};
