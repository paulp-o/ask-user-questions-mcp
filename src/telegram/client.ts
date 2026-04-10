import type {
  TelegramAnswerCallbackQueryOptions,
  TelegramApiResponse,
  TelegramClientOptions,
  TelegramEditMessageReplyMarkupOptions,
  TelegramEditMessageTextOptions,
  TelegramInlineKeyboardMarkup,
  TelegramMessage,
  TelegramSendMessageOptions,
  TelegramSetWebhookOptions,
  TelegramUser,
} from "./types.js";

export class TelegramClientError extends Error {
  constructor(
    message: string,
    public readonly method: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "TelegramClientError";
  }
}

type RequestMethod = "GET" | "POST";

export class TelegramClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: TelegramClientOptions) {
    this.baseUrl = options.baseUrl ?? "https://api.telegram.org";
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch;

    if (!this.fetchImpl) {
      throw new Error("fetch is not available");
    }
  }

  async getMe(): Promise<TelegramUser> {
    return this.request<TelegramUser>("getMe", "GET");
  }

  async setWebhook(
    url: string,
    options: Omit<TelegramSetWebhookOptions, "url"> = {},
  ): Promise<true> {
    return this.request<true>("setWebhook", "POST", {
      url,
      ...toWebhookPayload(options),
    });
  }

  async sendMessage(
    chatId: number | string,
    text: string,
    options: TelegramSendMessageOptions = {},
  ): Promise<TelegramMessage> {
    return this.request<TelegramMessage>("sendMessage", "POST", {
      chat_id: chatId,
      text,
      ...toSendMessagePayload(options),
    });
  }

  async editMessageText(
    options: TelegramEditMessageTextOptions,
  ): Promise<TelegramMessage | true> {
    return this.request<TelegramMessage | true>("editMessageText", "POST", {
      ...toEditMessageTextPayload(options),
    });
  }

  async editMessageReplyMarkup(
    options: TelegramEditMessageReplyMarkupOptions,
  ): Promise<TelegramMessage | true> {
    return this.request<TelegramMessage | true>(
      "editMessageReplyMarkup",
      "POST",
      {
        ...toEditMessageReplyMarkupPayload(options),
      },
    );
  }

  async answerCallbackQuery(
    options: TelegramAnswerCallbackQueryOptions,
  ): Promise<true> {
    return this.request<true>("answerCallbackQuery", "POST", {
      callback_query_id: options.callbackQueryId,
      text: options.text,
      show_alert: options.showAlert,
      url: options.url,
      cache_time: options.cacheTime,
    });
  }

  private async request<T>(
    method: string,
    httpMethod: RequestMethod,
    body?: Record<string, unknown>,
  ): Promise<T> {
    const response = await this.fetchImpl(
      `${this.baseUrl}/bot${this.options.token}/${method}`,
      {
        method: httpMethod,
        headers: {
          accept: "application/json",
          ...(httpMethod === "POST"
            ? { "content-type": "application/json" }
            : {}),
        },
        ...(body && httpMethod === "POST"
          ? { body: JSON.stringify(body) }
          : {}),
      },
    );

    const payload = (await response.json()) as TelegramApiResponse<T>;

    if (!response.ok) {
      const message =
        "description" in payload ? payload.description : response.statusText;
      throw new TelegramClientError(message, method, response.status);
    }

    if (!payload.ok) {
      throw new TelegramClientError(
        payload.description,
        method,
        payload.error_code,
      );
    }

    return payload.result;
  }
}

function toWebhookPayload(
  options: Omit<TelegramSetWebhookOptions, "url">,
): Record<string, unknown> {
  return {
    drop_pending_updates: options.dropPendingUpdates,
    secret_token: options.secretToken,
    allowed_updates: options.allowedUpdates,
    max_connections: options.maxConnections,
  };
}

function toSendMessagePayload(
  options: TelegramSendMessageOptions,
): Record<string, unknown> {
  return {
    parse_mode: options.parseMode,
    disable_web_page_preview: options.disableWebPagePreview,
    disable_notification: options.disableNotification,
    reply_markup: options.replyMarkup,
  };
}

function toEditMessageTextPayload(
  options: TelegramEditMessageTextOptions,
): Record<string, unknown> {
  return {
    chat_id: options.chatId,
    message_id: options.messageId,
    inline_message_id: options.inlineMessageId,
    text: options.text,
    parse_mode: options.parseMode,
    reply_markup: options.replyMarkup,
  };
}

function toEditMessageReplyMarkupPayload(
  options: TelegramEditMessageReplyMarkupOptions,
): Record<string, unknown> {
  return {
    chat_id: options.chatId,
    message_id: options.messageId,
    inline_message_id: options.inlineMessageId,
    reply_markup: options.replyMarkup,
  };
}
