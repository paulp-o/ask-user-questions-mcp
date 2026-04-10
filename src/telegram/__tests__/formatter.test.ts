import { describe, expect, it } from "vitest";

import {
  MAX_TELEGRAM_BUTTON_LABEL_LENGTH,
  MAX_TELEGRAM_OPTIONS,
  buildTelegramInlineKeyboard,
  truncateTelegramLabel,
} from "../formatter.js";

describe("telegram formatter", () => {
  it("limits the keyboard to four options", () => {
    const keyboard = buildTelegramInlineKeyboard([
      "first",
      "second",
      "third",
      "fourth",
      "fifth",
    ]);

    expect(keyboard.inline_keyboard).toHaveLength(MAX_TELEGRAM_OPTIONS);
    expect(
      keyboard.inline_keyboard.map((row) => row[0].text),
    ).toEqual(["first", "second", "third", "fourth"]);
  });

  it("truncates button labels to twenty characters", () => {
    const label = truncateTelegramLabel(
      "123456789012345678901234567890",
    );

    expect(label).toHaveLength(MAX_TELEGRAM_BUTTON_LABEL_LENGTH);
    expect(label).toBe("12345678901234567890");
  });

  it("truncates option labels inside the keyboard", () => {
    const keyboard = buildTelegramInlineKeyboard([
      "1234567890123456789012345",
    ]);

    expect(keyboard.inline_keyboard[0][0].text).toHaveLength(
      MAX_TELEGRAM_BUTTON_LABEL_LENGTH,
    );
    expect(keyboard.inline_keyboard[0][0].text).toBe(
      "12345678901234567890",
    );
  });
});
