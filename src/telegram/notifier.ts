import { promises as fs } from "fs";
import { join } from "path";
import { createHash } from "crypto";

import type { Question } from "../session/types.js";
import type { SessionManager } from "../session/SessionManager.js";
import type { TelegramConfig } from "../config/types.js";

import { getSessionDirectory } from "../session/utils.js";
import { buildTelegramInlineKeyboard, MAX_TELEGRAM_OPTIONS } from "./formatter.js";
import { TelegramClient } from "./client.js";
import {
  upsertTelegramMessageMapEntry,
  type TelegramMessageMapEntry,
  readTelegramMessageMapEntries,
} from "./message-map.js";

const TELEGRAM_METADATA_FILE = "telegram-notify.json";

export interface TelegramQuestionMessage {
  chatId: string;
  messageId: number;
  options: string[];
  questionIndex: number;
}

export interface TelegramSessionMetadata {
  messages: TelegramQuestionMessage[];
  sessionId: string;
}

function getMetadataPath(sessionId: string): string {
  return join(getSessionDirectory(), sessionId, TELEGRAM_METADATA_FILE);
}

function getCallbackData(sessionId: string, questionIndex: number, optionIndex: number): string {
  return `aq|${sessionId}|${questionIndex}|${optionIndex}`;
}

function parseChatId(chatId: string): number | string {
  if (/^-?\d+$/.test(chatId)) {
    return Number(chatId);
  }
  return chatId;
}

function formatQuestionMessage(question: Question): string {
  const optionsSummary = question.options
    .slice(0, MAX_TELEGRAM_OPTIONS)
    .map((opt, idx) => `${idx + 1}. ${opt.label}`)
    .join("\n");

  return `題目：${question.title}\n${question.prompt}\n\n選項：\n${optionsSummary}`;
}

function formatQuestionMessageWithProgress(
  question: Question,
  progress: { answeredCount: number; totalQuestions: number },
): string {
  return `${formatQuestionMessage(question)}\n\n進度：${progress.answeredCount}/${progress.totalQuestions}`;
}

function formatCompletedMessage(
  question: Question,
  submitted: string,
  progress?: { answeredCount: number; totalQuestions: number },
): string {
  const progressText = progress
    ? `\n進度：${progress.answeredCount}/${progress.totalQuestions}`
    : "";
  return `✅ 已提交\n題目：${question.title}\n${question.prompt}\n提交：${submitted}${progressText}`;
}

