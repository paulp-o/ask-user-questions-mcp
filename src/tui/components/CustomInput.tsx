import { Box, Text } from "ink";
import TextInput from "ink-text-input";
import React from "react";

import { t } from "../../i18n/index.js";
import { useTheme } from "../ThemeContext.js";

interface CustomInputProps {
  isFocused: boolean;
  onChange: (value: string) => void;
  value: string;
}

/**
 * CustomInput allows users to type free-text answers
 * Uses Ink's TextInput component with visual focus indicator
 */
export const CustomInput: React.FC<CustomInputProps> = ({
  isFocused,
  onChange,
  value,
}) => {
  const { theme } = useTheme();
  return (
    <Box
      borderColor={
        isFocused
          ? theme.components.input.borderFocused
          : theme.components.input.border
      }
      borderStyle="round"
      flexDirection="column"
      marginTop={1}
      padding={0.5}
    >
      <Text color={theme.colors.textDim} dimColor={!isFocused}>
        {isFocused ? ">" : " "} {t("input.customAnswerLabel")}
      </Text>
      <Box marginTop={0.5}>
        {isFocused ? (
          <TextInput
            onChange={onChange}
            placeholder="Type your answer here..."
            value={value}
          />
        ) : (
          <Text color={value ? theme.colors.text : theme.colors.textDim}>
            {value || t("input.customAnswerHint")}
          </Text>
        )}
      </Box>
    </Box>
  );
};
