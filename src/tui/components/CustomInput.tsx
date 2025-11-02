import React from "react";
import { Box, Text } from "ink";
import TextInput from "ink-text-input";

interface CustomInputProps {
  value: string;
  onChange: (value: string) => void;
  isFocused: boolean;
}

/**
 * CustomInput allows users to type free-text answers
 * Uses Ink's TextInput component with visual focus indicator
 */
export const CustomInput: React.FC<CustomInputProps> = ({
  value,
  onChange,
  isFocused,
}) => {
  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={isFocused ? "cyan" : "gray"}
      padding={0.5}
      marginTop={1}
    >
      <Text dimColor={!isFocused}>
        {isFocused ? "→" : " "} Custom answer:{" "}
      </Text>
      <Box marginTop={0.5}>
        {isFocused ? (
          <TextInput
            value={value}
            onChange={onChange}
            placeholder="Type your answer here..."
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
