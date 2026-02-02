import { Box, Text, useInput } from "ink";
import React, { useState } from "react";
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

  React.useEffect(() => {
    if (cursorPosition > value.length) {
      setCursorPosition(value.length);
    }
  }, [value.length, cursorPosition]);

  useInput(
    (input, key) => {
      if (!isFocused) return;

      if (key.return) {
        onSubmit?.();
        return;
      }

      if (key.leftArrow) {
        setCursorPosition(Math.max(0, cursorPosition - 1));
        return;
      }

      if (key.rightArrow) {
        setCursorPosition(Math.min(value.length, cursorPosition + 1));
        return;
      }

      if (key.backspace || key.delete) {
        if (cursorPosition > 0) {
          const newValue =
            value.slice(0, cursorPosition - 1) + value.slice(cursorPosition);
          onChange(newValue);
          setCursorPosition(cursorPosition - 1);
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
          value.slice(0, cursorPosition) + input + value.slice(cursorPosition);
        onChange(newValue);
        setCursorPosition(cursorPosition + 1);
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
