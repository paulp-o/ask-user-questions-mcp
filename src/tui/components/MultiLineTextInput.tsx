import { Box, Text, useInput } from "ink";
import React from "react";
import { theme } from "../theme.js";

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

      // Normalize Enter key sequences that may arrive as raw input ("\r"/"\n").
      // Prevent accidental carriage return insertion which causes line overwrite in terminals.
      if (input === "\r" || input === "\n") {
        if (key.shift) {
          onChange(value + "\n");
        } else if (onSubmit) {
          onSubmit();
        }
        return;
      }

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
      if (
        input &&
        !key.ctrl &&
        !key.meta &&
        !key.escape &&
        input !== "\r" &&
        input !== "\n"
      ) {
        onChange(value + input);
      }
    },
    { isActive: isFocused },
  );

  // Normalize any carriage returns that might already be present in value
  const normalizedValue = value.replace(/\r\n?/g, "\n");
  const hasContent = normalizedValue.length > 0;
  const lines = hasContent ? normalizedValue.split("\n") : [placeholder];

  return (
    <Box flexDirection="column">
      {lines.map((line, index) => {
        const isLastLine = index === lines.length - 1;
        const showCursor = isFocused && isLastLine;
        const isPlaceholder = !hasContent;
        const lineHasContent = line.length > 0;
        const displayText = lineHasContent ? line : showCursor ? "" : " ";

        return (
          <Text key={index} dimColor={isPlaceholder}>
            {displayText}
            {showCursor && (
              <Text color={theme.colors.focused} dimColor>
                ▌
              </Text>
            )}
          </Text>
        );
      })}
    </Box>
  );
};
