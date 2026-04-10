import { describe, expect, it } from "vitest";

import type {
  TelegramInlineKeyboardMarkup,
  TelegramSendMessageOptions,
} from "../types.js";

describe("telegram types", () => {
  it("defines inline keyboard markup with rows of buttons", () => {
    const markup: TelegramInlineKeyboardMarkup = {
      inline_keyboard: [[{ text: "A", callback_data: "a" }]],
    };

    expect(markup.inline_keyboard).toHaveLength(1);
    expect(markup.inline_keyboard[0]).toHaveLength(1);
  });

  it("allows send message options to include reply markup", () => {
    const options: TelegramSendMessageOptions = {
      replyMarkup: {
        inline_keyboard: [[{ text: "A", callback_data: "a" }]],
      },
    };

    expect(options.replyMarkup?.inline_keyboard[0][0].text).toBe("A");
  });
});
