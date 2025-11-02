import { Box, Text } from "ink";
import TextInput from "ink-text-input";
import React from "react";

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
  return (
    <Box
      borderColor={isFocused ? "cyan" : "gray"}
      borderStyle="single"
      flexDirection="column"
      marginTop={1}
      padding={0.5}
    >
      <Text dimColor={!isFocused}>{isFocused ? "→" : " "} Custom answer: </Text>
      <Box marginTop={0.5}>
        {isFocused ? (
          <TextInput
            onChange={onChange}
            placeholder="Type your answer here..."
            value={value}
          />
        ) : (
          <Text color={value ? "white" : "gray"}>
            {value || "(Press Tab to enter custom answer)"}
          </Text>
        )}
      </Box>
    </Box>
  );
};
