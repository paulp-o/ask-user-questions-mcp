import { Box, Text, useInput } from "ink";
import React, { useRef, useState } from "react";
import { t } from "../../i18n/index.js";
import { useTheme } from "../ThemeContext.js";
import { getVisualWidth, isWideChar } from "../utils/visualWidth.js";

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
  placeholder = t("input.multiLinePlaceholder"),
  value,
}) => {
  const { theme } = useTheme();
  // Initialize cursor at end of text (using character count for CJK support)
  const [cursorPosition, setCursorPosition] = useState([...value].length);

  // Use refs to avoid stale closures in useInput callback
  // This fixes missed keystrokes during fast typing
  const valueRef = useRef(value);
  const cursorRef = useRef(cursorPosition);

  // Keep refs in sync with state
  React.useEffect(() => {
    valueRef.current = value;
  }, [value]);

  React.useEffect(() => {
    cursorRef.current = cursorPosition;
  }, [cursorPosition]);

  // Update cursor position when value changes externally
  // Use character count (spread into array) for proper CJK handling
  React.useEffect(() => {
    const charCount = [...value].length;
    if (cursorPosition > charCount) {
      setCursorPosition(charCount);
    }
  }, [value, cursorPosition]);

  useInput(
    (input, key) => {
      if (!isFocused) return;

      // Use refs to get current values (avoids stale closures)
      const currentValue = valueRef.current;
      const currentCursor = cursorRef.current;

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
        const chars = [...currentValue];
        const before = chars.slice(0, currentCursor).join("");
        const after = chars.slice(currentCursor).join("");
        const newValue = before + "\n" + after;
        onChange(newValue);
        setCursorPosition(currentCursor + 1);
        return;
      }

      // Left arrow: Move cursor left (accounting for CJK characters)
      if (key.leftArrow) {
        if (currentCursor > 0) {
          // Move back by one character (which may be wide)
          const chars = [...currentValue];
          const newCursor = Math.max(0, currentCursor - 1);
          setCursorPosition(newCursor);
        }
        return;
      }

      // Right arrow: Move cursor right (accounting for CJK characters)
      if (key.rightArrow) {
        const chars = [...currentValue];
        if (currentCursor < chars.length) {
          // Move forward by one character (which may be wide)
          setCursorPosition(Math.min(chars.length, currentCursor + 1));
        }
        return;
      }

      // Backspace/Delete key handling
      // Following ink-text-input's approach: treat both key.backspace and key.delete
      // as backspace (delete character before cursor). Forward-delete is not reliably
      // detectable across terminals.
      if (key.backspace || key.delete) {
        if (currentCursor > 0) {
          const chars = [...currentValue];
          const before = chars.slice(0, currentCursor - 1).join("");
          const after = chars.slice(currentCursor).join("");
          onChange(before + after);
          setCursorPosition(currentCursor - 1);
        }
        return;
      }

      // Regular character input (insert at cursor)
      // Also handles paste events (input.length > 1)
      if (
        input &&
        !key.ctrl &&
        !key.meta &&
        !key.escape &&
        input !== "\r" &&
        input !== "\n"
      ) {
        const chars = [...currentValue];
        const before = chars.slice(0, currentCursor).join("");
        const after = chars.slice(currentCursor).join("");
        const newValue = before + input + after;
        onChange(newValue);

        // Move cursor to end of inserted content
        // For paste events (input.length > 1), this moves cursor to end of pasted text
        const insertedChars = [...input].length;
        setCursorPosition(currentCursor + insertedChars);
      }
    },
    { isActive: isFocused },
  );

  const normalizedValue = value.replace(/\r\n?/g, "\n");
  const chars = [...normalizedValue];
  const hasContent = chars.length > 0;
  const lines = hasContent ? normalizedValue.split("\n") : [placeholder];

  // Calculate cursor line and position using character arrays for CJK support
  const charsBeforeCursor = chars.slice(0, cursorPosition).join("");
  const cursorLineIndex = charsBeforeCursor.split("\n").length - 1;

  // Find the start of the current line in character indices
  let cursorLineStart = 0;
  for (let i = cursorPosition - 1; i >= 0; i--) {
    if (chars[i] === "\n") {
      cursorLineStart = i + 1;
      break;
    }
  }

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
          // Split the line at cursor position using character array for CJK support
          const lineChars = [...line];
          const beforeCursor = lineChars
            .slice(0, cursorPositionInLine)
            .join("");
          const afterCursor = lineChars.slice(cursorPositionInLine).join("");

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
