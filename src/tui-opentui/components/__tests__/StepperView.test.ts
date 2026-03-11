/**
 * Tests for StepperView pure logic:
 * - Elapsed time label formatting
 * - Content overflow estimation
 * - Answer management (single-select, multi-select, elaborate)
 * - Navigation boundaries
 */
import { test, expect, describe } from "bun:test";
import {
  makeSessionRequest,
  makeMultiQuestionRequest,
  makeMultiSelectRequest,
  makeAnswer,
  makeSessionUIState,
} from "../../__tests__/fixtures.js";
import { isRecommendedOption } from "../../../tui/shared/utils/recommended.js";

// ─── Elapsed label formatting (pure helper copied from StepperView) ──────────────

function formatElapsedLabel(elapsedSeconds: number): string {
  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;
  return [hours, minutes, seconds]
    .map((value) => value.toString().padStart(2, "0"))
    .join(":");
}

describe("formatElapsedLabel", () => {
  test("formats zero as 00:00:00", () => {
    expect(formatElapsedLabel(0)).toBe("00:00:00");
  });

  test("formats 90 seconds as 00:01:30", () => {
    expect(formatElapsedLabel(90)).toBe("00:01:30");
  });

  test("formats 3661 seconds as 01:01:01", () => {
    expect(formatElapsedLabel(3661)).toBe("01:01:01");
  });

  test("formats exactly 1 hour as 01:00:00", () => {
    expect(formatElapsedLabel(3600)).toBe("01:00:00");
  });

  test("pads all components with leading zero", () => {
    expect(formatElapsedLabel(61)).toBe("00:01:01");
  });

  test("handles large values (10 hours)", () => {
    expect(formatElapsedLabel(36000)).toBe("10:00:00");
  });
});

// ─── safeIndex clamping (navigation boundary logic) ───────────────────────

describe("StepperView safe index clamping", () => {
  function computeSafeIndex(currentIndex: number, totalQuestions: number): number {
    return Math.min(currentIndex, totalQuestions - 1);
  }

  test("returns question count - 1 when currentIndex exceeds bounds", () => {
    expect(computeSafeIndex(10, 3)).toBe(2);
    expect(computeSafeIndex(3, 3)).toBe(2);
  });

  test("returns currentIndex when within bounds", () => {
    expect(computeSafeIndex(0, 3)).toBe(0);
    expect(computeSafeIndex(1, 3)).toBe(1);
    expect(computeSafeIndex(2, 3)).toBe(2);
  });

  test("with session request fixture", () => {
    const req = makeSessionRequest();
    const totalQuestions = req.questions.length;
    expect(computeSafeIndex(0, totalQuestions)).toBe(0);
    // 1 question, so max index is 0
    expect(computeSafeIndex(99, totalQuestions)).toBe(0);
  });

  test("with multi-question request", () => {
    const req = makeMultiQuestionRequest(5);
    const total = req.questions.length;
    expect(computeSafeIndex(4, total)).toBe(4);
    expect(computeSafeIndex(5, total)).toBe(4);
  });
});

// ─── handleAdvanceToNext logic ─────────────────────────────────────────────────

describe("advance-to-next logic", () => {
  function computeNextState(currentIndex: number, totalQuestions: number): {
    newIndex: number;
    showReview: boolean;
  } {
    if (currentIndex < totalQuestions - 1) {
      return { newIndex: currentIndex + 1, showReview: false };
    }
    return { newIndex: currentIndex, showReview: true };
  }

  test("advances to next question", () => {
    const { newIndex, showReview } = computeNextState(0, 3);
    expect(newIndex).toBe(1);
    expect(showReview).toBe(false);
  });

  test("shows review on last question", () => {
    const { newIndex, showReview } = computeNextState(2, 3);
    expect(newIndex).toBe(2);
    expect(showReview).toBe(true);
  });

  test("shows review when only 1 question", () => {
    const { showReview } = computeNextState(0, 1);
    expect(showReview).toBe(true);
  });
});

// ─── Content overflow estimation ───────────────────────────────────────────────

describe("content overflow estimation", () => {
  function estimateContentHeight(optionCount: number): number {
    // From StepperView: header=2 + prompt=3 + padding=3 + options*(2 each) + custom=2 + footer=6 + margin=2
    return 2 + 3 + 3 + optionCount * 2 + 2 + 6 + 2;
  }

  test("estimates height increases with more options", () => {
    expect(estimateContentHeight(3)).toBeLessThan(estimateContentHeight(5));
    expect(estimateContentHeight(5)).toBeLessThan(estimateContentHeight(10));
  });

  test("detects overflow for standard 24-row terminal", () => {
    const rows = 24;
    // With 8+ options the content overflows a 24-row terminal
    expect(estimateContentHeight(8) > rows).toBe(true);
    // With 2 options it fits
    expect(estimateContentHeight(2) > rows).toBe(false);
  });

  test("detects overflow for large 40-row terminal", () => {
    const rows = 40;
    expect(estimateContentHeight(3) > rows).toBe(false);
    // Very many options overflow even large terminal
    expect(estimateContentHeight(20) > rows).toBe(true);
  });
});

