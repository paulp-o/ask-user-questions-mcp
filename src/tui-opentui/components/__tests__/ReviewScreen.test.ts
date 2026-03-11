/**
 * Tests for ReviewScreen component logic:
 * - Answer-to-UserAnswer conversion
 * - Elaborate marks handling
 * - Title/ID generation
 */
import { test, expect, describe } from "bun:test";
import type { UserAnswer } from "../../../session/types.js";
import { makeSessionRequest, makeMultiQuestionRequest, makeAnswer } from "../../__tests__/fixtures.js";

// ─── Answer-to-UserAnswer conversion (mirrors ReviewScreen useKeyboard Enter logic) ───

type AnswerMap = Map<number, {
  selectedOption?: string;
  selectedOptions?: string[];
  customText?: string;
}>;

function convertToUserAnswers(answers: AnswerMap): UserAnswer[] {
  const userAnswers: UserAnswer[] = [];
  answers.forEach((answer, questionIndex) => {
    if (answer.selectedOption || answer.selectedOptions || answer.customText) {
      userAnswers.push({
        customText: answer.customText,
        questionIndex,
        selectedOption: answer.selectedOption,
        selectedOptions: answer.selectedOptions,
        timestamp: new Date().toISOString(),
      });
    }
  });
  return userAnswers;
}

describe("convertToUserAnswers", () => {
  test("converts single-select answer correctly", () => {
    const answers: AnswerMap = new Map([
      [0, { selectedOption: "Option A" }],
    ]);
    const result = convertToUserAnswers(answers);
    expect(result).toHaveLength(1);
    expect(result[0].questionIndex).toBe(0);
    expect(result[0].selectedOption).toBe("Option A");
    expect(result[0].customText).toBeUndefined();
  });

  test("converts multi-select answer correctly", () => {
    const answers: AnswerMap = new Map([
      [0, { selectedOptions: ["Alpha", "Beta"] }],
    ]);
    const result = convertToUserAnswers(answers);
    expect(result).toHaveLength(1);
    expect(result[0].selectedOptions).toEqual(["Alpha", "Beta"]);
  });

  test("converts custom text answer correctly", () => {
    const answers: AnswerMap = new Map([
      [0, { customText: "My custom answer" }],
    ]);
    const result = convertToUserAnswers(answers);
    expect(result).toHaveLength(1);
    expect(result[0].customText).toBe("My custom answer");
  });

  test("skips questions with no answer", () => {
    const answers: AnswerMap = new Map([
      [0, {}],
      [1, { selectedOption: "Option B" }],
      [2, {}],
    ]);
    const result = convertToUserAnswers(answers);
    expect(result).toHaveLength(1);
    expect(result[0].questionIndex).toBe(1);
  });

  test("includes timestamp in each UserAnswer", () => {
    const answers: AnswerMap = new Map([[0, { selectedOption: "A" }]]);
    const result = convertToUserAnswers(answers);
    expect(result[0].timestamp).toBeDefined();
    expect(new Date(result[0].timestamp!).getTime()).toBeGreaterThan(0);
  });

  test("handles multiple answers in correct order", () => {
    const answers: AnswerMap = new Map([
      [2, { selectedOption: "C" }],
      [0, { selectedOption: "A" }],
      [1, { selectedOption: "B" }],
    ]);
    const result = convertToUserAnswers(answers);
    expect(result).toHaveLength(3);
    // Map preserves insertion order; questionIndex values are correct
    const indices = result.map((a) => a.questionIndex).sort();
    expect(indices).toEqual([0, 1, 2]);
  });

  test("returns empty array when all answers are empty", () => {
    const answers: AnswerMap = new Map([
      [0, {}],
      [1, {}],
    ]);
    const result = convertToUserAnswers(answers);
    expect(result).toHaveLength(0);
  });

  test("returns empty array for empty answer map", () => {
    const answers: AnswerMap = new Map();
    const result = convertToUserAnswers(answers);
    expect(result).toHaveLength(0);
  });
});

// ─── Question ID and title computation ────────────────────────────────────────────────────

describe("question ID and title generation", () => {
  function buildQuestionMeta(questions: Array<{ title?: string }>) {
    return questions.map((q, index) => ({
      questionId: `Q${index}`,
      questionTitle: q.title || `Q${index}`,
    }));
  }

  test("generates Q0, Q1, Q2 IDs for 3 questions", () => {
    const req = makeMultiQuestionRequest(3);
    const meta = buildQuestionMeta(req.questions);
    expect(meta[0].questionId).toBe("Q0");
    expect(meta[1].questionId).toBe("Q1");
    expect(meta[2].questionId).toBe("Q2");
  });

  test("uses question.title when available", () => {
    const req = makeMultiQuestionRequest(3);
    const meta = buildQuestionMeta(req.questions);
    // Multi-question fixture generates Q1, Q2, Q3 as titles
    expect(meta[0].questionTitle).toBe("Q1");
    expect(meta[1].questionTitle).toBe("Q2");
  });

  test("falls back to questionId when title is missing", () => {
    const questions = [{ title: undefined as unknown as string }, { title: "" }];
    const meta = buildQuestionMeta(questions);
    expect(meta[0].questionTitle).toBe("Q0");
    expect(meta[1].questionTitle).toBe("Q1"); // empty title treated as falsy => fallback
  });

  test("fixture question has correct title", () => {
    const req = makeSessionRequest();
    const meta = buildQuestionMeta(req.questions);
    expect(meta[0].questionId).toBe("Q0");
    expect(meta[0].questionTitle).toBe("Preference");
  });
});

// ─── Elaborate marks display logic ─────────────────────────────────────────────────────────

describe("elaborate marks display", () => {
  function formatElaboratePreview(text: string, maxLen = 50): string {
    if (text.length > maxLen) {
      return text.slice(0, maxLen) + "...";
    }
    return text;
  }

  test("shows full text when <= 50 chars", () => {
    const text = "Short explanation";
    expect(formatElaboratePreview(text)).toBe("Short explanation");
  });

  test("truncates text > 50 chars with ellipsis", () => {
    const text = "This is a very long elaborate text that exceeds the fifty character limit";
    const result = formatElaboratePreview(text);
    expect(result.endsWith("...")).toBe(true);
    expect(result.length).toBe(53); // 50 chars + '...'
  });

  test("text at exactly 50 chars is not truncated", () => {
    const text = "A".repeat(50);
    expect(formatElaboratePreview(text)).toBe(text);
    expect(formatElaboratePreview(text).endsWith("...")).toBe(false);
  });

  test("text at 51 chars is truncated", () => {
    const text = "A".repeat(51);
    const result = formatElaboratePreview(text);
    expect(result.endsWith("...")).toBe(true);
  });

  test("elaborate marks Map tracks per-question marks", () => {
    const elaborateMarks = new Map<number, string>();
    elaborateMarks.set(0, "Please explain reasoning");
    elaborateMarks.set(2, "");
    expect(elaborateMarks.has(0)).toBe(true);
    expect(elaborateMarks.has(1)).toBe(false);
    expect(elaborateMarks.has(2)).toBe(true);
    expect(elaborateMarks.get(0)).toBe("Please explain reasoning");
    expect(elaborateMarks.get(2)).toBe("");
  });
});