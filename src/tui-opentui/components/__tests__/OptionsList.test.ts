/**
 * Tests for OptionsList component logic:
 * - Recommended option detection
 * - Option index computation
 * - Focus index boundary calculation
 */
import { test, expect, describe } from "bun:test";
import {
  isRecommendedOption,
  extractCleanLabel,
  RECOMMENDED_PATTERNS,
} from "../../../tui/shared/utils/recommended.js";
import { makeSessionRequest, makeMultiSelectRequest } from "../../__tests__/fixtures.js";

describe("isRecommendedOption", () => {
  test("detects (recommended) in parentheses - case insensitive", () => {
    expect(isRecommendedOption("Option A (recommended)")).toBe(true);
    expect(isRecommendedOption("Option A (Recommended)")).toBe(true);
    expect(isRecommendedOption("Option A (RECOMMENDED)")).toBe(true);
  });

  test("detects [recommended] in square brackets - case insensitive", () => {
    expect(isRecommendedOption("[recommended] Option A")).toBe(true);
    expect(isRecommendedOption("[Recommended] Option A")).toBe(true);
  });

  test("detects Korean (추천) marker", () => {
    expect(isRecommendedOption("Option A (추천)")).toBe(true);
    expect(isRecommendedOption("(추천) Option A")).toBe(true);
  });

  test("detects Korean [추천] in brackets", () => {
    expect(isRecommendedOption("[추천] Option A")).toBe(true);
  });

  test("returns false for plain options without recommended marker", () => {
    expect(isRecommendedOption("Option A")).toBe(false);
    expect(isRecommendedOption("Alpha")).toBe(false);
    expect(isRecommendedOption("")).toBe(false);
    expect(isRecommendedOption("recommended without delimiters")).toBe(false);
  });

  test("returns false for mismatched delimiters", () => {
    // Parenthesis open but bracket close - not valid pattern
    expect(isRecommendedOption("Option (recommended]")).toBe(false);
    expect(isRecommendedOption("Option [recommended)")).toBe(false);
  });

  test("fixture options: only third option is recommended", () => {
    const request = makeSessionRequest();
    const options = request.questions[0].options;
    expect(isRecommendedOption(options[0].label)).toBe(false); // Option A
    expect(isRecommendedOption(options[1].label)).toBe(false); // Option B
    expect(isRecommendedOption(options[2].label)).toBe(true);  // Option C (Recommended)
  });

  test("multi-select fixture: no options are recommended", () => {
    const request = makeMultiSelectRequest();
    const options = request.questions[0].options;
    for (const opt of options) {
      expect(isRecommendedOption(opt.label)).toBe(false);
    }
  });
});

describe("extractCleanLabel", () => {
  test("removes (recommended) suffix", () => {
    expect(extractCleanLabel("Option A (recommended)")).toBe("Option A");
    expect(extractCleanLabel("Option A (Recommended)")).toBe("Option A");
  });

  test("removes [recommended] prefix", () => {
    expect(extractCleanLabel("[recommended] Option A")).toBe("Option A");
  });

  test("removes Korean (추천) marker", () => {
    expect(extractCleanLabel("Option A (추천)")).toBe("Option A");
  });

  test("removes Korean [추천] marker", () => {
    expect(extractCleanLabel("[추천] Option A")).toBe("Option A");
  });

  test("trims resulting whitespace", () => {
    expect(extractCleanLabel("  Option A  (recommended)  ")).toBe("Option A");
  });

  test("collapses multiple spaces after removal", () => {
    expect(extractCleanLabel("Option   A  (recommended)")).toBe("Option A");
  });

  test("returns unchanged label for non-recommended options", () => {
    expect(extractCleanLabel("Option A")).toBe("Option A");
    expect(extractCleanLabel("Alpha")).toBe("Alpha");
  });

  test("handles empty string", () => {
    expect(extractCleanLabel("")).toBe("");
  });
});

describe("RECOMMENDED_PATTERNS", () => {
  test("EN pattern matches case insensitively", () => {
    expect(RECOMMENDED_PATTERNS.EN.test("(recommended)")).toBe(true);
    expect(RECOMMENDED_PATTERNS.EN.test("(RECOMMENDED)")).toBe(true);
    expect(RECOMMENDED_PATTERNS.EN.test("[recommended]")).toBe(true);
  });

  test("KO pattern matches Korean 추천", () => {
    expect(RECOMMENDED_PATTERNS.KO.test("(추천)")).toBe(true);
    expect(RECOMMENDED_PATTERNS.KO.test("[추천]")).toBe(true);
  });
});

describe("OptionsList index computation logic", () => {
  /**
   * Simulates the index calculation from OptionsList:
   * customInputIndex = options.length
   * elaborateIndex   = options.length + 1
   * maxIndex         = showCustomInput ? elaborateIndex : options.length - 1
   */
  function computeIndices(optionCount: number, showCustomInput: boolean) {
    const customInputIndex = optionCount;
    const elaborateIndex = optionCount + 1;
    const maxIndex = showCustomInput ? elaborateIndex : optionCount - 1;
    return { customInputIndex, elaborateIndex, maxIndex };
  }

  test("without custom input: maxIndex is options.length - 1", () => {
    const { maxIndex } = computeIndices(3, false);
    expect(maxIndex).toBe(2);
  });

  test("with custom input: maxIndex is elaborateIndex (options.length + 1)", () => {
    const { maxIndex, elaborateIndex } = computeIndices(3, true);
    expect(maxIndex).toBe(elaborateIndex);
    expect(maxIndex).toBe(4);
  });

  test("customInputIndex is always options.length", () => {
    expect(computeIndices(0, true).customInputIndex).toBe(0);
    expect(computeIndices(3, true).customInputIndex).toBe(3);
    expect(computeIndices(5, true).customInputIndex).toBe(5);
  });

  test("elaborateIndex is always options.length + 1", () => {
    expect(computeIndices(0, true).elaborateIndex).toBe(1);
    expect(computeIndices(3, true).elaborateIndex).toBe(4);
  });

  test("isCustomInputFocused correctly identifies custom input focus", () => {
    const optionCount = 3;
    const { customInputIndex } = computeIndices(optionCount, true);
    const isCustomInputFocused = (focusedIndex: number) => focusedIndex === customInputIndex;
    expect(isCustomInputFocused(3)).toBe(true);  // at customInputIndex
    expect(isCustomInputFocused(2)).toBe(false); // at last option
    expect(isCustomInputFocused(4)).toBe(false); // at elaborate index
  });

  test("isElaborateFocused correctly identifies elaborate input focus", () => {
    const optionCount = 3;
    const { elaborateIndex } = computeIndices(optionCount, true);
    const isElaborateFocused = (focusedIndex: number) => focusedIndex === elaborateIndex;
    expect(isElaborateFocused(4)).toBe(true);  // at elaborateIndex
    expect(isElaborateFocused(3)).toBe(false); // at customInputIndex
  });

  test("focus boundary: down nav cannot exceed maxIndex", () => {
    const { maxIndex } = computeIndices(3, true);
    const clampDown = (prev: number) => Math.min(maxIndex, prev + 1);
    expect(clampDown(3)).toBe(4); // advance from customInput to elaborate
    expect(clampDown(4)).toBe(4); // clamped at maxIndex
    expect(clampDown(maxIndex)).toBe(maxIndex);
  });

  test("focus boundary: up nav cannot go below 0", () => {
    const clampUp = (prev: number) => Math.max(0, prev - 1);
    expect(clampUp(1)).toBe(0);
    expect(clampUp(0)).toBe(0);
  });
});