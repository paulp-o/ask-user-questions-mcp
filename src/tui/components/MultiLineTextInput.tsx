import { Box, Text, useInput } from "ink";
import React, { useState } from "react";
import { theme } from "../theme.js";

interface MultiLineTextInputProps {
  isFocused?: boolean;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  value: string;
}

/**
 * Multi-line text input component for Ink with cursor positioning
 * Supports left/right arrow keys for cursor movement
 * Shift+Enter for newlines, Enter to submit
 */
export const MultiLineTextInput: React.FC<MultiLineTextInputProps> = ({
  isFocused = true,
  onChange,
  onSubmit,
  placeholder = "Type your answer...",
  value,
}) => {
  const [cursorPosition, setCursorPosition] = useState(value.length);

  // Update cursor position when value changes externally
  React.useEffect(() => {
    if (cursorPosition > value.length) {
      setCursorPosition(value.length);
    }
  }, [value.length, cursorPosition]);

  useInput(
    (input, key) => {
      if (!isFocused) return;

      // Normalize Enter key sequences that may arrive as raw input ("\r"/"\n").
      // Prevent accidental carriage return insertion which causes line overwrite in terminals.
      if (input === "\r" || input === "\n") {
        if (key.shift) {
          const newValue = value.slice(0, cursorPosition) + "\n" + value.slice(cursorPosition);
          onChange(newValue);
          setCursorPosition(cursorPosition + 1);
        } else if (onSubmit) {
          onSubmit();
        }
        return;
      }

      // Shift+Enter: Add newline
      if (key.return && key.shift) {
        const newValue = value.slice(0, cursorPosition) + "\n" + value.slice(cursorPosition);
        onChange(newValue);
        setCursorPosition(cursorPosition + 1);
        return;
      }

      // Enter: Submit (empty input allowed)
      if (key.return) {
        if (onSubmit) {
          onSubmit();
        }
        return;
      }

      // Left arrow: Move cursor left
      if (key.leftArrow) {
        setCursorPosition(Math.max(0, cursorPosition - 1));
        return;
      }

      // Right arrow: Move cursor right
      if (key.rightArrow) {
        setCursorPosition(Math.min(value.length, cursorPosition + 1));
        return;
      }

      // Backspace: Remove character before cursor
      if (key.backspace || key.delete) {
        if (cursorPosition > 0) {
          const newValue = value.slice(0, cursorPosition - 1) + value.slice(cursorPosition);
          onChange(newValue);
          setCursorPosition(cursorPosition - 1);
        }
        return;
      }

      // Regular character input (insert at cursor)
      if (
        input &&
        !key.ctrl &&
        !key.meta &&
        !key.escape &&
        input !== "\r" &&
        input !== "\n"
      ) {
        const newValue = value.slice(0, cursorPosition) + input + value.slice(cursorPosition);
        onChange(newValue);
        setCursorPosition(cursorPosition + 1);
      }
    },
    { isActive: isFocused },
  );

  // Normalize any carriage returns that might already be present in value
  const normalizedValue = value.replace(/\r\n?/g, "\n");
  const hasContent = normalizedValue.length > 0;
  const lines = hasContent ? normalizedValue.split("\n") : [placeholder];

  // Calculate which line and position the cursor is on
  const cursorLineIndex = normalizedValue.slice(0, cursorPosition).split("\n").length - 1;
  const cursorLineStart = normalizedValue.split("\n").slice(0, cursorLineIndex).join("\n").length + (cursorLineIndex > 0 ? cursorLineIndex : 0);
  const cursorPositionInLine = cursorPosition - cursorLineStart;

  return (
    <Box flexDirection="column">
      {lines.map((line, index) => {
        const isCursorLine = isFocused && index === cursorLineIndex && hasContent;
        const isPlaceholder = !hasContent;
        const lineHasContent = line.length > 0;
        const displayText = lineHasContent ? line : isCursorLine ? "" : " ";

        if (isCursorLine) {
          // Split the line at cursor position
          const beforeCursor = line.slice(0, cursorPositionInLine);
          const afterCursor = line.slice(cursorPositionInLine);

          return (
            <Text key={index}>
              {beforeCursor}
              <Text color={theme.colors.focused} dimColor>
                ▌
              </Text>
              {afterCursor}
            </Text>
          );
        }

        return (
          <Text key={index} dimColor={isPlaceholder}>
            {displayText}
            {isFocused && index === lines.length - 1 && !hasContent && (
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
