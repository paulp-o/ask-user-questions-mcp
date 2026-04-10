import { createServer, type IncomingMessage, type ServerResponse } from "http";

import type { SessionManager } from "../session/SessionManager.js";
import type { TelegramConfig } from "../config/types.js";
import type { TelegramUpdate } from "./types.js";

import { TelegramClient } from "./client.js";
import { parseCallbackData, updateCompletedTelegramMessages } from "./notifier.js";
import { consumePairingByPin } from "./pairing-file.js";

function json(res: ServerResponse, statusCode: number, body: Record<string, unknown>): void {
  res.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function readJson(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer | string) => {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    });
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

export async function handleTelegramUpdate(
  sessionManager: SessionManager,
  telegramConfig: TelegramConfig,
  update: TelegramUpdate,
): Promise<void> {
  const token = process.env[telegramConfig.tokenEnvKey];
  if (!token) return;
  const client = new TelegramClient({ token });

  const callback = update.callback_query;
  const message = update.message;

  if (message?.text && message.chat?.id) {
    const result = consumePairingByPin(message.text.trim(), String(message.chat.id));
    await client.sendMessage(String(message.chat.id), result.message);
    return;
  }

  if (!callback?.data || !callback.message) {
    return;
  }

  const parsed = parseCallbackData(callback.data);
  if (!parsed) {
    await client.answerCallbackQuery({
      callbackQueryId: callback.id,
      text: "無效操作",
      showAlert: false,
    });
    return;
  }

  const allowed = telegramConfig.allowedChatId;
  if (!allowed || String(callback.message.chat.id) !== String(allowed)) {
    await client.answerCallbackQuery({
      callbackQueryId: callback.id,
      text: "未授權 chat",
      showAlert: true,
    });
    return;
  }

  try {
    const question = await sessionManager.getQuestionByIndex(
      parsed.sessionId,
      parsed.questionIndex,
    );
    const option = question.options[parsed.optionIndex];
    if (!option) {
      await client.answerCallbackQuery({
        callbackQueryId: callback.id,
        text: "選項不存在",
      });
      return;
    }

    const merged = await sessionManager.upsertAnswer(parsed.sessionId, {
      questionIndex: parsed.questionIndex,
      selectedOption: option.label,
      timestamp: new Date().toISOString(),
    });

    const total = await sessionManager.getQuestionCount(parsed.sessionId);
    if (merged.answers.length >= total) {
      await sessionManager.saveSessionAnswers(parsed.sessionId, {
        ...merged,
        timestamp: new Date().toISOString(),
      });
      await updateCompletedTelegramMessages(parsed.sessionId, sessionManager, telegramConfig);
    }

    await client.answerCallbackQuery({
      callbackQueryId: callback.id,
      text: "已提交",
      showAlert: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const text = message === "SESSION_ALREADY_COMPLETED" ? "此問題已完成" : "提交失敗";
    await client.answerCallbackQuery({
      callbackQueryId: callback.id,
      text,
      showAlert: false,
    });
  }
}

export function startTelegramWebhookServer(
  sessionManager: SessionManager,
  telegramConfig: TelegramConfig,
): { close: () => Promise<void> } | null {
  if (!telegramConfig.enabled) return null;
  if (!telegramConfig.webhookUrl) return null;

  const token = process.env[telegramConfig.tokenEnvKey];
  if (!token) return null;

  const server = createServer(async (req, res) => {
    if (req.method !== "POST") {
      json(res, 404, { ok: false });
      return;
    }

    const secretHeader = req.headers["x-telegram-bot-api-secret-token"];
    const expectedSecret = process.env.AUQ_TELEGRAM_WEBHOOK_SECRET;
    if (expectedSecret && secretHeader !== expectedSecret) {
      json(res, 401, { ok: false, error: "invalid secret" });
      return;
    }

    try {
      const body = (await readJson(req)) as TelegramUpdate;
      await handleTelegramUpdate(sessionManager, telegramConfig, body);
      json(res, 200, { ok: true });
    } catch (error) {
      json(res, 400, {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  server.listen(telegramConfig.bindPort, telegramConfig.bindHost);

  return {
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      }),
  };
}
