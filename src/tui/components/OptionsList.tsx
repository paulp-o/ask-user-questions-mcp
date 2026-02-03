import { Box, Newline, Text, useInput, useStdout } from "ink";
import React, { useEffect, useState } from "react";

import type { Option } from "../../session/types.js";

import { useTheme } from "../ThemeContext.js";
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
  // Multi-select support
  multiSelect?: boolean;
  onToggle?: (label: string) => void;
  selectedOptions?: string[];
  // Focus context tracking
  onFocusContextChange?: (context: "option" | "custom-input") => void;
  // Recommended option detection callback
  onRecommendedDetected?: (hasRecommended: boolean) => void;
  // Focus reset support
  questionKey?: string | number;
  // Config-based auto-select
  autoSelectRecommended?: boolean;
}

/**
 * Check if an option label contains a recommended indicator
 * Supports: (recommended), [recommended], (추천), [추천] (case-insensitive)
 */
const isRecommendedOption = (label: string): boolean => {
  const lowerLabel = label.toLowerCase();
  return (
    lowerLabel.includes("(recommend)") ||
    lowerLabel.includes("[recommend]") ||
    lowerLabel.includes("(추천)") ||
    lowerLabel.includes("[추천]")
  );
};

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
  multiSelect = false,
  onToggle,
  selectedOptions = [],
  onFocusContextChange,
  onRecommendedDetected,
  questionKey,
  autoSelectRecommended = true,
}) => {
  const { theme } = useTheme();
  const [focusedIndex, setFocusedIndex] = useState(0);
  const { stdout } = useStdout();
  const columns = stdout?.columns ?? 80;
  const rowWidth = Math.max(20, columns - 2);

  const fitRow = (text: string) => {
    if (text.length >= rowWidth)
      return text.slice(0, Math.max(0, rowWidth - 1)) + "…";
    return text + " ".repeat(rowWidth - text.length);
  };

  // Calculate max index: include custom input option if enabled
  const maxIndex = showCustomInput ? options.length : options.length - 1;
  const isCustomInputFocused =
    showCustomInput && focusedIndex === options.length;
  const customLines = customValue.replace(/\r\n?/g, "\n").split("\n");

  // Track and emit focus context changes
  useEffect(() => {
    const newContext: "option" | "custom-input" = isCustomInputFocused
      ? "custom-input"
      : "option";
    onFocusContextChange?.(newContext);
  }, [focusedIndex, isCustomInputFocused, onFocusContextChange]);

  // Reset focus when question changes
  useEffect(() => {
    setFocusedIndex(0);
  }, [questionKey]);

  // Auto-select recommended options on mount
  useEffect(() => {
    const recommendedOptions = options.filter((opt) =>
      isRecommendedOption(opt.label),
    );
    const hasRecommended = recommendedOptions.length > 0;

    // Notify parent about recommended options
    onRecommendedDetected?.(hasRecommended);

    // Only auto-select if no option is already selected and autoSelectRecommended is enabled
    if (hasRecommended && autoSelectRecommended) {
      if (multiSelect) {
        // For multi-select: auto-select all recommended options if none selected
        const hasAnySelection = selectedOptions && selectedOptions.length > 0;
        if (!hasAnySelection) {
          recommendedOptions.forEach((opt) => {
            onToggle?.(opt.label);
          });
        }
      } else {
        // For single-select: auto-select first recommended option if none selected
        if (!selectedOption) {
          const firstRecommended = recommendedOptions[0];
          if (firstRecommended) {
            onSelect(firstRecommended.label);
          }
        }
      }
    }
  }, []); // Run only on mount

  useInput(
    (input, key) => {
      if (!isFocused) return;

      // Handle up/down navigation even when custom input is focused
      if (key.upArrow) {
        setFocusedIndex((prev) => Math.max(0, prev - 1));
        return;
      }

      if (key.downArrow) {
        setFocusedIndex((prev) => Math.min(maxIndex, prev + 1));
        return;
      }

      // When custom input is focused, only handle escape to exit, let MultiLineTextInput handle other keys
      if (isCustomInputFocused) {
        if (key.escape) {
          // Escape: Exit custom input mode and go back to option navigation
          setFocusedIndex(options.length - 1); // Focus on last option
        }
        return;
      }

      if (multiSelect) {
        // Multi-select mode
        if (input === " ") {
          // Spacebar: Toggle selection WITHOUT advancing
          if (!isCustomInputFocused) {
            onToggle?.(options[focusedIndex].label);
          }
        }

        if (key.return) {
          // Enter: Advance to next question (don't toggle)
          // Note: Tab is handled globally in StepperView for question navigation
          if (!isCustomInputFocused && onAdvance) {
            onAdvance();
          }
        }
      } else {
        // Single-select mode
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

        // Tab is handled globally in StepperView for question navigation
      }
    },
    { isActive: isFocused },
  );

  return (
    <Box flexDirection="column">
      {options.map((option, index) => {
        const isFocusedOption = isFocused && index === focusedIndex;
        const isRecommended = isRecommendedOption(option.label);

        // Different icons for single vs multi-select
        const isSelected = multiSelect
          ? selectedOptions?.includes(option.label) || false
          : selectedOption === option.label;

        const selectionMark = multiSelect
          ? isSelected
            ? "[x]"
            : "[ ]"
          : isSelected
            ? "(*)"
            : "( )";

        const rowBg = isFocusedOption
          ? theme.components.options.focusedBg
          : isSelected
            ? theme.components.options.selectedBg
            : undefined;

        const rowColor = isFocusedOption
          ? theme.components.options.focused
          : isSelected
            ? theme.components.options.selected
            : theme.components.options.default;

        const starSuffix = isRecommended ? " ★" : "";
        const mainLine = `${isFocusedOption ? ">" : " "} ${selectionMark} ${option.label}${starSuffix}`;

        return (
          <Box key={index} flexDirection="column">
            <Text
              backgroundColor={rowBg}
              bold={isFocusedOption || isSelected}
              color={rowColor}
            >
              {fitRow(mainLine)}
            </Text>
            {option.description && (
              <Text
                backgroundColor={
                  isFocusedOption
                    ? theme.components.options.focusedBg
                    : undefined
                }
                color={theme.components.options.description}
                dimColor={!isFocusedOption}
              >
                {fitRow(`   ${option.description}`)}
              </Text>
            )}
          </Box>
        );
      })}

      {/* Custom input option */}
      {showCustomInput && (
        <Box marginTop={0}>
          <Box flexDirection="column">
            {(() => {
              const isSelected = customValue.trim().length > 0;
              const selectionMark = isSelected ? "(*)" : "( )";
              const rowBg = isCustomInputFocused
                ? theme.components.options.focusedBg
                : isSelected
                  ? theme.components.options.selectedBg
                  : undefined;
              const rowColor = isCustomInputFocused
                ? theme.components.options.focused
                : isSelected
                  ? theme.components.options.selected
                  : theme.components.options.default;
              const mainLine = `${isCustomInputFocused ? ">" : " "} ${selectionMark} Other (custom)`;

              return (
                <Text
                  backgroundColor={rowBg}
                  bold={isCustomInputFocused || isSelected}
                  color={rowColor}
                >
                  {fitRow(mainLine)}
                </Text>
              );
            })()}
            {isCustomInputFocused && onCustomChange && (
              <Box
                borderColor={theme.components.input.borderFocused}
                borderStyle="round"
                marginBottom={1}
                marginLeft={2}
                marginTop={0}
                paddingX={1}
                paddingY={0}
              >
                <MultiLineTextInput
                  isFocused={true}
                  onChange={onCustomChange}
                  onSubmit={onAdvance}
                  placeholder="Type your answer (Enter = newline, Tab = done)"
                  value={customValue}
                />
              </Box>
            )}
            {!isCustomInputFocused && customValue && (
              <Box marginLeft={2} marginTop={0}>
                <Text color={theme.components.options.hint} dimColor>
                  {customLines.slice(0, 3).map((line, idx) => (
                    <React.Fragment key={idx}>
                      {idx === 0 ? "   " : "   "}
                      {line || " "}
                      {idx < Math.min(customLines.length, 3) - 1 && <Newline />}
                    </React.Fragment>
                  ))}
                  {customLines.length > 3 && <Newline />}
                  {customLines.length > 3 && "   …"}
                </Text>
              </Box>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
};
