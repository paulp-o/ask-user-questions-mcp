import { describe, expect, it } from "vitest";

import {
  AskUserQuestionsParametersSchema,
  createQuestionSchema,
  DEFAULT_LIMITS,
  GetAnsweredQuestionsArgsSchema,
  GET_ANSWERED_QUESTIONS_DESCRIPTION,
  OptionSchema,
  QuestionSchema,
  SCHEMA_LIMITS,
  TOOL_DESCRIPTION,
  type GetAnsweredQuestionsArgs,
  type QuestionInput,
} from "../schemas.js";

describe("shared schemas", () => {
  it("parses OptionSchema and QuestionSchema", () => {
    const option = OptionSchema.parse({
      description: "TypeScript with strict mode",
      label: "TypeScript",
    });

    expect(option.label).toBe("TypeScript");

    const question = QuestionSchema.parse({
      multiSelect: false,
      options: [{ label: "TypeScript" }, { label: "JavaScript" }],
      prompt: "Which language do you want to use?",
      title: "Language",
    });

    expect(question.options).toHaveLength(2);
    expect(() => OptionSchema.parse({})).toThrow();
  });

  it("respects createQuestionSchema custom limits", () => {
    const limitedQuestionSchema = createQuestionSchema(2);

    expect(() =>
      limitedQuestionSchema.parse({
        multiSelect: true,
        options: [{ label: "A" }, { label: "B" }],
        prompt: "Pick options",
        title: "Choices",
      }),
    ).not.toThrow();

    expect(() =>
      limitedQuestionSchema.parse({
        multiSelect: true,
        options: [{ label: "A" }, { label: "B" }, { label: "C" }],
        prompt: "Pick options",
        title: "Choices",
      }),
    ).toThrow();
  });

  it("parses AskUserQuestionsParametersSchema", () => {
    const parsed = AskUserQuestionsParametersSchema.parse({
      questions: [
        {
          multiSelect: false,
          options: [{ label: "A" }, { label: "B" }],
          prompt: "Pick one",
          title: "Choice",
        },
      ],
    });

    expect(parsed.questions).toHaveLength(1);
    expect(parsed.nonBlocking).toBe(false);
  });

  it("parses GetAnsweredQuestionsArgsSchema", () => {
    const parsed = GetAnsweredQuestionsArgsSchema.parse({
      session_id: "12345678",
    });

    expect(parsed.session_id).toBe("12345678");
    expect(parsed.blocking).toBe(false);
  });

  it("exposes schema types and constants", () => {
    const parsedQuestion = QuestionSchema.parse({
      multiSelect: false,
      options: [{ label: "One" }, { label: "Two" }],
      prompt: "Pick one",
      title: "Selection",
    });
    const typedQuestion: QuestionInput = parsedQuestion;

    const parsedArgs = GetAnsweredQuestionsArgsSchema.parse({
      blocking: true,
      session_id: "abcd1234",
    });
    const typedArgs: GetAnsweredQuestionsArgs = parsedArgs;

    expect(typedQuestion.title).toBe("Selection");
    expect(typedArgs.blocking).toBe(true);

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
    expect(TOOL_DESCRIPTION).toContain("ask the user questions");
    expect(GET_ANSWERED_QUESTIONS_DESCRIPTION).toContain(
      "Fetch answers for a previously submitted non-blocking question set",
    );
  });
});