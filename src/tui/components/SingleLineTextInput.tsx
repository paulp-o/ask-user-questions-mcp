import { Text, useInput } from "ink";
import React, { useRef, useState } from "react";
import { useTheme } from "../ThemeContext.js";

interface SingleLineTextInputProps {
  isFocused?: boolean;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  value: string;
}

export const SingleLineTextInput: React.FC<SingleLineTextInputProps> = ({
  isFocused = true,
  onChange,
  onSubmit,
  placeholder = "Type here...",
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

      if (key.return) {
        onSubmit?.();
        return;
      }

      // Left arrow: Move cursor left (accounting for CJK characters)
      if (key.leftArrow) {
        if (currentCursor > 0) {
          setCursorPosition(Math.max(0, currentCursor - 1));
        }
        return;
      }

      // Right arrow: Move cursor right (accounting for CJK characters)
      if (key.rightArrow) {
        const chars = [...currentValue];
        if (currentCursor < chars.length) {
          setCursorPosition(Math.min(chars.length, currentCursor + 1));
        }
        return;
      }

      // Backspace/Delete key handling
      // On macOS, backspace key sends \x7f which Ink interprets as key.delete
      // Following ink-text-input's approach: treat both key.backspace and key.delete
      // as backspace (delete character before cursor)
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
        !key.tab &&
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

  const chars = [...value];
  const hasContent = chars.length > 0;
  const displayText = hasContent ? value : placeholder;

  if (hasContent && isFocused) {
    // Split at cursor position using character array for CJK support
    const beforeCursor = chars.slice(0, cursorPosition).join("");
    const afterCursor = chars.slice(cursorPosition).join("");

    return (
      <Text>
        {beforeCursor}
        <Text color={theme.components.input.cursor}>▌</Text>
        {afterCursor}
      </Text>
    );
  }

  return (
    <Text
      color={!hasContent ? theme.components.input.placeholder : undefined}
      dimColor={!hasContent}
    >
      {displayText}
      {isFocused && !hasContent && (
        <Text color={theme.components.input.cursor}>▌</Text>
      )}
    </Text>
  );
};