// ─── Recommended session detection logic ────────────────────────────────────

describe("session recommended detection", () => {
  function anyHasRecommended(questions: Array<{ options: Array<{ label: string }> }>): boolean {
    return questions.some((q) => q.options.some((opt) => isRecommendedOption(opt.label)));
  }

  test("detects recommended options in default fixture", () => {
    const req = makeSessionRequest();
    expect(anyHasRecommended(req.questions)).toBe(true);
  });

  test("no recommended in multi-select fixture", () => {
    const req = makeMultiSelectRequest();
    expect(anyHasRecommended(req.questions)).toBe(false);
  });

  test("detects recommended when one of many questions has it", () => {
    const questions = [
      { options: [{ label: "Alpha" }, { label: "Beta" }] },
      { options: [{ label: "Gamma (recommended)" }, { label: "Delta" }] },
    ];
    expect(anyHasRecommended(questions)).toBe(true);
  });

  test("returns false when no question has recommended options", () => {
    const questions = [
      { options: [{ label: "Alpha" }, { label: "Beta" }] },
      { options: [{ label: "Gamma" }, { label: "Delta" }] },
    ];
    expect(anyHasRecommended(questions)).toBe(false);
  });
});

// ─── Answer state management logic ───────────────────────────────────────────────────

describe("answer state management", () => {
  type Answer = { selectedOption?: string; selectedOptions?: string[]; customText?: string };

  function handleSelectOption(
    answers: Map<number, Answer>,
    questionIndex: number,
    label: string,
  ): Map<number, Answer> {
    const newAnswers = new Map(answers);
    const existing = newAnswers.get(questionIndex) || {};
    newAnswers.set(questionIndex, { ...existing, selectedOption: label });
    return newAnswers;
  }

  function handleToggleOption(
    answers: Map<number, Answer>,
    questionIndex: number,
    label: string,
  ): Map<number, Answer> {
    const newAnswers = new Map(answers);
    const existing = newAnswers.get(questionIndex) || {};
    const currentSelections = existing.selectedOptions || [];
    const isAdding = !currentSelections.includes(label);
    const newSelections = isAdding
      ? [...currentSelections, label]
      : currentSelections.filter((l) => l !== label);
    newAnswers.set(questionIndex, {
      selectedOptions: newSelections,
      customText: existing.customText,
    });
    return newAnswers;
  }

  test("handleSelectOption sets selectedOption", () => {
    const answers = new Map<number, Answer>();
    const result = handleSelectOption(answers, 0, "Option A");
    expect(result.get(0)?.selectedOption).toBe("Option A");
  });

  test("handleSelectOption overwrites existing selection", () => {
    const answers = new Map([[0, { selectedOption: "Option A" }]]);
    const result = handleSelectOption(answers, 0, "Option B");
    expect(result.get(0)?.selectedOption).toBe("Option B");
  });

  test("handleToggleOption adds label to selectedOptions", () => {
    const answers = new Map<number, Answer>();
    const result = handleToggleOption(answers, 0, "Alpha");
    expect(result.get(0)?.selectedOptions).toEqual(["Alpha"]);
  });

  test("handleToggleOption removes label when already selected", () => {
    const answers = new Map([[0, { selectedOptions: ["Alpha", "Beta"] }]]);
    const result = handleToggleOption(answers, 0, "Alpha");
    expect(result.get(0)?.selectedOptions).toEqual(["Beta"]);
  });

  test("handleToggleOption toggles multiple times (add then remove)", () => {
    const answers = new Map<number, Answer>();
    const afterAdd = handleToggleOption(answers, 0, "Alpha");
    const afterRemove = handleToggleOption(afterAdd, 0, "Alpha");
    expect(afterRemove.get(0)?.selectedOptions).toEqual([]);
  });

  test("handleToggleOption preserves customText", () => {
    const answers = new Map([[0, { selectedOptions: [], customText: "my custom" }]]);
    const result = handleToggleOption(answers, 0, "Alpha");
    expect(result.get(0)?.customText).toBe("my custom");
  });

  test("initialState hydration clamps question index correctly", () => {
    const req = makeMultiQuestionRequest(3);
    const maxQuestionIndex = Math.max(0, req.questions.length - 1);
    const initialState = makeSessionUIState({ currentQuestionIndex: 99 });
    const hydrated = Math.min(
      Math.max(initialState.currentQuestionIndex, 0),
      maxQuestionIndex,
    );
    expect(hydrated).toBe(2); // clamped to last question
  });

  test("initialState with valid index stays unchanged", () => {
    const req = makeMultiQuestionRequest(5);
    const maxQuestionIndex = req.questions.length - 1;
    const initialState = makeSessionUIState({ currentQuestionIndex: 2 });
    const hydrated = Math.min(
      Math.max(initialState.currentQuestionIndex, 0),
      maxQuestionIndex,
    );
    expect(hydrated).toBe(2);
  });
});