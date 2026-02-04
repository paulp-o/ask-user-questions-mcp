import { Box, Newline, Text, useInput, useStdout } from "ink";
import React, { useEffect, useState } from "react";

import type { Option } from "../../session/types.js";

import { t } from "../../i18n/index.js";
import { useConfig } from "../ConfigContext.js";
import { useTheme } from "../ThemeContext.js";
import { isRecommendedOption } from "../utils/recommended.js";
import { fitToVisualWidth } from "../utils/visualWidth.js";
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
  onFocusContextChange?: (
    context: "option" | "custom-input" | "elaborate-input",
  ) => void;
  // Recommended option detection callback
  onRecommendedDetected?: (hasRecommended: boolean) => void;
  // Focus reset support
  questionKey?: string | number;
  // Config-based auto-select (overrides config if provided)
  autoSelectRecommended?: boolean;
  // Elaborate option
  isElaborateMarked?: boolean;
  onElaborateSelect?: () => void;
  // Elaborate input text support
  elaborateText?: string;
  onElaborateTextChange?: (value: string) => void;
}

// isRecommendedOption is imported from ../utils/recommended.js

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
  autoSelectRecommended: autoSelectRecommendedProp,
  isElaborateMarked = false,
  onElaborateSelect,
  elaborateText = "",
  onElaborateTextChange,
}) => {
  const { theme } = useTheme();
  const config = useConfig();
  // Use prop if provided, otherwise use config value
  const autoSelectRecommended =
    autoSelectRecommendedProp ?? config.autoSelectRecommended;
  const [focusedIndex, setFocusedIndex] = useState(0);
  const { stdout } = useStdout();
  const columns = stdout?.columns ?? 80;
  const rowWidth = Math.max(20, columns - 2);

  const fitRow = (text: string) => {
    return fitToVisualWidth(text, rowWidth);
  };

  // Calculate max index: include custom input and elaborate options if enabled
  // Options: [0..n-1] = regular options, [n] = custom input, [n+1] = elaborate
  const customInputIndex = options.length;
  const elaborateIndex = options.length + 1;
  const maxIndex = showCustomInput ? elaborateIndex : options.length - 1;
  const isCustomInputFocused =
    showCustomInput && focusedIndex === customInputIndex;
  const isElaborateFocused = showCustomInput && focusedIndex === elaborateIndex;
  const customLines = customValue.replace(/\r\n?/g, "\n").split("\n");
  const elaborateLines = elaborateText.replace(/\r\n?/g, "\n").split("\n");

  // Track and emit focus context changes
  useEffect(() => {
    const newContext: "option" | "custom-input" | "elaborate-input" =
      isElaborateFocused
        ? "elaborate-input"
        : isCustomInputFocused
          ? "custom-input"
          : "option";
    onFocusContextChange?.(newContext);
  }, [
    focusedIndex,
    isCustomInputFocused,
    isElaborateFocused,
    onFocusContextChange,
  ]);

  // Reset focus when question changes
  useEffect(() => {
    setFocusedIndex(0);
  }, [questionKey]);

  // Detect recommended options and notify parent
  useEffect(() => {
    const recommendedOptions = options.filter((opt) =>
      isRecommendedOption(opt.label),
    );
    const hasRecommended = recommendedOptions.length > 0;
    onRecommendedDetected?.(hasRecommended);
  }, [options, onRecommendedDetected]);

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

      // When elaborate input is focused, only handle escape to exit, let MultiLineTextInput handle other keys
      if (isElaborateFocused) {
        if (key.escape) {
          // Escape: Exit elaborate input mode and go back to custom input option
          setFocusedIndex(customInputIndex);
        }
        return;
      }

      // Spacebar: Select/toggle WITHOUT advancing (works for both modes)
      if (input === " ") {
        if (!isCustomInputFocused && !isElaborateFocused) {
          if (multiSelect) {
            onToggle?.(options[focusedIndex].label);
          } else {
            onSelect(options[focusedIndex].label);
          }
        }
      }

      // Enter: Advance to next question
      if (key.return) {
        if (isCustomInputFocused || isElaborateFocused) {
          return;
        }

        if (multiSelect) {
          // Multi-select: Enter just advances (spacebar toggles)
          if (onAdvance) {
            onAdvance();
          }
        } else {
          // Single-select: Enter selects AND advances
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
        const isRecommended = isRecommendedOption(option.label);

        // Different icons for single vs multi-select
        const isSelected = multiSelect
          ? selectedOptions?.includes(option.label) || false
          : selectedOption === option.label;

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
        // Single-select: check on right side, no box
        // Multi-select: checkbox on left side
        const mainLine = multiSelect
          ? `${isFocusedOption ? ">" : " "} ${isSelected ? "[✓]" : "[ ]"} ${option.label}${starSuffix}`
          : `${isFocusedOption ? ">" : " "} ${option.label}${isSelected ? " ✓" : ""}${starSuffix}`;

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
                    : isSelected
                      ? theme.components.options.selectedBg
                      : undefined
                }
                color={theme.components.options.description}
                dimColor={!isFocusedOption && !isSelected}
              >
                {isFocusedOption
                  ? `   ${option.description}`
                  : fitRow(`   ${option.description}`)}
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
              // Single-select: check on right side, no box
              // Multi-select: checkbox on left side
              const mainLine = multiSelect
                ? `${isCustomInputFocused ? ">" : " "} ${isSelected ? "[✓]" : "[ ]"} ${t("input.otherCustom")}`
                : `${isCustomInputFocused ? ">" : " "} ${t("input.otherCustom")}${isSelected ? " ✓" : ""}`;

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
                  placeholder={t("input.placeholder")}
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

      {/* Request Elaboration option */}
      {showCustomInput && (
        <Box marginTop={0}>
          <Box flexDirection="column">
            {(() => {
              const rowBg = isElaborateFocused
                ? theme.components.options.focusedBg
                : isElaborateMarked
                  ? theme.components.options.selectedBg
                  : undefined;
              const rowColor = isElaborateFocused
                ? theme.components.options.focused
                : isElaborateMarked
                  ? theme.colors.warning
                  : theme.components.options.default;
              // Single-select: icon on right side, no box
              // Multi-select: checkbox on left side
              const mainLine = multiSelect
                ? `${isElaborateFocused ? ">" : " "} ${isElaborateMarked ? "[★]" : "[ ]"} ${t("footer.elaborate")}`
                : `${isElaborateFocused ? ">" : " "} ${t("footer.elaborate")}${isElaborateMarked ? " ★" : ""}`;

              return (
                <Text
                  backgroundColor={rowBg}
                  bold={isElaborateFocused || isElaborateMarked}
                  color={rowColor}
                >
                  {fitRow(mainLine)}
                </Text>
              );
            })()}
            {/* Elaborate input box - shown when elaborate option is focused */}
            {isElaborateFocused && onElaborateTextChange && (
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
                  enterSubmits={true}
                  isFocused={true}
                  onChange={onElaborateTextChange}
                  onSubmit={() => {
                    // Enter/Tab submits and advance
                    // Only call onElaborateSelect if no text (to toggle mark on)
                    // If text exists, mark is already set via onElaborateTextChange
                    if (!elaborateText.trim()) {
                      onElaborateSelect?.();
                    }
                    onAdvance?.();
                  }}
                  placeholder={t("input.elaboratePlaceholder")}
                  value={elaborateText}
                />
              </Box>
            )}
            {/* Preview when not focused but has text */}
            {!isElaborateFocused && elaborateText && (
              <Box marginLeft={2} marginTop={0}>
                <Text color={theme.components.options.hint} dimColor>
                  {elaborateLines.slice(0, 3).map((line, idx) => (
                    <React.Fragment key={idx}>
                      {idx === 0 ? "   " : "   "}
                      {line || " "}
                      {idx < Math.min(elaborateLines.length, 3) - 1 && (
                        <Newline />
                      )}
                    </React.Fragment>
                  ))}
                  {elaborateLines.length > 3 && <Newline />}
                  {elaborateLines.length > 3 && "   …"}
                </Text>
              </Box>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
};
