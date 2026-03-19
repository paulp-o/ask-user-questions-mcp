import { describe, expect, it } from "vitest";

import { ResponseFormatter } from "../src/session/ResponseFormatter.js";
import type { Question, SessionAnswer } from "../src/shared/types.js";

const sessionId = "12345678-1234-4234-8234-1234567890ab";
const questions: Question[] = [
  {
    title: "Language",
    prompt: "Pick a language",
    options: [
      { label: "TypeScript", description: "Safer JS" },
      { label: "JavaScript" },
    ],
  },
];
const answers: SessionAnswer = {
  sessionId,
  timestamp: new Date().toISOString(),
  answers: [
    {
      questionIndex: 0,
      selectedOption: "TypeScript",
      timestamp: new Date().toISOString(),
    },
  ],
};

describe("ResponseFormatter", () => {
  it("formatSuccessResponse includes session and formatted answer", () => {
    const result = ResponseFormatter.formatSuccessResponse(
      sessionId,
      answers,
      questions,
    );

    expect(result).toContain("[Session: 12345678 | Questions: 1]");
    expect(result).toContain("Here are the user's answers:");
    expect(result).toContain("1. Pick a language");
    expect(result).toContain("→ TypeScript — Safer JS");
  });

  it("formatNonBlockingResponse matches pending format", () => {
    const result = ResponseFormatter.formatNonBlockingResponse(sessionId, 3);

    expect(result).toContain("[Session: 12345678 | Questions: 3 | Status: pending]");
    expect(result).toContain("Questions submitted successfully.");
    expect(result).toContain("get_answered_questions");
  });

  it("formatGetAnsweredResponse returns completed/pending/rejected variants", () => {
    const completed = ResponseFormatter.formatGetAnsweredResponse({
      sessionId,
      status: "completed",
      answers,
      questions,
    });
    const pending = ResponseFormatter.formatGetAnsweredResponse({
      sessionId,
      status: "pending",
    });
    const rejected = ResponseFormatter.formatGetAnsweredResponse({
      sessionId,
      status: "rejected",
      reason: "skip",
    });

    expect(completed).toContain("Here are the user's answers:");
    expect(pending).toContain("Status: pending");
    expect(rejected).toContain("Status: rejected");
    expect(rejected).toContain("Reason: \"skip\"");
  });
});