function formatInactiveMessage(
  question: Question | undefined,
  sessionId: string,
  questionIndex: number,
  status?: string,
): string {
  if (!question) {
    return [
      "🗂 Telegram 訊息已停用",
      `Session：${sessionId}`,
      `題目索引：${questionIndex + 1}`,
      status ? `狀態：${status}` : null,
    ]
      .filter((line): line is string => Boolean(line))
      .join("\n");
  }

  return [
    "🗂 Telegram 訊息已停用",
    `題目：${question.title}`,
    question.prompt,
    status ? `狀態：${status}` : null,
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

function createMessageHash(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function getTelegramQuestionKeyboard(question: Question, sessionId: string, questionIndex: number) {
  const keyboard = buildTelegramInlineKeyboard(question.options.map((opt) => opt.label));
  for (let i = 0; i < keyboard.inline_keyboard.length; i++) {
    const button = keyboard.inline_keyboard[i]?.[0];
    if (button) {
      button.callback_data = getCallbackData(sessionId, questionIndex, i);
    }
  }
  return keyboard;
}

function getEntryKey(sessionId: string, questionIndex: number): string {
  return `${sessionId}:${questionIndex}`;
}

export async function dispatchSessionToTelegram(
  questions: Question[],
  sessionId: string,
  telegramConfig: TelegramConfig,
): Promise<void> {
  if (!telegramConfig.enabled) return;
  if (!telegramConfig.allowedChatId) return;

  const token = process.env[telegramConfig.tokenEnvKey];
  if (!token) return;

  const client = new TelegramClient({ token });
  const chatId = parseChatId(telegramConfig.allowedChatId);

  const messages: TelegramQuestionMessage[] = [];

  for (let questionIndex = 0; questionIndex < questions.length; questionIndex++) {
    const question = questions[questionIndex];
    if (question.options.length > MAX_TELEGRAM_OPTIONS) {
      throw new Error(
        `Question ${questionIndex + 1} exceeds Telegram option limit (${MAX_TELEGRAM_OPTIONS})`,
      );
    }

    const keyboard = getTelegramQuestionKeyboard(question, sessionId, questionIndex);

    const sent = await client.sendMessage(chatId, formatQuestionMessage(question), {
      replyMarkup: keyboard,
    });

    const messageRecord: TelegramMessageMapEntry = {
      chatId: String(sent.chat.id),
      lastSyncedHash: createMessageHash({
        kind: "question",
        sessionId,
        questionIndex,
        text: formatQuestionMessage(question),
        replyMarkup: keyboard,
      }),
      messageId: sent.message_id,
      questionIndex,
      sessionId,
      state: "active",
    };

    messages.push({
      chatId: messageRecord.chatId,
      messageId: messageRecord.messageId,
      options: question.options.map((opt) => opt.label),
      questionIndex,
    });
    await upsertTelegramMessageMapEntry(messageRecord);
  }

  const metadata: TelegramSessionMetadata = { messages, sessionId };
  await fs.writeFile(getMetadataPath(sessionId), JSON.stringify(metadata, null, 2) + "\n", "utf8");
}

export function parseCallbackData(data: string): {
  optionIndex: number;
  questionIndex: number;
  sessionId: string;
} | null {
  const parts = data.split("|");
  if (parts.length !== 4 || parts[0] !== "aq") return null;

  const sessionId = parts[1];
  const questionIndexText = parts[2];
  const optionIndexText = parts[3];
  if (!/^\d+$/.test(questionIndexText) || !/^\d+$/.test(optionIndexText)) {
    return null;
  }

  const questionIndex = Number(questionIndexText);
  const optionIndex = Number(optionIndexText);

  if (!sessionId) {
    return null;
  }

  return { sessionId, questionIndex, optionIndex };
}

export async function readTelegramMetadata(sessionId: string): Promise<TelegramSessionMetadata | null> {
  const path = getMetadataPath(sessionId);
  try {
    const raw = await fs.readFile(path, "utf8");
    return JSON.parse(raw) as TelegramSessionMetadata;
  } catch {
    return null;
  }
}

export async function updateCompletedTelegramMessages(
  sessionId: string,
  sessionManager: SessionManager,
  telegramConfig: TelegramConfig,
): Promise<void> {
  if (!telegramConfig.enabled) return;
  const token = process.env[telegramConfig.tokenEnvKey];
  if (!token) return;

  const metadata = await readTelegramMetadata(sessionId);
  if (!metadata) return;

  const answers = await sessionManager.getSessionAnswers(sessionId);
  const request = await sessionManager.getSessionRequest(sessionId);
  if (!answers || !request) return;

  const client = new TelegramClient({ token });

  for (const message of metadata.messages) {
    try {
      const answer = answers.answers.find((ans) => ans.questionIndex === message.questionIndex);
      const question = request.questions[message.questionIndex];
      if (!answer || !question) continue;

      const submitted = answer.selectedOption ?? answer.customText ?? "(未提供)";
      const completedText = formatCompletedMessage(question, submitted, {
        answeredCount: answers.answers.length,
        totalQuestions: request.questions.length,
      });

      await client.editMessageReplyMarkup({
        chatId: message.chatId,
        messageId: message.messageId,
        replyMarkup: { inline_keyboard: [] },
      });

      await client.editMessageText({
        chatId: message.chatId,
        messageId: message.messageId,
        text: completedText,
        replyMarkup: { inline_keyboard: [] },
      });

      await upsertTelegramMessageMapEntry({
        chatId: message.chatId,
        lastSyncedHash: createMessageHash({
          kind: "completed",
          sessionId,
          questionIndex: message.questionIndex,
          text: completedText,
        }),
        messageId: message.messageId,
        questionIndex: message.questionIndex,
        sessionId,
        state: "completed",
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      console.warn(
        `Failed to update Telegram message ${sessionId}:${message.questionIndex}: ${reason}`,
      );
    }
  }
}

export interface TelegramReconcileResult {
  added: number;
  updated: number;
  stale: number;
  skipped: number;
}

export async function reconcileActiveTelegramMessages(
  sessionManager: SessionManager,
  telegramConfig: TelegramConfig,
): Promise<TelegramReconcileResult> {
  const result: TelegramReconcileResult = {
    added: 0,
    updated: 0,
    stale: 0,
    skipped: 0,
  };

  if (!telegramConfig.enabled) return result;

  const token = process.env[telegramConfig.tokenEnvKey];
  if (!token) return result;

  const activeSessionIds = await sessionManager.getActiveSessionIds();
  const existingEntries = await readTelegramMessageMapEntries();
  const existingByKey = new Map(
    existingEntries.map((entry) => [getEntryKey(entry.sessionId, entry.questionIndex), entry]),
  );
  const activeKeys = new Set<string>();
  const client = new TelegramClient({ token });
  const defaultChatId = telegramConfig.allowedChatId
    ? parseChatId(telegramConfig.allowedChatId)
    : null;

  for (const sessionId of activeSessionIds) {
    const request = await sessionManager.getSessionRequest(sessionId);
    if (!request) {
      result.skipped++;
      continue;
    }

    const answers = await sessionManager
      .getSessionAnswers(sessionId)
      .catch(() => null);
    const answeredCount = answers?.answers.length ?? 0;

    for (let questionIndex = 0; questionIndex < request.questions.length; questionIndex++) {
      const question = request.questions[questionIndex];
      const key = getEntryKey(sessionId, questionIndex);
      activeKeys.add(key);
      const keyboard = getTelegramQuestionKeyboard(question, sessionId, questionIndex);
      const text = formatQuestionMessageWithProgress(question, {
        answeredCount,
        totalQuestions: request.questions.length,
      });
      const hash = createMessageHash({
        kind: "active",
        sessionId,
        questionIndex,
        text,
        replyMarkup: keyboard,
      });
      const existing = existingByKey.get(key);

      try {
        if (existing) {
          if (existing.lastSyncedHash === hash && existing.state === "active") {
            result.skipped++;
            continue;
          }
          await client.editMessageText({
            chatId: existing.chatId,
            messageId: existing.messageId,
            text,
            replyMarkup: keyboard,
          });
          await upsertTelegramMessageMapEntry({
            ...existing,
            lastSyncedHash: hash,
            state: "active",
          });
          result.updated++;
        } else {
          if (!defaultChatId) {
            result.skipped++;
            continue;
          }
          const sent = await client.sendMessage(defaultChatId, text, {
            replyMarkup: keyboard,
          });
          await upsertTelegramMessageMapEntry({
            chatId: String(sent.chat.id),
            lastSyncedHash: hash,
            messageId: sent.message_id,
            questionIndex,
            sessionId,
            state: "active",
          });
          result.added++;
        }
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        console.warn(
          `Failed to reconcile active Telegram message ${sessionId}:${questionIndex}: ${reason}`,
        );
      }
    }
  }

  for (const entry of existingEntries) {
    const key = getEntryKey(entry.sessionId, entry.questionIndex);
    if (activeKeys.has(key)) continue;

    const request = await sessionManager.getSessionRequest(entry.sessionId);
    const status = await sessionManager.getSessionStatus(entry.sessionId);
    const question = request?.questions[entry.questionIndex];
    const text = formatInactiveMessage(
      question,
      entry.sessionId,
      entry.questionIndex,
      status?.status,
    );
    const hash = createMessageHash({
      kind: "stale",
      sessionId: entry.sessionId,
      questionIndex: entry.questionIndex,
      text,
    });

    if (entry.state === "stale" && entry.lastSyncedHash === hash) {
      continue;
    }

    try {
      await client.editMessageText({
        chatId: entry.chatId,
        messageId: entry.messageId,
        text,
        replyMarkup: { inline_keyboard: [] },
      });
      await upsertTelegramMessageMapEntry({
        ...entry,
        lastSyncedHash: hash,
        state: "stale",
      });
      result.stale++;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      console.warn(
        `Failed to stale Telegram message ${entry.sessionId}:${entry.questionIndex}: ${reason}`,
      );
    }
  }

  return result;
}
