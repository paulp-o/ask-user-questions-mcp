import { describe, expect, it } from "vitest";

import { ResponseFormatter } from "../response/format.js";
import type { Question, SessionAnswer } from "../session/types.js";

const singleSelectQuestions: Question[] = [
  {
    multiSelect: false,
    options: [
      { description: "Type-safe and modern", label: "TypeScript" },
      { description: "Flexible scripting", label: "JavaScript" },
    ],
    prompt: "Which language do you want to use?",
    title: "Language",
  },
];

describe("ResponseFormatter", () => {
  it("formats user response for single-select answers", () => {
    const answers: SessionAnswer = {
      answers: [
        {
          questionIndex: 0,
          selectedOption: "TypeScript",
          timestamp: new Date().toISOString(),
        },
      ],
      sessionId: "12345678-aaaa-bbbb-cccc-123456789abc",
      timestamp: new Date().toISOString(),
    };

    const formatted = ResponseFormatter.formatUserResponse(
      answers,
      singleSelectQuestions,
      answers.sessionId,
    );

    expect(formatted).toContain("[Session: 12345678 | Questions: 1]");
    expect(formatted).toContain("Here are the user's answers:");
    expect(formatted).toContain("1. Which language do you want to use?");
    expect(formatted).toContain("→ TypeScript — Type-safe and modern");
  });

  it("formats user response for multi-select answers", () => {
    const questions: Question[] = [
      {
        multiSelect: true,
        options: [
          { label: "Auth" },
          { label: "Logging" },
          { label: "Metrics" },
        ],
        prompt: "Which features do you want to enable?",
        title: "Features",
      },
    ];

    const answers: SessionAnswer = {
      answers: [
        {
          questionIndex: 0,
          selectedOptions: ["Auth", "Metrics"],
          timestamp: new Date().toISOString(),
        },
      ],
      sessionId: "abcdef12-aaaa-bbbb-cccc-ddddeeeeffff",
      timestamp: new Date().toISOString(),
    };

    const formatted = ResponseFormatter.formatUserResponse(answers, questions);

    expect(formatted).toContain("1. Which features do you want to enable?");
    expect(formatted).toContain("→ Auth");
    expect(formatted).toContain("→ Metrics");
  });

  it("throws when validateAnswers receives invalid input", () => {
    const validAnswers: SessionAnswer = {
      answers: [
        {
          questionIndex: 2,
          selectedOption: "TypeScript",
          timestamp: new Date().toISOString(),
        },
      ],
      sessionId: "session-1",
      timestamp: new Date().toISOString(),
    };

    expect(() =>
      ResponseFormatter.validateAnswers(validAnswers, singleSelectQuestions),
    ).toThrow("invalid question index");
    expect(() => ResponseFormatter.validateAnswers({ ...validAnswers, answers: [] }, []),).toThrow();
  });

  it("formats non-blocking submission status", () => {
    const formatted = ResponseFormatter.formatNonBlockingSubmission(
      "12345678-aaaa-bbbb-cccc-123456789abc",
      3,
    );

    expect(formatted).toContain("[Session: 12345678 | Questions: 3 | Status: pending]");
    expect(formatted).toContain("Questions submitted successfully.");
    expect(formatted).toContain("get_answered_questions(session_id=\"12345678\")");
  });

  it("formats pending and rejected status messages", () => {
    const pending = ResponseFormatter.formatPendingStatus(
      "12345678-aaaa-bbbb-cccc-123456789abc",
      "4m 45s",
    );
    const rejectedWithReason = ResponseFormatter.formatRejectedStatus(
      "12345678-aaaa-bbbb-cccc-123456789abc",
      "Need fewer options",
    );
    const rejectedWithoutReason = ResponseFormatter.formatRejectedStatus(
      "12345678-aaaa-bbbb-cccc-123456789abc",
    );

    expect(pending).toContain("[Session: 12345678 | Status: pending | Remaining: 4m 45s]");
    expect(pending).toContain("No answers yet.");
    expect(rejectedWithReason).toContain(
      "User rejected this question set. Reason: \"Need fewer options\"",
    );
    expect(rejectedWithoutReason).toContain("User rejected this question set.");
  });
});