/**
 * Minimal schema validation tests for Question/Option types
 * Tests the most common edge cases to catch obvious bugs
 */

import { describe, expect, it } from "vitest";
import { QuestionSchema, QuestionsSchema } from "../core/ask-user-questions.js";

describe("Schema Validation - Edge Cases", () => {
  describe("Invalid Input (should reject)", () => {
    it("should reject missing title field", () => {
      const invalidQuestion = {
        // title missing
        options: [{ label: "Option 1" }, { label: "Option 2" }],
        prompt: "Test question?",
        multiSelect: false,
      };

      expect(() => QuestionSchema.parse(invalidQuestion)).toThrow();
    });

    it("should reject empty options array", () => {
      const invalidQuestion = {
        options: [], // Empty array
        prompt: "Test question?",
        title: "Test",
        multiSelect: false,
      };

      expect(() => QuestionSchema.parse(invalidQuestion)).toThrow();
    });

    it("should reject missing prompt", () => {
      const invalidQuestion = {
        options: [{ label: "Option 1" }, { label: "Option 2" }],
        title: "Test",
        // prompt missing
        multiSelect: false,
      };

      expect(() => QuestionSchema.parse(invalidQuestion)).toThrow();
    });

    it("should reject missing options field", () => {
      const invalidQuestion = {
        // options missing
        prompt: "Test question?",
        title: "Test",
        multiSelect: false,
      };

      expect(() => QuestionSchema.parse(invalidQuestion)).toThrow();
    });

    it("should reject option with missing label", () => {
      const invalidQuestion = {
        options: [
          {
            description: "A description",
            // label missing
          },
          { label: "Option 2" },
        ],
        prompt: "Test question?",
        title: "Test",
        multiSelect: false,
      };

      expect(() => QuestionSchema.parse(invalidQuestion)).toThrow();
    });

    it("should reject empty questions array", () => {
      const invalidQuestions: unknown[] = [];

      expect(() => QuestionsSchema.parse(invalidQuestions)).toThrow();
    });
  });

  describe("Valid Input (should accept)", () => {
    it("should accept valid question with title", () => {
      const validQuestion = {
        options: [
          {
            description: "A helpful description",
            label: "Option 1",
          },
          {
            description: "Another helpful description",
            label: "Option 2",
          },
        ],
        prompt: "What is your choice?",
        title: "Language",
        multiSelect: false,
      };

      expect(() => QuestionSchema.parse(validQuestion)).not.toThrow();
      const parsed = QuestionSchema.parse(validQuestion);
      expect(parsed.title).toBe("Language");
      expect(parsed.prompt).toBe("What is your choice?");
      expect(parsed.options).toHaveLength(2);
    });

    it("should accept valid question with all fields", () => {
      const validQuestion = {
        options: [
          {
            description: "A helpful description",
            label: "Option 1",
          },
          {
            description: "Another helpful description",
            label: "Option 2",
          },
        ],
        prompt: "What is your choice?",
        title: "Framework",
        multiSelect: false,
      };

      expect(() => QuestionSchema.parse(validQuestion)).not.toThrow();
      const parsed = QuestionSchema.parse(validQuestion);
      expect(parsed.prompt).toBe("What is your choice?");
      expect(parsed.options).toHaveLength(2);
    });

    it("should accept valid question with description omitted", () => {
      const validQuestion = {
        options: [
          {
            label: "Option 1",
            // description omitted (optional)
          },
          {
            label: "Option 2",
          },
        ],
        prompt: "What is your choice?",
        title: "Choice",
        multiSelect: false,
      };

      expect(() => QuestionSchema.parse(validQuestion)).not.toThrow();
      const parsed = QuestionSchema.parse(validQuestion);
      expect(parsed.options[0].description).toBeUndefined();
    });

    it("should accept multiple valid questions", () => {
      const validQuestions = [
        {
          options: [{ label: "A" }, { label: "B" }],
          prompt: "Question 1?",
          title: "First",
          multiSelect: false,
        },
        {
          options: [{ label: "B" }, { label: "C" }],
          prompt: "Question 2?",
          title: "Second",
          multiSelect: false,
        },
      ];

      expect(() => QuestionsSchema.parse(validQuestions)).not.toThrow();
      const parsed = QuestionsSchema.parse(validQuestions);
      expect(parsed).toHaveLength(2);
    });

    it("should accept question with multiSelect: true", () => {
      const multiSelectQuestion = {
        options: [{ label: "A" }, { label: "B" }, { label: "C" }],
        prompt: "Select multiple options",
        title: "Features",
        multiSelect: true,
      };

      expect(() => QuestionSchema.parse(multiSelectQuestion)).not.toThrow();
      const parsed = QuestionSchema.parse(multiSelectQuestion);
      expect(parsed.multiSelect).toBe(true);
    });

    it("should accept question with multiSelect: false", () => {
      const singleSelectQuestion = {
        options: [{ label: "A" }, { label: "B" }],
        prompt: "Select one option",
        title: "Choice",
        multiSelect: false,
      };

      expect(() => QuestionSchema.parse(singleSelectQuestion)).not.toThrow();
      const parsed = QuestionSchema.parse(singleSelectQuestion);
      expect(parsed.multiSelect).toBe(false);
    });

    it("should reject question with multiSelect omitted", () => {
      const defaultQuestion = {
        options: [{ label: "A" }, { label: "B" }],
        prompt: "Default single-select",
        title: "Default",
      };

      expect(() => QuestionSchema.parse(defaultQuestion)).toThrow();
    });
  });
});
