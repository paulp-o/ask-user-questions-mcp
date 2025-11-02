import { Box, Text, useInput } from "ink";
import React from "react";

interface MultiLineTextInputProps {
  isFocused?: boolean;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  value: string;
}

/**
 * Multi-line text input component for Ink
 * Append-only mode: Shift+Enter for newlines, Enter to submit
 * Note: No cursor positioning - text is append-only for simplicity
 */
export const MultiLineTextInput: React.FC<MultiLineTextInputProps> = ({
  isFocused = true,
  onChange,
  onSubmit,
  placeholder = "Type your answer...",
  value,
}) => {
  useInput(
    (input, key) => {
      if (!isFocused) return;

      // Shift+Enter: Add newline
      if (key.return && key.shift) {
        onChange(value + "\n");
        return;
      }

      // Enter: Submit
      if (key.return) {
        if (onSubmit) {
          onSubmit();
        }
        return;
      }

      // Backspace: Remove last character
      if (key.backspace || key.delete) {
        onChange(value.slice(0, -1));
        return;
      }

      // Regular character input (append)
      if (input && !key.ctrl && !key.meta && !key.escape) {
        onChange(value + input);
      }
    },
    { isActive: isFocused },
  );

  // Display lines
  const lines = value.split("\n");
  const hasContent = value.length > 0;

  return (
    <Box flexDirection="column">
      {hasContent ? (
        lines.map((line, index) => (
          <Text key={index}>{line || " "}</Text>
        ))
      ) : (
        <Text dimColor>{placeholder}</Text>
      )}
      {isFocused && (
        <Box marginTop={0.5}>
          <Text color="cyan" dimColor>
            ▌ {/* Cursor indicator */}
          </Text>
        </Box>
      )}
    </Box>
  );
};
