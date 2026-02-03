import { Box, Text, useInput } from "ink";
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
  const [cursorPosition, setCursorPosition] = useState(value.length);

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

  React.useEffect(() => {
    if (cursorPosition > value.length) {
      setCursorPosition(value.length);
    }
  }, [value.length, cursorPosition]);

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

      if (key.leftArrow) {
        setCursorPosition(Math.max(0, currentCursor - 1));
        return;
      }

      if (key.rightArrow) {
        setCursorPosition(Math.min(currentValue.length, currentCursor + 1));
        return;
      }

      if (key.backspace || key.delete) {
        if (currentCursor > 0) {
          const newValue =
            currentValue.slice(0, currentCursor - 1) +
            currentValue.slice(currentCursor);
          onChange(newValue);
          setCursorPosition(currentCursor - 1);
        }
        return;
      }

      if (
        input &&
        !key.ctrl &&
        !key.meta &&
        !key.escape &&
        !key.tab &&
        input !== "\r" &&
        input !== "\n"
      ) {
        const newValue =
          currentValue.slice(0, currentCursor) +
          input +
          currentValue.slice(currentCursor);
        onChange(newValue);
        setCursorPosition(currentCursor + 1);
      }
    },
    { isActive: isFocused },
  );

  const hasContent = value.length > 0;
  const displayText = hasContent ? value : placeholder;

  if (hasContent && isFocused) {
    const beforeCursor = value.slice(0, cursorPosition);
    const afterCursor = value.slice(cursorPosition);

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
