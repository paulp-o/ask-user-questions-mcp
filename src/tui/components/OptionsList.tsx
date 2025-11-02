import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import React, { useState } from "react";

import type { Option } from "../../session/types.js";

interface OptionsListProps {
  isFocused: boolean;
  onSelect: (label: string) => void;
  options: Option[];
  selectedOption?: string;
  // Custom input support
  showCustomInput?: boolean;
  customValue?: string;
  onCustomChange?: (value: string) => void;
  // Auto-advance support
  onAdvance?: () => void;
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
  showCustomInput = false,
  customValue = "",
  onCustomChange,
  onAdvance,
}) => {
  const [focusedIndex, setFocusedIndex] = useState(0);

  // Calculate max index: include custom input option if enabled
  const maxIndex = showCustomInput ? options.length : options.length - 1;
  const isCustomInputFocused = showCustomInput && focusedIndex === options.length;

  useInput(
    (input, key) => {
      if (!isFocused) return;

      if (key.upArrow) {
        setFocusedIndex((prev) => Math.max(0, prev - 1));
      }
      if (key.downArrow) {
        setFocusedIndex((prev) => Math.min(maxIndex, prev + 1));
      }
      if (key.return) {
        if (isCustomInputFocused) {
          // On custom input: submit text and advance
          if (customValue && onAdvance) {
            onAdvance();
          }
        } else {
          // On regular option: select and advance
          onSelect(options[focusedIndex].label);
          if (onAdvance) {
            onAdvance();
          }
        }
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

      {/* Custom input option */}
      {showCustomInput && (
        <Box marginTop={1}>
          <Box flexDirection="column">
            <Text
              bold={isCustomInputFocused}
              color={isCustomInputFocused ? "cyan" : "white"}
            >
              {isCustomInputFocused ? "→" : " "} {customValue ? "●" : "○"} Other
              (custom answer)
            </Text>
            {isCustomInputFocused && onCustomChange && (
              <Box
                borderColor="cyan"
                borderStyle="single"
                marginTop={0.5}
                padding={0.5}
              >
                <TextInput
                  onChange={onCustomChange}
                  placeholder="Type your answer..."
                  value={customValue}
                />
              </Box>
            )}
            {!isCustomInputFocused && customValue && (
              <Box marginLeft={2} marginTop={0.5}>
                <Text dimColor>→ {customValue}</Text>
              </Box>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
};
