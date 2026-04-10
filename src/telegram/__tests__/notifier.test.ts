import { mkdirSync, mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SessionManager } from "../../session/SessionManager.js";
import { SessionManager as SessionManagerClass } from "../../session/SessionManager.js";
import type { SessionRequest, SessionAnswer } from "../../session/types.js";
import {
  readTelegramMessageMapEntries,
  writeTelegramMessageMapEntries,
} from "../message-map.js";
import { parseCallbackData } from "../notifier.js";
import {
  dispatchSessionToTelegram,
  reconcileActiveTelegramMessages,
  updateCompletedTelegramMessages,
} from "../notifier.js";

const {
  mockSendMessage,
  mockEditMessageText,
  mockEditMessageReplyMarkup,
  mockAnswerCallbackQuery,
} = vi.hoisted(() => ({
  mockSendMessage: vi.fn(),
  mockEditMessageText: vi.fn(),
  mockEditMessageReplyMarkup: vi.fn(),
  mockAnswerCallbackQuery: vi.fn(),
}));

vi.mock("../client.js", () => ({
  TelegramClient: vi.fn().mockImplementation(function (this: {
    sendMessage: typeof mockSendMessage;
    editMessageText: typeof mockEditMessageText;
    editMessageReplyMarkup: typeof mockEditMessageReplyMarkup;
    answerCallbackQuery: typeof mockAnswerCallbackQuery;
  }) {
    this.sendMessage = mockSendMessage;
    this.editMessageText = mockEditMessageText;
    this.editMessageReplyMarkup = mockEditMessageReplyMarkup;
    this.answerCallbackQuery = mockAnswerCallbackQuery;
  }),
}));

