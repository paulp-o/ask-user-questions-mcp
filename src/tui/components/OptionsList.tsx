import { Box, Text, useInput } from "ink";
import React, { useState } from "react";

import type { Option } from "../../session/types.js";

interface OptionsListProps {
  isFocused: boolean;
  onSelect: (label: string) => void;
  options: Option[];
  selectedOption?: string;
}

/**
 * OptionsList displays answer choices and handles arrow key navigation
 * Uses ↑↓ to navigate, Enter to select
 */
export const OptionsList: React.FC<OptionsListProps> = ({
  isFocused,
  onSelect,
  options,
  selectedOption,
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
    { isActive: isFocused },
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
              bold={isFocusedOption || isSelected}
              color={isFocusedOption ? "cyan" : isSelected ? "green" : "white"}
            >
              {indicator} {selectionMark} {option.label}
            </Text>
            {option.description && (
              <Text
                color={isFocusedOption ? "cyan" : undefined}
                dimColor={!isFocusedOption}
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
