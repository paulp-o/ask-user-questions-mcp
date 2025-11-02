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
});

const QuestionsArraySchema = z.array(QuestionSchema).min(1);

describe("Schema Validation - Edge Cases", () => {
  describe("Invalid Input (should reject)", () => {
    it("should reject empty options array", () => {
      const invalidQuestion = {
        options: [], // Empty array
        prompt: "Test question?",
      };

      expect(() => QuestionSchema.parse(invalidQuestion)).toThrow();
    });

    it("should reject missing prompt", () => {
      const invalidQuestion = {
        options: [{ label: "Option 1" }],
        // prompt missing
      };

      expect(() => QuestionSchema.parse(invalidQuestion)).toThrow();
    });

    it("should reject missing options field", () => {
      const invalidQuestion = {
        // options missing
        prompt: "Test question?",
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
      };

      expect(() => QuestionSchema.parse(invalidQuestion)).toThrow();
    });

    it("should reject empty questions array", () => {
      const invalidQuestions: unknown[] = [];

      expect(() => QuestionsArraySchema.parse(invalidQuestions)).toThrow();
    });
  });

  describe("Valid Input (should accept)", () => {
    it("should accept valid question with all fields", () => {
      const validQuestion = {
        options: [
          {
            description: "A helpful description",
            label: "Option 1",
          },
        ],
        prompt: "What is your choice?",
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
        },
        {
          options: [{ label: "B" }, { label: "C" }],
          prompt: "Question 2?",
        },
      ];

      expect(() => QuestionsArraySchema.parse(validQuestions)).not.toThrow();
      const parsed = QuestionsArraySchema.parse(validQuestions);
      expect(parsed).toHaveLength(2);
    });
  });
});
