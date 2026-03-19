import React from "react";
import { TextAttributes } from "@opentui/core";

import { t } from "../../i18n/index.js";
import { useTheme } from "../ThemeProvider.js";

interface CustomInputProps {
  isFocused: boolean;
  onChange: (value: string) => void;
  value: string;
}

/**
 * CustomInput allows users to type free-text answers.
 * Uses OpenTUI's native <input> component with visual focus indicator.
 */
export const CustomInput: React.FC<CustomInputProps> = ({
  isFocused,
  onChange,
  value,
}) => {
  const { theme } = useTheme();

  return (
    <box
      style={{
        borderColor: isFocused
          ? theme.components.input.borderFocused
          : theme.components.input.border,
        borderStyle: "rounded",
        flexDirection: "column",
        marginTop: 1,
        padding: 1,
      }}
    >
      <text
        style={{
          fg: theme.colors.textDim,
          attributes: !isFocused ? TextAttributes.DIM : TextAttributes.NONE,
        }}
      >
        {`${isFocused ? ">" : " "} ${t("input.customAnswerLabel")}`}
      </text>
      <box style={{ marginTop: 1 }}>
        {isFocused ? (
          <input
            placeholder="Type your answer here..."
            value={value}
            focused={isFocused}
            onInput={(val) => onChange(val)}
          />
        ) : (
          <text
            style={{
              fg: value ? theme.colors.text : theme.colors.textDim,
            }}
          >
            {value || t("input.customAnswerHint")}
          </text>
        )}
      </box>
    </box>
  );
};