import { describe, expect, it } from "vitest";

import {
  AskUserQuestionsParametersSchema,
  DEFAULT_LIMITS,
  OptionSchema,
  QuestionSchema,
  QuestionsSchema,
  SCHEMA_LIMITS,
} from "../src/shared/schemas.js";

describe("shared schemas", () => {
  it("validates OptionSchema with valid and invalid payloads", () => {
    expect(
      OptionSchema.parse({
        label: "TypeScript",
        description: "Strong typing",
      }),
    ).toEqual({
      label: "TypeScript",
      description: "Strong typing",
    });

    expect(() => OptionSchema.parse({ description: "Missing label" })).toThrow();
    expect(() => OptionSchema.parse({ label: 123 })).toThrow();
  });

  it("validates QuestionSchema with options and multiSelect", () => {
    const valid = QuestionSchema.parse({
      title: "Language",
      prompt: "Which language do you prefer?",
      options: [{ label: "TypeScript" }, { label: "JavaScript" }],
      multiSelect: true,
    });

    expect(valid.multiSelect).toBe(true);
    expect(valid.options).toHaveLength(2);

    expect(() =>
      QuestionSchema.parse({
        title: "Invalid",
        prompt: "Not enough options?",
        options: [{ label: "Only one" }],
        multiSelect: false,
      }),
    ).toThrow();
  });

  it("validates QuestionsSchema array limits", () => {
    const validQuestions = [
      {
        title: "Q1",
        prompt: "Question 1?",
        options: [{ label: "A" }, { label: "B" }],
        multiSelect: false,
      },
    ];

    expect(QuestionsSchema.parse(validQuestions)).toHaveLength(1);
    expect(() => QuestionsSchema.parse([])).toThrow();

    const tooManyQuestions = Array.from(
      { length: SCHEMA_LIMITS.MAX_QUESTIONS + 1 },
      (_, index) => ({
        title: `Q${index + 1}`,
        prompt: `Question ${index + 1}?`,
        options: [{ label: "A" }, { label: "B" }],
        multiSelect: false,
      }),
    );

    expect(() => QuestionsSchema.parse(tooManyQuestions)).toThrow();
  });

  it("validates AskUserQuestionsParametersSchema full payload", () => {
    const parsed = AskUserQuestionsParametersSchema.parse({
      questions: [
        {
          title: "Runtime",
          prompt: "Which runtime should we use?",
          options: [{ label: "bun" }, { label: "node" }],
          multiSelect: false,
        },
      ],
      nonBlocking: true,
    });

    expect(parsed.questions).toHaveLength(1);
    expect(parsed.nonBlocking).toBe(true);

    const defaultBlocking = AskUserQuestionsParametersSchema.parse({
      questions: [
        {
          title: "Framework",
          prompt: "Which framework?",
          options: [{ label: "React" }, { label: "Vue" }],
          multiSelect: false,
        },
      ],
    });

    expect(defaultBlocking.nonBlocking).toBe(false);
    expect(() => AskUserQuestionsParametersSchema.parse({ nonBlocking: true })).toThrow();
  });

  it("exports SCHEMA_LIMITS and DEFAULT_LIMITS constants", () => {
    expect(SCHEMA_LIMITS).toEqual({
      MAX_OPTIONS: 10,
      MAX_QUESTIONS: 10,
      MIN_OPTIONS: 2,
      MIN_QUESTIONS: 1,
    });

    expect(DEFAULT_LIMITS).toEqual({
      maxOptions: 5,
      maxQuestions: 5,
      recommendedOptions: 4,
      recommendedQuestions: 4,
    });
  });
});