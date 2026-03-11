import React from "react";

import { t } from "../../i18n/index.js";

interface SingleLineTextInputProps {
  isFocused?: boolean;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  value: string;
}

/**
 * SingleLineTextInput wraps OpenTUI's native <input> for single-line text entry.
 * Used for rejection reasons and other short text fields.
 */
export const SingleLineTextInput = ({
  isFocused = true,
  onChange,
  onSubmit,
  placeholder = t("input.singleLinePlaceholder"),
  value,
}: SingleLineTextInputProps): React.ReactNode => {
  return (
    <input
      placeholder={placeholder}
      value={value}
      focused={isFocused}
      onInput={(val) => onChange(val)}
      onSubmit={() => onSubmit?.()}
    />
  );
};