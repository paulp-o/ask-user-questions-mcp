import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import type { Option } from "../../session/types.js";

interface OptionsListProps {
  options: Option[];
  onSelect: (label: string) => void;
  selectedOption?: string;
  isFocused: boolean;
}

/**
 * OptionsList displays answer choices and handles arrow key navigation
 * Uses ↑↓ to navigate, Enter to select
 */
export const OptionsList: React.FC<OptionsListProps> = ({
  options,
  onSelect,
  selectedOption,
  isFocused,
}) => {
  const [focusedIndex, setFocusedIndex] = useState(0);

  useInput(
    (input, key) => {
      if (!isFocused) return;

      if (key.upArrow) {
        setFocusedIndex((prev) => Math.max(0, prev - 1));
      }
      if (key.downArrow) {
        setFocusedIndex((prev) => Math.min(options.length - 1, prev + 1));
      }
      if (key.return) {
        onSelect(options[focusedIndex].label);
      }
    },
    { isActive: isFocused }
  );

  return (
    <Box flexDirection="column">
      {options.map((option, index) => {
        const isFocusedOption = isFocused && index === focusedIndex;
        const isSelected = option.label === selectedOption;

        // Visual indicators
        const indicator = isFocusedOption ? "→" : " ";
        const selectionMark = isSelected ? "●" : "○";

        return (
          <Box key={index} marginTop={index > 0 ? 0.5 : 0}>
            <Text
              color={isFocusedOption ? "cyan" : isSelected ? "green" : "white"}
              bold={isFocusedOption || isSelected}
            >
              {indicator} {selectionMark} {option.label}
            </Text>
            {option.description && (
              <Text
                dimColor={!isFocusedOption}
                color={isFocusedOption ? "cyan" : undefined}
              >
                {" "}
                — {option.description}
              </Text>
            )}
          </Box>
        );
      })}
    </Box>
  );
};