describe("telegram notifier", () => {
  const dirs: string[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.XDG_CONFIG_HOME;
    delete process.env.AUQ_SESSION_DIR;
    delete process.env.AUQ_TELEGRAM_BOT_TOKEN;
    mockSendMessage.mockReset();
    mockEditMessageText.mockReset();
    mockEditMessageReplyMarkup.mockReset();
    mockAnswerCallbackQuery.mockReset();
    mockSendMessage.mockResolvedValue({ chat: { id: 123 }, message_id: 100 });
    mockEditMessageText.mockResolvedValue(true);
    mockEditMessageReplyMarkup.mockResolvedValue(true);
    mockAnswerCallbackQuery.mockResolvedValue(true);
  });

  afterEach(() => {
    while (dirs.length > 0) {
      const dir = dirs.pop();
      if (dir) rmSync(dir, { recursive: true, force: true });
    }
    delete process.env.XDG_CONFIG_HOME;
    delete process.env.AUQ_SESSION_DIR;
    delete process.env.AUQ_TELEGRAM_BOT_TOKEN;
  });

  function prepareTempDirs(): { configDir: string; sessionDir: string } {
    const base = mkdtempSync(join(tmpdir(), "auq-notifier-"));
    dirs.push(base);
    const configDir = join(base, "config");
    const sessionDir = join(base, "sessions");
    process.env.XDG_CONFIG_HOME = configDir;
    process.env.AUQ_SESSION_DIR = sessionDir;
    process.env.AUQ_TELEGRAM_BOT_TOKEN = "bot-token";
    return { configDir, sessionDir };
  }

  function buildTelegramConfig() {
    return {
      enabled: true,
      tokenEnvKey: "AUQ_TELEGRAM_BOT_TOKEN",
      allowedChatId: "123",
      webhookUrl: "https://example.com/webhook",
      bindHost: "0.0.0.0" as const,
      bindPort: 8080,
    };
  }

  it("upserts active mappings when dispatching session messages", async () => {
    const { sessionDir } = prepareTempDirs();
    const sessionId = "11111111-1111-4111-8111-111111111111";
    mkdirSync(join(sessionDir, sessionId), { recursive: true });
    const questions: SessionRequest["questions"] = [
      {
        title: "Question 1",
        prompt: "Pick one",
        options: [{ label: "A" }, { label: "B" }],
      },
    ];

    await dispatchSessionToTelegram(questions, sessionId, buildTelegramConfig());

    expect(mockSendMessage).toHaveBeenCalledWith(
      123,
      expect.stringContaining("題目：Question 1"),
      expect.objectContaining({ replyMarkup: expect.any(Object) }),
    );

    const entries = await readTelegramMessageMapEntries();
    expect(entries).toEqual([
      expect.objectContaining({
        sessionId,
        questionIndex: 0,
        chatId: "123",
        messageId: 100,
        state: "active",
        lastSyncedHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    ]);
  });

  it("marks mappings completed after editing sent messages", async () => {
    const { sessionDir } = prepareTempDirs();
    const sessionId = "22222222-2222-4222-8222-222222222222";
    mkdirSync(join(sessionDir, sessionId), { recursive: true });
    const questions: SessionRequest["questions"] = [
      {
        title: "Question 1",
        prompt: "Pick one",
        options: [{ label: "A" }, { label: "B" }],
      },
    ];
    const answers: SessionAnswer = {
      sessionId,
      timestamp: new Date().toISOString(),
      answers: [
        {
          questionIndex: 0,
          selectedOption: "A",
          timestamp: new Date().toISOString(),
        },
      ],
    };

    await dispatchSessionToTelegram(questions, sessionId, buildTelegramConfig());

    const sessionManager = {
      getSessionAnswers: vi.fn().mockResolvedValue(answers),
      getSessionRequest: vi.fn().mockResolvedValue({
        sessionId,
        timestamp: new Date().toISOString(),
        questions,
      }),
    } as unknown as SessionManager;

    await updateCompletedTelegramMessages(
      sessionId,
      sessionManager,
      buildTelegramConfig(),
    );

    expect(mockEditMessageReplyMarkup).toHaveBeenCalledWith({
      chatId: "123",
      messageId: 100,
      replyMarkup: { inline_keyboard: [] },
    });
    expect(mockEditMessageText).toHaveBeenCalledWith({
      chatId: "123",
      messageId: 100,
      text: expect.stringContaining("✅ 已提交"),
      replyMarkup: { inline_keyboard: [] },
    });

    const entries = await readTelegramMessageMapEntries();
    expect(entries).toEqual([
      expect.objectContaining({
        sessionId,
        questionIndex: 0,
        chatId: "123",
        messageId: 100,
        state: "completed",
        lastSyncedHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    ]);
  });

  it("continues processing later messages when one edit fails", async () => {
    const { sessionDir } = prepareTempDirs();
    const sessionId = "33333333-3333-4333-8333-333333333333";
    mkdirSync(join(sessionDir, sessionId), { recursive: true });
    const questions: SessionRequest["questions"] = [
      {
        title: "Question 1",
        prompt: "Pick one",
        options: [{ label: "A" }, { label: "B" }],
      },
      {
        title: "Question 2",
        prompt: "Pick one",
        options: [{ label: "C" }, { label: "D" }],
      },
    ];
    const answers: SessionAnswer = {
      sessionId,
      timestamp: new Date().toISOString(),
      answers: [
        {
          questionIndex: 0,
          selectedOption: "A",
          timestamp: new Date().toISOString(),
        },
        {
          questionIndex: 1,
          selectedOption: "D",
          timestamp: new Date().toISOString(),
        },
      ],
    };

    await dispatchSessionToTelegram(questions, sessionId, buildTelegramConfig());
    mockEditMessageText
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValue(true);

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const sessionManager = {
      getSessionAnswers: vi.fn().mockResolvedValue(answers),
      getSessionRequest: vi.fn().mockResolvedValue({
        sessionId,
        timestamp: new Date().toISOString(),
        questions,
      }),
    } as unknown as SessionManager;

    try {
      await updateCompletedTelegramMessages(
        sessionId,
        sessionManager,
        buildTelegramConfig(),
      );

      expect(mockEditMessageReplyMarkup).toHaveBeenCalledTimes(2);
      expect(mockEditMessageText).toHaveBeenCalledTimes(2);
      expect(warnSpy).toHaveBeenCalled();

      const entries = await readTelegramMessageMapEntries();
      expect(entries).toEqual([
        expect.objectContaining({
          questionIndex: 0,
          state: "active",
        }),
        expect.objectContaining({
          questionIndex: 1,
          state: "completed",
        }),
      ]);
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("rejects invalid callback data indexes", () => {
    expect(parseCallbackData("aq|session|1.2|0")).toBeNull();
    expect(parseCallbackData("aq|session|-1|0")).toBeNull();
    expect(parseCallbackData("aq|session|0|-3")).toBeNull();
    expect(parseCallbackData("aq|session|0|2")).toEqual({
      sessionId: "session",
      questionIndex: 0,
      optionIndex: 2,
    });
  });

  it("reconciles active sessions by adding, updating, and staling mappings", async () => {
    const { sessionDir } = prepareTempDirs();
    const sessionManager = new SessionManagerClass({
      baseDir: sessionDir,
    });
    await sessionManager.initialize();

    const questions: SessionRequest["questions"] = [
      {
        title: "Question 1",
        prompt: "Pick one",
        options: [{ label: "A" }, { label: "B" }],
      },
      {
        title: "Question 2",
        prompt: "Pick one",
        options: [{ label: "C" }, { label: "D" }],
      },
    ];
    const staleQuestions: SessionRequest["questions"] = [
      {
        title: "Question 9",
        prompt: "Pick one",
        options: [{ label: "X" }, { label: "Y" }],
      },
    ];

    const activeSessionId = await sessionManager.createSession(questions);
    await sessionManager.updateSessionStatus(activeSessionId, "in-progress", {
      currentQuestionIndex: 0,
    });
    const staleSessionId = await sessionManager.createSession(staleQuestions);
    await sessionManager.updateSessionStatus(staleSessionId, "completed");

    await writeTelegramMessageMapEntries([
      {
        sessionId: activeSessionId,
        questionIndex: 0,
        chatId: "123",
        messageId: 10,
        lastSyncedHash: "hash-active-0",
        state: "active",
      },
      {
        sessionId: staleSessionId,
        questionIndex: 0,
        chatId: "123",
        messageId: 20,
        lastSyncedHash: "hash-stale-0",
        state: "active",
      },
    ]);

    mockSendMessage.mockResolvedValue({ chat: { id: 123 }, message_id: 30 });
    mockEditMessageText.mockResolvedValue(true);

    const result = await reconcileActiveTelegramMessages(
      sessionManager,
      buildTelegramConfig(),
    );

    expect(result.added).toBe(1);
    expect(result.updated).toBe(1);
    expect(result.stale).toBe(1);
    expect(mockSendMessage).toHaveBeenCalledTimes(1);
    expect(mockEditMessageText).toHaveBeenCalledTimes(2);
    expect(mockEditMessageText).toHaveBeenCalledWith(
      expect.objectContaining({
        chatId: "123",
        messageId: 10,
        replyMarkup: expect.objectContaining({ inline_keyboard: expect.any(Array) }),
      }),
    );
    expect(mockEditMessageText).toHaveBeenCalledWith(
      expect.objectContaining({
        chatId: "123",
        messageId: 20,
        replyMarkup: { inline_keyboard: [] },
      }),
    );

    const entries = await readTelegramMessageMapEntries();
    expect(entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sessionId: activeSessionId,
          questionIndex: 0,
          state: "active",
        }),
        expect.objectContaining({
          sessionId: activeSessionId,
          questionIndex: 1,
          state: "active",
        }),
        expect.objectContaining({
          sessionId: staleSessionId,
          questionIndex: 0,
          state: "stale",
        }),
      ]),
    );
  });
});
