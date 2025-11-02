/**
 * Unit tests for Response Formatter
 */

import { describe, expect, it } from "vitest";

import type { Question, SessionAnswer, UserAnswer } from "../types.js";

import { ResponseFormatter } from "../ResponseFormatter.js";

describe("ResponseFormatter", () => {
  describe("formatUserResponse", () => {
    it("should format a single question with selected option", () => {
      const questions: Question[] = [
        {
          options: [
            {
              description: "Dynamic web language",
              label: "JavaScript",
            },
            {
              description: "Type-safe JavaScript",
              label: "TypeScript",
            },
          ],
          prompt: "What is your favorite programming language?",
        },
      ];

      const answers: SessionAnswer = {
        answers: [
          {
            questionIndex: 0,
            selectedOption: "TypeScript",
            timestamp: "2025-01-01T00:00:00Z",
          },
        ],
        sessionId: "test-123",
        timestamp: "2025-01-01T00:00:00Z",
      };

      const result = ResponseFormatter.formatUserResponse(answers, questions);

      expect(result).toBe(
        "Here are the user's answers:\n\n" +
          "1. What is your favorite programming language?\n" +
          "→ TypeScript — Type-safe JavaScript"
      );
    });

    it("should format multiple questions with selected options", () => {
      const questions: Question[] = [
        {
          options: [
            {
              description: "Dynamic web language",
              label: "JavaScript",
            },
            {
              description: "Type-safe JavaScript",
              label: "TypeScript",
            },
          ],
          prompt: "What is your favorite programming language?",
        },
        {
          options: [
            {
              description: "Frontend or backend web application",
              label: "Web",
            },
            {
              description: "Command-line tool",
              label: "CLI",
            },
          ],
          prompt: "What type of application are you building?",
        },
      ];

      const answers: SessionAnswer = {
        answers: [
          {
            questionIndex: 0,
            selectedOption: "TypeScript",
            timestamp: "2025-01-01T00:00:00Z",
          },
          {
            questionIndex: 1,
            selectedOption: "Web",
            timestamp: "2025-01-01T00:00:00Z",
          },
        ],
        sessionId: "test-123",
        timestamp: "2025-01-01T00:00:00Z",
      };

      const result = ResponseFormatter.formatUserResponse(answers, questions);

      expect(result).toBe(
        "Here are the user's answers:\n\n" +
          "1. What is your favorite programming language?\n" +
          "→ TypeScript — Type-safe JavaScript\n\n" +
          "2. What type of application are you building?\n" +
          "→ Web — Frontend or backend web application"
      );
    });

    it("should format custom text answer", () => {
      const questions: Question[] = [
        {
          options: [
            {
              description: "Frontend or backend web application",
              label: "Web",
            },
            {
              description: "Command-line tool",
              label: "CLI",
            },
          ],
          prompt: "What type of application are you building?",
        },
      ];

      const answers: SessionAnswer = {
        answers: [
          {
            customText: "Desktop app with Electron",
            questionIndex: 0,
            timestamp: "2025-01-01T00:00:00Z",
          },
        ],
        sessionId: "test-123",
        timestamp: "2025-01-01T00:00:00Z",
      };

      const result = ResponseFormatter.formatUserResponse(answers, questions);

      expect(result).toBe(
        "Here are the user's answers:\n\n" +
          "1. What type of application are you building?\n" +
          "→ Other: 'Desktop app with Electron'"
      );
    });

    it("should format mix of selected and custom answers", () => {
      const questions: Question[] = [
        {
          options: [
            {
              description: "Dynamic web language",
              label: "JavaScript",
            },
            {
              description: "Type-safe JavaScript",
              label: "TypeScript",
            },
          ],
          prompt: "What is your favorite programming language?",
        },
        {
          options: [
            {
              description: "Frontend or backend web application",
              label: "Web",
            },
            {
              description: "Command-line tool",
              label: "CLI",
            },
          ],
          prompt: "What type of application are you building?",
        },
      ];

      const answers: SessionAnswer = {
        answers: [
          {
            questionIndex: 0,
            selectedOption: "TypeScript",
            timestamp: "2025-01-01T00:00:00Z",
          },
          {
            customText: "Desktop app with Electron",
            questionIndex: 1,
            timestamp: "2025-01-01T00:00:00Z",
          },
        ],
        sessionId: "test-123",
        timestamp: "2025-01-01T00:00:00Z",
      };

      const result = ResponseFormatter.formatUserResponse(answers, questions);

      expect(result).toBe(
        "Here are the user's answers:\n\n" +
          "1. What is your favorite programming language?\n" +
          "→ TypeScript — Type-safe JavaScript\n\n" +
          "2. What type of application are you building?\n" +
          "→ Other: 'Desktop app with Electron'"
      );
    });

    it("should handle option without description", () => {
      const questions: Question[] = [
        {
          options: [
            {
              label: "Red",
            },
            {
              label: "Blue",
            },
          ],
          prompt: "Choose a color",
        },
      ];

      const answers: SessionAnswer = {
        answers: [
          {
            questionIndex: 0,
            selectedOption: "Red",
            timestamp: "2025-01-01T00:00:00Z",
          },
        ],
        sessionId: "test-123",
        timestamp: "2025-01-01T00:00:00Z",
      };

      const result = ResponseFormatter.formatUserResponse(answers, questions);

      expect(result).toBe(
        "Here are the user's answers:\n\n" + "1. Choose a color\n" + "→ Red"
      );
    });

    it("should escape single quotes in custom text", () => {
      const questions: Question[] = [
        {
          options: [
            {
              label: "Good",
            },
          ],
          prompt: "What is your feedback?",
        },
      ];

      const answers: SessionAnswer = {
        answers: [
          {
            customText: "It's great! I'm loving it!",
            questionIndex: 0,
            timestamp: "2025-01-01T00:00:00Z",
          },
        ],
        sessionId: "test-123",
        timestamp: "2025-01-01T00:00:00Z",
      };

      const result = ResponseFormatter.formatUserResponse(answers, questions);

      expect(result).toContain("It\\'s great! I\\'m loving it!");
    });

    it("should throw error for empty answers", () => {
      const questions: Question[] = [
        {
          options: [{ label: "Option 1" }],
          prompt: "Test question",
        },
      ];

      const answers: SessionAnswer = {
        answers: [],
        sessionId: "test-123",
        timestamp: "2025-01-01T00:00:00Z",
      };

      expect(() =>
        ResponseFormatter.formatUserResponse(answers, questions)
      ).toThrow("No answers provided in session");
    });

    it("should throw error for empty questions", () => {
      const questions: Question[] = [];

      const answers: SessionAnswer = {
        answers: [
          {
            questionIndex: 0,
            selectedOption: "Option 1",
            timestamp: "2025-01-01T00:00:00Z",
          },
        ],
        sessionId: "test-123",
        timestamp: "2025-01-01T00:00:00Z",
      };

      expect(() =>
        ResponseFormatter.formatUserResponse(answers, questions)
      ).toThrow("No questions provided");
    });

    it("should handle missing answer for a question gracefully", () => {
      const questions: Question[] = [
        {
          options: [{ label: "Option 1" }],
          prompt: "Question 1",
        },
        {
          options: [{ label: "Option 2" }],
          prompt: "Question 2",
        },
      ];

      const answers: SessionAnswer = {
        answers: [
          // Only answer for question 0, missing answer for question 1
          {
            questionIndex: 0,
            selectedOption: "Option 1",
            timestamp: "2025-01-01T00:00:00Z",
          },
        ],
        sessionId: "test-123",
        timestamp: "2025-01-01T00:00:00Z",
      };

      const result = ResponseFormatter.formatUserResponse(answers, questions);

      // Should only include the answered question
      expect(result).toBe(
        "Here are the user's answers:\n\n" + "1. Question 1\n" + "→ Option 1"
      );
    });
  });

  describe("validateAnswers", () => {
    it("should validate correct answers", () => {
      const questions: Question[] = [
        {
          options: [{ label: "Option 1" }, { label: "Option 2" }],
          prompt: "Test question",
        },
      ];

      const answers: SessionAnswer = {
        answers: [
          {
            questionIndex: 0,
            selectedOption: "Option 1",
            timestamp: "2025-01-01T00:00:00Z",
          },
        ],
        sessionId: "test-123",
        timestamp: "2025-01-01T00:00:00Z",
      };

      expect(() =>
        ResponseFormatter.validateAnswers(answers, questions)
      ).not.toThrow();
    });

    it("should throw error for invalid question index", () => {
      const questions: Question[] = [
        {
          options: [{ label: "Option 1" }],
          prompt: "Test question",
        },
      ];

      const answers: SessionAnswer = {
        answers: [
          {
            questionIndex: 99, // Invalid index
            selectedOption: "Option 1",
            timestamp: "2025-01-01T00:00:00Z",
          },
        ],
        sessionId: "test-123",
        timestamp: "2025-01-01T00:00:00Z",
      };

      expect(() =>
        ResponseFormatter.validateAnswers(answers, questions)
      ).toThrow("Answer references invalid question index: 99");
    });

    it("should throw error for answer with neither selectedOption nor customText", () => {
      const questions: Question[] = [
        {
          options: [{ label: "Option 1" }],
          prompt: "Test question",
        },
      ];

      const answers: SessionAnswer = {
        answers: [
          {
            questionIndex: 0,
            // Neither selectedOption nor customText provided
            timestamp: "2025-01-01T00:00:00Z",
          } as UserAnswer,
        ],
        sessionId: "test-123",
        timestamp: "2025-01-01T00:00:00Z",
      };

      expect(() =>
        ResponseFormatter.validateAnswers(answers, questions)
      ).toThrow("has neither selectedOption nor customText");
    });

    it("should throw error for non-existent option", () => {
      const questions: Question[] = [
        {
          options: [{ label: "Option 1" }, { label: "Option 2" }],
          prompt: "Test question",
        },
      ];

      const answers: SessionAnswer = {
        answers: [
          {
            questionIndex: 0,
            selectedOption: "Option 3", // Non-existent option
            timestamp: "2025-01-01T00:00:00Z",
          },
        ],
        sessionId: "test-123",
        timestamp: "2025-01-01T00:00:00Z",
      };

      expect(() =>
        ResponseFormatter.validateAnswers(answers, questions)
      ).toThrow("references non-existent option: Option 3");
    });

    it("should validate custom text answers", () => {
      const questions: Question[] = [
        {
          options: [{ label: "Option 1" }],
          prompt: "Test question",
        },
      ];

      const answers: SessionAnswer = {
        answers: [
          {
            customText: "My custom answer",
            questionIndex: 0,
            timestamp: "2025-01-01T00:00:00Z",
          },
        ],
        sessionId: "test-123",
        timestamp: "2025-01-01T00:00:00Z",
      };

      expect(() =>
        ResponseFormatter.validateAnswers(answers, questions)
      ).not.toThrow();
    });

    it("should throw error for empty answers array", () => {
      const questions: Question[] = [
        {
          options: [{ label: "Option 1" }],
          prompt: "Test question",
        },
      ];

      const answers: SessionAnswer = {
        answers: [],
        sessionId: "test-123",
        timestamp: "2025-01-01T00:00:00Z",
      };

      expect(() =>
        ResponseFormatter.validateAnswers(answers, questions)
      ).toThrow("No answers provided");
    });

    it("should throw error for empty questions array", () => {
      const questions: Question[] = [];

      const answers: SessionAnswer = {
        answers: [
          {
            questionIndex: 0,
            selectedOption: "Option 1",
            timestamp: "2025-01-01T00:00:00Z",
          },
        ],
        sessionId: "test-123",
        timestamp: "2025-01-01T00:00:00Z",
      };

      expect(() =>
        ResponseFormatter.validateAnswers(answers, questions)
      ).toThrow("No questions provided");
    });
  });
});
