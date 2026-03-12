import { TextAttributes } from "@opentui/core";
import React, { useEffect, useState } from "react";
import { useKeyboard } from "@opentui/react";

import type { Option } from "../../session/types.js";
import { t } from "../../i18n/index.js";
import { useConfig } from "../ConfigContext.js";
import { useTheme } from "../ThemeProvider.js";
import type { FocusContext } from "../../tui/shared/types.js";
import { isRecommendedOption } from "../../tui/shared/utils/recommended.js";
import { useTerminalDimensions } from "../hooks/useTerminalDimensions.js";

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
  focusedIndex?: number;
  onFocusedIndexChange?: (index: number) => void;
  // Focus context tracking
  onFocusContextChange?: (context: FocusContext) => void;
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

/**
 * OptionsList displays answer choices and handles arrow key navigation.
 * Uses \u2191\u2193 to navigate, Enter to select.
 *
 * Custom multi-select built with <box>, <text>, useKeyboard().
 * NO native <select> \u2014 spec requires custom for multi-select.
 */
export const OptionsList = ({
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
  focusedIndex: focusedIndexProp,
  onFocusedIndexChange,
  onFocusContextChange,
  onRecommendedDetected,
  questionKey,
  autoSelectRecommended: autoSelectRecommendedProp,
  isElaborateMarked = false,
  onElaborateSelect,
  elaborateText = "",
  onElaborateTextChange,
}: OptionsListProps): React.ReactNode => {
  const { theme } = useTheme();
  const config = useConfig();
  const { width: termWidth } = useTerminalDimensions();
  const rowWidth = Math.max(20, termWidth - 6);

  // Use prop if provided, otherwise use config value
  const autoSelectRecommended =
    autoSelectRecommendedProp ?? config.autoSelectRecommended;
  const [internalFocusedIndex, setInternalFocusedIndex] = useState(0);
  const focusedIndex = focusedIndexProp ?? internalFocusedIndex;

  const setFocusedIndex = (
    nextIndex: number | ((prevIndex: number) => number),
  ) => {
    const resolvedIndex =
      typeof nextIndex === "function" ? nextIndex(focusedIndex) : nextIndex;

    if (focusedIndexProp === undefined) {
      setInternalFocusedIndex(resolvedIndex);
    }
    onFocusedIndexChange?.(resolvedIndex);
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
    const newContext: FocusContext = isElaborateFocused
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

  useEffect(() => {
    if (focusedIndex > maxIndex) {
      setFocusedIndex(maxIndex);
    }
  }, [focusedIndex, maxIndex]);

  // Detect recommended options and notify parent
  useEffect(() => {
    const recommendedOptions = options.filter((opt) =>
      isRecommendedOption(opt.label),
    );
    const hasRecommended = recommendedOptions.length > 0;
    onRecommendedDetected?.(hasRecommended);
  }, [options, onRecommendedDetected]);

  useKeyboard((key) => {
    if (!isFocused) return;

    // Handle up/down navigation even when custom input is focused
    if (key.name === "up") {
      const newIndex = Math.max(0, focusedIndex - 1);
      setFocusedIndex(newIndex);
      return;
    }

    if (key.name === "down") {
      const newIndex = Math.min(maxIndex, focusedIndex + 1);
      setFocusedIndex(newIndex);
      return;
    }

    // When custom input is focused, handle all keyboard input here
    if (isCustomInputFocused) {
      if (key.name === "escape") {
        setFocusedIndex(Math.max(0, options.length - 1));
      } else if (key.name === "tab" && !key.shift) {
        onAdvance?.();
      } else if (key.name === "return") {
        if (key.shift) {
          // Shift+Enter: insert newline
          onCustomChange?.(customValue + "\n");
        } else {
          // Enter: advance to next question
          onAdvance?.();
        }
      } else if (key.name === "backspace" || key.name === "delete") {
        if (customValue.length > 0) {
          onCustomChange?.(customValue.slice(0, -1));
        }
      } else if (key.sequence && !key.ctrl && !key.meta && key.name !== "up" && key.name !== "down") {
        const sanitized = key.sequence
          .replace(/\x1b?\[<[\d;]*[Mm]/g, '')
          .replace(/\[?[OI]/g, '');
        if (sanitized.length > 0) {
          onCustomChange?.(customValue + sanitized);
        }
      }
      return;
    }

    // When elaborate input is focused, handle all keyboard input here
    if (isElaborateFocused) {
      if (key.name === "escape") {
        setFocusedIndex(customInputIndex);
      } else if (key.name === "tab" && !key.shift) {
        onAdvance?.();
      } else if (key.name === "return") {
        if (key.shift) {
          // Shift+Enter: insert newline
          onElaborateTextChange?.(elaborateText + "\n");
        } else {
          // Enter: advance to next question
          if (!elaborateText.trim()) {
            onElaborateSelect?.();
          }
          onAdvance?.();
        }
      } else if (key.name === "backspace" || key.name === "delete") {
        if (elaborateText.length > 0) {
          onElaborateTextChange?.(elaborateText.slice(0, -1));
        }
      } else if (key.sequence && !key.ctrl && !key.meta && key.name !== "up" && key.name !== "down") {
        const sanitized = key.sequence
          .replace(/\x1b?\[<[\d;]*[Mm]/g, '')
          .replace(/\[?[OI]/g, '');
        if (sanitized.length > 0) {
          onElaborateTextChange?.(elaborateText + sanitized);
        }
      }
      return;
    }

    // Spacebar: Select/toggle WITHOUT advancing (works for both modes)
    if (key.name === "space") {
      if (!isCustomInputFocused && !isElaborateFocused) {
        if (multiSelect) {
          onToggle?.(options[focusedIndex].label);
        } else {
          // Single-select: toggle (deselect if already selected)
          // Parent handleSelectOption handles the toggle logic
          onSelect(options[focusedIndex].label);
        }
      }
    }

    // Enter: Advance to next question
    if (key.name === "return") {
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
  });

  // ── Helper: Truncate text to fit row width ─────────────────────────────────────────
  const fitRow = (text: string): string => {
    if (text.length > rowWidth) {
      return text.slice(0, rowWidth - 1) + "\u2026";
    }
    return text; // Background is filled by parent <box>, no manual padding needed
  };

  return (
    <box style={{ flexDirection: "column" }}>
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

        const starSuffix = isRecommended ? " \u2605" : "";
        const mainLine = multiSelect
          ? `${isFocusedOption ? ">" : " "} ${isSelected ? "[\u2713]" : "[ ]"} ${option.label}${starSuffix}`
          : `${isFocusedOption ? ">" : " "} ${option.label}${isSelected ? " \u2713" : ""}${starSuffix}`;

        return (
          <box
            key={index}
            style={{ flexDirection: "column" }}
            onMouseDown={() => {
              setFocusedIndex(index);
              if (multiSelect) {
                onToggle?.(option.label);
              } else {
                onSelect(option.label);
              }
            }}
          >
            <box style={{ backgroundColor: rowBg }}>
              <text
                style={{
                  attributes: (isFocusedOption || isSelected) ? TextAttributes.BOLD : TextAttributes.NONE,
                  fg: rowColor,
                }}
              >
                {fitRow(mainLine)}
              </text>
            </box>
            {option.description && (
              <box style={{ backgroundColor: isFocusedOption ? theme.components.options.focusedBg : isSelected ? theme.components.options.selectedBg : undefined }}>
                <text
                  style={{
                    fg: theme.components.options.description,
                    attributes: (!isFocusedOption && !isSelected) ? TextAttributes.DIM : TextAttributes.NONE,
                  }}
                >
                  {fitRow(`   ${option.description}`)}
                </text>
              </box>
            )}
          </box>
        );
      })}

      {/* Custom input option */}
      {showCustomInput && (
        <box style={{ marginTop: 0 }}>
          <box style={{ flexDirection: "column" }}>
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
              const mainLine = multiSelect
                ? `${isCustomInputFocused ? ">" : " "} ${isSelected ? "[\u2713]" : "[ ]"} ${t("input.otherCustom")}`
                : `${isCustomInputFocused ? ">" : " "} ${t("input.otherCustom")}${isSelected ? " \u2713" : ""}`;

              return (
                <box
                  style={{ backgroundColor: rowBg }}
                  onMouseDown={() => { setFocusedIndex(customInputIndex); }}
                >
                  <text
                    style={{
                      attributes: (isCustomInputFocused || isSelected) ? TextAttributes.BOLD : TextAttributes.NONE,
                      fg: rowColor,
                    }}
                  >
                    {fitRow(mainLine)}
                  </text>
                </box>
              );
            })()}
            {isCustomInputFocused && onCustomChange && (
              <box
                style={{
                  borderColor: theme.components.input.borderFocused,
                  borderStyle: "rounded",
                  marginBottom: 1,
                  marginLeft: 2,
                  marginTop: 0,
                  paddingX: 1,
                  paddingY: 0,
                }}
              >
                {customValue ? (
                  <text style={{ fg: theme.components.options.focused }}>
                    {customValue + "▌"}
                  </text>
                ) : (
                  <text style={{ fg: theme.components.options.hint, attributes: TextAttributes.DIM }}>
                    {t("input.placeholder") + "▌"}
                  </text>
                )}
              </box>
            )}
            {!isCustomInputFocused && customValue && (
              <box style={{ marginLeft: 2, marginTop: 0 }}>
                <text style={{ fg: theme.components.options.hint, attributes: TextAttributes.DIM }}>
                  {"   "}
                  {customLines.slice(0, 3).join("\n   ")}
                  {customLines.length > 3 ? "\n   \u2026" : ""}
                </text>
              </box>
            )}
          </box>
        </box>
      )}

      {/* Request Elaboration option */}
      {showCustomInput && (
        <box style={{ marginTop: 0 }}>
          <box style={{ flexDirection: "column" }}>
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
              const mainLine = multiSelect
                ? `${isElaborateFocused ? ">" : " "} ${isElaborateMarked ? "[\u2605]" : "[ ]"} ${t("footer.elaborate")}`
                : `${isElaborateFocused ? ">" : " "} ${t("footer.elaborate")}${isElaborateMarked ? " \u2605" : ""}`;

              return (
                <box
                  style={{ backgroundColor: rowBg }}
                  onMouseDown={() => {
                    setFocusedIndex(elaborateIndex);
                    onElaborateSelect?.();
                  }}
                >
                  <text
                    style={{
                      attributes: (isElaborateFocused || isElaborateMarked) ? TextAttributes.BOLD : TextAttributes.NONE,
                      fg: rowColor,
                    }}
                  >
                    {fitRow(mainLine)}
                  </text>
                </box>
              );
            })()}
            {/* Elaborate input box - shown when elaborate option is focused */}
            {isElaborateFocused && onElaborateTextChange && (
              <box
                style={{
                  borderColor: theme.components.input.borderFocused,
                  borderStyle: "rounded",
                  marginBottom: 1,
                  marginLeft: 2,
                  marginTop: 0,
                  paddingX: 1,
                  paddingY: 0,
                }}
              >
                {elaborateText ? (
                  <text style={{ fg: theme.components.options.focused }}>
                    {elaborateText + "▌"}
                  </text>
                ) : (
                  <text style={{ fg: theme.components.options.hint, attributes: TextAttributes.DIM }}>
                    {t("input.elaboratePlaceholder") + "▌"}
                  </text>
                )}
              </box>
            )}
            {/* Preview when not focused but has text */}
            {!isElaborateFocused && elaborateText && (
              <box style={{ marginLeft: 2, marginTop: 0 }}>
                <text style={{ fg: theme.components.options.hint, attributes: TextAttributes.DIM }}>
                  {"   "}
                  {elaborateLines.slice(0, 3).join("\n   ")}
                  {elaborateLines.length > 3 ? "\n   \u2026" : ""}
                </text>
              </box>
            )}
          </box>
        </box>
      )}
    </box>
  );
};