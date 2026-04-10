import type { TelegramInlineKeyboardMarkup } from "./types.js";

export const MAX_TELEGRAM_OPTIONS = 4;
export const MAX_TELEGRAM_BUTTON_LABEL_LENGTH = 20;

export function truncateTelegramLabel(
  label: string,
  maxLength: number = MAX_TELEGRAM_BUTTON_LABEL_LENGTH,
): string {
  return Array.from(label).slice(0, maxLength).join("");
}

export function buildTelegramInlineKeyboard(
  options: readonly string[],
): TelegramInlineKeyboardMarkup {
  return {
    inline_keyboard: options.slice(0, MAX_TELEGRAM_OPTIONS).map((option, index) => [
      {
        text: truncateTelegramLabel(option),
        callback_data: `option_${index}`,
      },
    ]),
  };
}
