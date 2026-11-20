import { describe, it, expect } from "vitest";
import {
  SESSION_FILES,
  DEFAULT_SESSION_CONFIG,
  type Option,
  type Question,
  type SessionAnswer,
  type SessionConfig,
  type SessionRequest,
  type SessionStatus,
  type UserAnswer,
  type SessionStatusValue,
} from "../session-types.js";

describe("session-types", () => {
  it("SESSION_FILES has correct keys and values", () => {
    expect(SESSION_FILES.ANSWERS).toBe("answers.json");
    expect(SESSION_FILES.REQUEST).toBe("request.json");
    expect(SESSION_FILES.STATUS).toBe("status.json");
  });

  it("DEFAULT_SESSION_CONFIG has expected defaults", () => {
    expect(DEFAULT_SESSION_CONFIG.maxSessions).toBe(100);
    expect(DEFAULT_SESSION_CONFIG.retentionPeriod).toBe(604800000);
    expect(DEFAULT_SESSION_CONFIG.sessionTimeout).toBe(0);
  });

  it("SessionStatusValue covers all expected statuses", () => {
    const statuses: SessionStatusValue[] = [
      "abandoned",
      "completed",
      "elaborate_requested",
      "in-progress",
      "pending",
      "rejected",
      "rephrase_requested",
      "timed_out",
    ];
    expect(statuses.length).toBe(8);
  });

  it("types are structurally correct", () => {
    const option: Option = { label: "Test" };
    const question: Question = { options: [option], prompt: "Why?", title: "Why" };
    const userAnswer: UserAnswer = { questionIndex: 0, timestamp: new Date().toISOString() };
    const sessionAnswer: SessionAnswer = {
      answers: [userAnswer],
      sessionId: "abc",
      timestamp: new Date().toISOString(),
    };
    const sessionConfig: SessionConfig = { baseDir: "/tmp" };
    const sessionRequest: SessionRequest = {
      questions: [question],
      sessionId: "abc",
      status: "pending",
      timestamp: new Date().toISOString(),
    };
    const sessionStatus: SessionStatus = {
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      sessionId: "abc",
      status: "pending",
      totalQuestions: 1,
    };
    expect(option.label).toBe("Test");
    expect(question.prompt).toBe("Why?");
    expect(userAnswer.questionIndex).toBe(0);
    expect(sessionAnswer.sessionId).toBe("abc");
    expect(sessionConfig.baseDir).toBe("/tmp");
    expect(sessionRequest.status).toBe("pending");
    expect(sessionStatus.status).toBe("pending");
  });
});