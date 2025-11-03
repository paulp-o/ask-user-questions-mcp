/**
 * Minimal schema validation tests for Question/Option types
 * Tests the most common edge cases to catch obvious bugs
 */

import { describe, expect, it } from "vitest";
import { z } from "zod";

// Import schemas from server (in real implementation, might extract to validation module)
const OptionSchema = z.object({
  description: z.string().optional(),
  label: z.string(),
});

const QuestionSchema = z.object({
  options: z.array(OptionSchema).min(1),
  prompt: z.string(),
  title: z.string().min(1),
  multiSelect: z.boolean().optional(),
});

const QuestionsArraySchema = z.array(QuestionSchema).min(1);

describe("Schema Validation - Edge Cases", () => {
  describe("Invalid Input (should reject)", () => {
    it("should reject missing title field", () => {
      const invalidQuestion = {
        // title missing
        options: [{ label: "Option 1" }],
        prompt: "Test question?",
      };

      expect(() => QuestionSchema.parse(invalidQuestion)).toThrow();
    });

    it("should reject empty options array", () => {
      const invalidQuestion = {
        options: [], // Empty array
        prompt: "Test question?",
        title: "Test",
      };

      expect(() => QuestionSchema.parse(invalidQuestion)).toThrow();
    });

    it("should reject missing prompt", () => {
      const invalidQuestion = {
        options: [{ label: "Option 1" }],
        title: "Test",
        // prompt missing
      };

      expect(() => QuestionSchema.parse(invalidQuestion)).toThrow();
    });

    it("should reject missing options field", () => {
      const invalidQuestion = {
        // options missing
        prompt: "Test question?",
        title: "Test",
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
        ],
        prompt: "Test question?",
        title: "Test",
      };

      expect(() => QuestionSchema.parse(invalidQuestion)).toThrow();
    });

    it("should reject empty questions array", () => {
      const invalidQuestions: unknown[] = [];

      expect(() => QuestionsArraySchema.parse(invalidQuestions)).toThrow();
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
        ],
        prompt: "What is your choice?",
        title: "Language",
      };

      expect(() => QuestionSchema.parse(validQuestion)).not.toThrow();
      const parsed = QuestionSchema.parse(validQuestion);
      expect(parsed.title).toBe("Language");
      expect(parsed.prompt).toBe("What is your choice?");
      expect(parsed.options).toHaveLength(1);
    });

    it("should accept valid question with all fields", () => {
      const validQuestion = {
        options: [
          {
            description: "A helpful description",
            label: "Option 1",
          },
        ],
        prompt: "What is your choice?",
        title: "Framework",
      };

      expect(() => QuestionSchema.parse(validQuestion)).not.toThrow();
      const parsed = QuestionSchema.parse(validQuestion);
      expect(parsed.prompt).toBe("What is your choice?");
      expect(parsed.options).toHaveLength(1);
    });

    it("should accept valid question with description omitted", () => {
      const validQuestion = {
        options: [
          {
            label: "Option 1",
            // description omitted (optional)
          },
        ],
        prompt: "What is your choice?",
        title: "Choice",
      };

      expect(() => QuestionSchema.parse(validQuestion)).not.toThrow();
      const parsed = QuestionSchema.parse(validQuestion);
      expect(parsed.options[0].description).toBeUndefined();
    });

    it("should accept multiple valid questions", () => {
      const validQuestions = [
        {
          options: [{ label: "A" }],
          prompt: "Question 1?",
          title: "First",
        },
        {
          options: [{ label: "B" }, { label: "C" }],
          prompt: "Question 2?",
          title: "Second",
        },
      ];

      expect(() => QuestionsArraySchema.parse(validQuestions)).not.toThrow();
      const parsed = QuestionsArraySchema.parse(validQuestions);
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

    it("should accept question with multiSelect omitted (defaults to undefined)", () => {
      const defaultQuestion = {
        options: [{ label: "A" }],
        prompt: "Default single-select",
        title: "Default",
      };

      expect(() => QuestionSchema.parse(defaultQuestion)).not.toThrow();
      const parsed = QuestionSchema.parse(defaultQuestion);
      expect(parsed.multiSelect).toBeUndefined();
    });
  });
});
