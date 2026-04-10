export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramChat {
  id: number | string;
  type: string;
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface TelegramMessage {
  message_id: number;
  date: number;
  chat: TelegramChat;
  text?: string;
}

export interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  data?: string;
  message?: TelegramMessage;
}

export interface TelegramUpdate {
  update_id: number;
  callback_query?: TelegramCallbackQuery;
  message?: {
    message_id: number;
    chat: TelegramChat;
    text?: string;
  };
}

export interface TelegramInlineKeyboardButton {
  text: string;
  callback_data: string;
}

export interface TelegramInlineKeyboardMarkup {
  inline_keyboard: TelegramInlineKeyboardButton[][];
}

export interface TelegramApiSuccessResponse<T> {
  ok: true;
  result: T;
}

export interface TelegramApiErrorResponse {
  ok: false;
  error_code: number;
  description: string;
}

export type TelegramApiResponse<T> =
  | TelegramApiSuccessResponse<T>
  | TelegramApiErrorResponse;

export interface TelegramClientOptions {
  token: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

export interface TelegramSendMessageOptions {
  parseMode?: "HTML" | "Markdown" | "MarkdownV2";
  disableWebPagePreview?: boolean;
  disableNotification?: boolean;
  replyMarkup?: TelegramInlineKeyboardMarkup;
}

export interface TelegramEditMessageTextOptions {
  chatId?: number | string;
  messageId?: number;
  inlineMessageId?: string;
  text: string;
  parseMode?: "HTML" | "Markdown" | "MarkdownV2";
  replyMarkup?: TelegramInlineKeyboardMarkup;
}

export interface TelegramEditMessageReplyMarkupOptions {
  chatId?: number | string;
  messageId?: number;
  inlineMessageId?: string;
  replyMarkup?: TelegramInlineKeyboardMarkup;
}

export interface TelegramAnswerCallbackQueryOptions {
  callbackQueryId: string;
  text?: string;
  showAlert?: boolean;
  url?: string;
  cacheTime?: number;
}

export interface TelegramSetWebhookOptions {
  url: string;
  secretToken?: string;
  dropPendingUpdates?: boolean;
  allowedUpdates?: string[];
  maxConnections?: number;
}

export interface PairingChallenge {
  id: string;
  pin: string;
  issuedAt: number;
  expiresAt: number;
  attemptsLeft: number;
  maxAttempts: number;
}

export interface PairingServiceOptions {
  ttlMs: number;
  maxAttempts: number;
  pinLength?: number;
  now?: () => number;
  pinGenerator?: () => string;
}

export type PairingVerificationStatus =
  | "matched"
  | "mismatch"
  | "expired"
  | "locked"
  | "not_found";

export interface PairingVerificationResult {
  status: PairingVerificationStatus;
  attemptsLeft: number;
}
