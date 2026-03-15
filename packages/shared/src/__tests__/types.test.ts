import { describe, expect, it } from "vitest";

import {
  DEFAULT_SESSION_CONFIG,
  SESSION_FILES,
  type Option,
  type Question,
  type SessionAnswer,
  type SessionConfig,
  type SessionRequest,
  type SessionStatus,
  type UserAnswer,
} from "../session/types.js";

describe("shared session types", () => {
  it("exposes SESSION_FILES constants", () => {
    expect(SESSION_FILES).toEqual({
      ANSWERS: "answers.json",
      REQUEST: "request.json",
      STATUS: "status.json",
    });
  });

  it("exposes DEFAULT_SESSION_CONFIG defaults", () => {
    expect(DEFAULT_SESSION_CONFIG).toEqual({
      baseDir: "~/.local/share/auq/sessions",
      maxSessions: 100,
      retentionPeriod: 604800000,
      sessionTimeout: 0,
    });
  });

  it("supports interface type imports via satisfies", () => {
    const option = {
      description: "Recommended language",
      label: "TypeScript",
    } satisfies Option;

    const question = {
      multiSelect: false,
      options: [option, { label: "JavaScript" }],
      prompt: "Which language?",
      title: "Language",
    } satisfies Question;

    const userAnswer = {
      questionIndex: 0,
      selectedOption: "TypeScript",
      timestamp: new Date().toISOString(),
    } satisfies UserAnswer;

    const sessionAnswer = {
      answers: [userAnswer],
      sessionId: "session-1",
      timestamp: new Date().toISOString(),
    } satisfies SessionAnswer;

    const sessionConfig = {
      baseDir: "~/.local/share/auq/sessions",
      maxSessions: 50,
      retentionPeriod: 1000,
      sessionTimeout: 0,
    } satisfies SessionConfig;

    const sessionRequest = {
      questions: [question],
      sessionId: "session-1",
      status: "pending",
      timestamp: new Date().toISOString(),
    } satisfies SessionRequest;

    const sessionStatus = {
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      sessionId: "session-1",
      status: "in-progress",
      totalQuestions: 1,
    } satisfies SessionStatus;

    expect(sessionAnswer.answers[0]?.selectedOption).toBe("TypeScript");
    expect(sessionConfig.maxSessions).toBe(50);
    expect(sessionRequest.status).toBe("pending");
    expect(sessionStatus.status).toBe("in-progress");
  });
});