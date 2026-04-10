import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TelegramClient } from "../client.js";

describe("TelegramClient", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function mockResponse<T>(payload: T, ok = true, status = 200): Response {
    return {
      ok,
      status,
      statusText: ok ? "OK" : "Bad Request",
      json: vi.fn().mockResolvedValue(payload),
    } as unknown as Response;
  }

  it("calls getMe", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      mockResponse({
        ok: true,
        result: { id: 1, is_bot: true, first_name: "AUQ" },
      }),
    );

    const client = new TelegramClient({ token: "bot-token" });

    await expect(client.getMe()).resolves.toEqual({
      id: 1,
      is_bot: true,
      first_name: "AUQ",
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://api.telegram.org/botbot-token/getMe",
      {
        method: "GET",
        headers: {
          accept: "application/json",
        },
      },
    );
  });

  it("calls setWebhook", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      mockResponse({ ok: true, result: true }),
    );

    const client = new TelegramClient({ token: "bot-token" });

    await expect(
      client.setWebhook("https://example.com/webhook", {
        dropPendingUpdates: true,
        secretToken: "secret",
        allowedUpdates: ["message", "callback_query"],
      }),
    ).resolves.toBe(true);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://api.telegram.org/botbot-token/setWebhook",
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          url: "https://example.com/webhook",
          drop_pending_updates: true,
          secret_token: "secret",
          allowed_updates: ["message", "callback_query"],
        }),
      },
    );
  });

  it("calls sendMessage", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      mockResponse({
        ok: true,
        result: { message_id: 9, date: 1, chat: { id: 42, type: "private" } },
      }),
    );

    const client = new TelegramClient({ token: "bot-token" });

    await expect(
      client.sendMessage(42, "hello", {
        disableNotification: true,
      }),
    ).resolves.toEqual({
      message_id: 9,
      date: 1,
      chat: { id: 42, type: "private" },
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://api.telegram.org/botbot-token/sendMessage",
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          chat_id: 42,
          text: "hello",
          disable_notification: true,
        }),
      },
    );
  });

  it("calls editMessageText", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      mockResponse({ ok: true, result: true }),
    );

    const client = new TelegramClient({ token: "bot-token" });

    await expect(
      client.editMessageText({
        chatId: 42,
        messageId: 7,
        text: "updated",
      }),
    ).resolves.toBe(true);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://api.telegram.org/botbot-token/editMessageText",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          chat_id: 42,
          message_id: 7,
          text: "updated",
        }),
      }),
    );
  });

  it("calls editMessageReplyMarkup", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      mockResponse({
        ok: true,
        result: { message_id: 7, date: 1, chat: { id: 42, type: "private" } },
      }),
    );

    const client = new TelegramClient({ token: "bot-token" });

    await expect(
      client.editMessageReplyMarkup({
        chatId: 42,
        messageId: 7,
        replyMarkup: { inline_keyboard: [] },
      }),
    ).resolves.toEqual({
      message_id: 7,
      date: 1,
      chat: { id: 42, type: "private" },
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://api.telegram.org/botbot-token/editMessageReplyMarkup",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          chat_id: 42,
          message_id: 7,
          reply_markup: { inline_keyboard: [] },
        }),
      }),
    );
  });

  it("calls answerCallbackQuery", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      mockResponse({ ok: true, result: true }),
    );

    const client = new TelegramClient({ token: "bot-token" });

    await expect(
      client.answerCallbackQuery({
        callbackQueryId: "abc",
        text: "done",
      }),
    ).resolves.toBe(true);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://api.telegram.org/botbot-token/answerCallbackQuery",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          callback_query_id: "abc",
          text: "done",
        }),
      }),
    );
  });
});
