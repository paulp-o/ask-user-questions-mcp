import { Box, Newline, Text, useInput } from "ink";
import React, { useState } from "react";

import type { Option } from "../../session/types.js";

import { theme } from "../theme.js";
import { MultiLineTextInput } from "./MultiLineTextInput.js";

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
  const customLines = customValue.replace(/\r\n?/g, "\n").split("\n");

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
        // Don't handle Return when custom input is focused - MultiLineTextInput handles it
        if (isCustomInputFocused) {
          return;
        }

        // On regular option: select and advance
        onSelect(options[focusedIndex].label);
        if (onAdvance) {
          onAdvance();
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
          <Box key={index} flexDirection="column" marginTop={0}>
            <Text
              bold={isFocusedOption || isSelected}
              color={
                isFocusedOption
                  ? theme.components.options.focused
                  : isSelected
                    ? theme.components.options.selected
                    : theme.components.options.default
              }
            >
              {indicator} {selectionMark} {option.label}
            </Text>
            {option.description && (
              <Box marginLeft={4}>
                <Text
                  color={isFocusedOption ? theme.components.options.focused : undefined}
                  dimColor={!isFocusedOption}
                >
                  {option.description}
                </Text>
              </Box>
            )}
          </Box>
        );
      })}

      {/* Custom input option */}
      {showCustomInput && (
        <Box marginTop={0}>
          <Box flexDirection="column">
            <Text
              bold={isCustomInputFocused}
              color={
                isCustomInputFocused
                  ? theme.components.options.focused
                  : theme.components.options.default
              }
            >
              {isCustomInputFocused ? "→" : " "} {customValue ? "●" : "○"} Other
              (custom answer)
            </Text>
            {isCustomInputFocused && onCustomChange && (
              <Box marginLeft={2} marginTop={0.5}>
                <MultiLineTextInput
                  isFocused={true}
                  onChange={onCustomChange}
                  placeholder="Type your answer... (Shift+Enter for newline)"
                  value={customValue}
                />
              </Box>
            )}
            {!isCustomInputFocused && customValue && (
              <Box marginLeft={2} marginTop={0.5}>
                <Text dimColor>
                  {customLines.map((line, idx) => (
                    <React.Fragment key={idx}>
                      {idx === 0 ? "→ " : "  "}
                      {line || " "}
                      {idx < customLines.length - 1 && <Newline />}
                    </React.Fragment>
                  ))}
                </Text>
              </Box>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
};
