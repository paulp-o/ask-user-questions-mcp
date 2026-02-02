import { Box, Text, useInput } from "ink";
import React, { useState } from "react";
import { useTheme } from "../ThemeContext.js";

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
 * Enter for newlines, Tab to submit (portable across terminals)
 */
export const MultiLineTextInput: React.FC<MultiLineTextInputProps> = ({
  isFocused = true,
  onChange,
  onSubmit,
  placeholder = "Type your answer...",
  value,
}) => {
  const { theme } = useTheme();
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

      // Tab: Submit (also triggers question navigation via parent)
      if (key.tab && !key.shift) {
        onSubmit?.();
        return;
      }

      // Shift+Tab: Let parent handle for previous question navigation
      if (key.tab && key.shift) {
        return;
      }

      // Enter: Always add newline (portable behavior)
      if (input === "\r" || input === "\n" || key.return) {
        const newValue =
          value.slice(0, cursorPosition) + "\n" + value.slice(cursorPosition);
        onChange(newValue);
        setCursorPosition(cursorPosition + 1);
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
          const newValue =
            value.slice(0, cursorPosition - 1) + value.slice(cursorPosition);
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
        const newValue =
          value.slice(0, cursorPosition) + input + value.slice(cursorPosition);
        onChange(newValue);
        setCursorPosition(cursorPosition + 1);
      }
    },
    { isActive: isFocused },
  );

  const normalizedValue = value.replace(/\r\n?/g, "\n");
  const hasContent = normalizedValue.length > 0;
  const lines = hasContent ? normalizedValue.split("\n") : [placeholder];

  const cursorLineIndex =
    normalizedValue.slice(0, cursorPosition).split("\n").length - 1;

  const cursorLineStart =
    normalizedValue.lastIndexOf("\n", cursorPosition - 1) + 1;

  const cursorPositionInLine = cursorPosition - cursorLineStart;

  return (
    <Box flexDirection="column">
      {lines.map((line, index) => {
        const isCursorLine =
          isFocused && index === cursorLineIndex && hasContent;
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
              <Text color={theme.components.input.cursor}>▌</Text>
              {afterCursor}
            </Text>
          );
        }

        return (
          <Text
            key={index}
            color={
              isPlaceholder ? theme.components.input.placeholder : undefined
            }
            dimColor={isPlaceholder}
          >
            {displayText}
            {isFocused && index === lines.length - 1 && !hasContent && (
              <Text color={theme.components.input.cursor}>▌</Text>
            )}
          </Text>
        );
      })}
    </Box>
  );
};
