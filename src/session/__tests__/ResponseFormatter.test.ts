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
          title: "Language",
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
          "→ TypeScript — Type-safe JavaScript",
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
          title: "Language",
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
          title: "Application Type",
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
          "→ Web — Frontend or backend web application",
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
          title: "Application Type",
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
          "→ Other: 'Desktop app with Electron'",
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
          title: "Language",
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
          title: "Application Type",
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
          "→ Other: 'Desktop app with Electron'",
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
          title: "Color",
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
        "Here are the user's answers:\n\n" + "1. Choose a color\n" + "→ Red",
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
          title: "Feedback",
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
          title: "Test Question",
        },
      ];

      const answers: SessionAnswer = {
        answers: [],
        sessionId: "test-123",
        timestamp: "2025-01-01T00:00:00Z",
      };

      expect(() =>
        ResponseFormatter.formatUserResponse(answers, questions),
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
        ResponseFormatter.formatUserResponse(answers, questions),
      ).toThrow("No questions provided");
    });

    it("should handle missing answer for a question gracefully", () => {
      const questions: Question[] = [
        {
          options: [{ label: "Option 1" }],
          prompt: "Question 1",
          title: "Question 1",
        },
        {
          options: [{ label: "Option 2" }],
          prompt: "Question 2",
          title: "Question 2",
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
        "Here are the user's answers:\n\n" + "1. Question 1\n" + "→ Option 1",
      );
    });
  });

  describe("validateAnswers", () => {
    it("should validate correct answers", () => {
      const questions: Question[] = [
        {
          options: [{ label: "Option 1" }, { label: "Option 2" }],
          prompt: "Test question",
          title: "Test Question",
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
        ResponseFormatter.validateAnswers(answers, questions),
      ).not.toThrow();
    });

    it("should throw error for invalid question index", () => {
      const questions: Question[] = [
        {
          options: [{ label: "Option 1" }],
          prompt: "Test question",
          title: "Test Question",
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
        ResponseFormatter.validateAnswers(answers, questions),
      ).toThrow("Answer references invalid question index: 99");
    });

    it("should throw error for answer with neither selectedOption nor customText", () => {
      const questions: Question[] = [
        {
          options: [{ label: "Option 1" }],
          prompt: "Test question",
          title: "Test Question",
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
        ResponseFormatter.validateAnswers(answers, questions),
      ).toThrow("has neither selectedOption, selectedOptions, nor customText");
    });

    it("should throw error for non-existent option", () => {
      const questions: Question[] = [
        {
          options: [{ label: "Option 1" }, { label: "Option 2" }],
          prompt: "Test question",
          title: "Test Question",
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
        ResponseFormatter.validateAnswers(answers, questions),
      ).toThrow("references non-existent option: Option 3");
    });

    it("should validate custom text answers", () => {
      const questions: Question[] = [
        {
          options: [{ label: "Option 1" }],
          prompt: "Test question",
          title: "Test Question",
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
        ResponseFormatter.validateAnswers(answers, questions),
      ).not.toThrow();
    });

    it("should throw error for empty answers array", () => {
      const questions: Question[] = [
        {
          options: [{ label: "Option 1" }],
          prompt: "Test question",
          title: "Test Question",
        },
      ];

      const answers: SessionAnswer = {
        answers: [],
        sessionId: "test-123",
        timestamp: "2025-01-01T00:00:00Z",
      };

      expect(() =>
        ResponseFormatter.validateAnswers(answers, questions),
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
        ResponseFormatter.validateAnswers(answers, questions),
      ).toThrow("No questions provided");
    });

    it("should validate multi-select answers with selectedOptions array", () => {
      const questions: Question[] = [
        {
          options: [
            { label: "Feature A" },
            { label: "Feature B" },
            { label: "Feature C" },
          ],
          prompt: "Which features do you want?",
          title: "Features",
          multiSelect: true,
        },
      ];

      const answers: SessionAnswer = {
        answers: [
          {
            questionIndex: 0,
            selectedOptions: ["Feature A", "Feature C"],
            timestamp: "2025-01-01T00:00:00Z",
          },
        ],
        sessionId: "test-123",
        timestamp: "2025-01-01T00:00:00Z",
      };

      expect(() =>
        ResponseFormatter.validateAnswers(answers, questions),
      ).not.toThrow();
    });

    it("should throw error for invalid option in selectedOptions array", () => {
      const questions: Question[] = [
        {
          options: [
            { label: "Feature A" },
            { label: "Feature B" },
            { label: "Feature C" },
          ],
          prompt: "Which features do you want?",
          title: "Features",
          multiSelect: true,
        },
      ];

      const answers: SessionAnswer = {
        answers: [
          {
            questionIndex: 0,
            selectedOptions: ["Feature A", "Invalid Feature"],
            timestamp: "2025-01-01T00:00:00Z",
          },
        ],
        sessionId: "test-123",
        timestamp: "2025-01-01T00:00:00Z",
      };

      expect(() =>
        ResponseFormatter.validateAnswers(answers, questions),
      ).toThrow("references non-existent option: Invalid Feature");
    });

    it("should validate empty selectedOptions array (no selections)", () => {
      const questions: Question[] = [
        {
          options: [{ label: "Feature A" }, { label: "Feature B" }],
          prompt: "Which features do you want?",
          title: "Features",
          multiSelect: true,
        },
      ];

      const answers: SessionAnswer = {
        answers: [
          {
            questionIndex: 0,
            selectedOptions: [],
            timestamp: "2025-01-01T00:00:00Z",
          },
        ],
        sessionId: "test-123",
        timestamp: "2025-01-01T00:00:00Z",
      };

      expect(() =>
        ResponseFormatter.validateAnswers(answers, questions),
      ).not.toThrow();
    });
  });

  describe("formatUserResponse - Multi-Select", () => {
    it("should format multi-select question with multiple selections (with descriptions)", () => {
      const questions: Question[] = [
        {
          options: [
            {
              description: "Authentication support",
              label: "Auth",
            },
            {
              description: "Database integration",
              label: "Database",
            },
            {
              description: "API endpoints",
              label: "API",
            },
          ],
          prompt: "Which features do you want to enable?",
          title: "Features",
          multiSelect: true,
        },
      ];

      const answers: SessionAnswer = {
        answers: [
          {
            questionIndex: 0,
            selectedOptions: ["Auth", "API"],
            timestamp: "2025-01-01T00:00:00Z",
          },
        ],
        sessionId: "test-123",
        timestamp: "2025-01-01T00:00:00Z",
      };

      const result = ResponseFormatter.formatUserResponse(answers, questions);

      expect(result).toBe(
        "Here are the user's answers:\n\n" +
          "1. Which features do you want to enable?\n" +
          "→ Auth — Authentication support\n" +
          "→ API — API endpoints",
      );
    });

    it("should format multi-select question with multiple selections (without descriptions)", () => {
      const questions: Question[] = [
        {
          options: [{ label: "Red" }, { label: "Green" }, { label: "Blue" }],
          prompt: "Select your favorite colors",
          title: "Colors",
          multiSelect: true,
        },
      ];

      const answers: SessionAnswer = {
        answers: [
          {
            questionIndex: 0,
            selectedOptions: ["Red", "Blue"],
            timestamp: "2025-01-01T00:00:00Z",
          },
        ],
        sessionId: "test-123",
        timestamp: "2025-01-01T00:00:00Z",
      };

      const result = ResponseFormatter.formatUserResponse(answers, questions);

      expect(result).toBe(
        "Here are the user's answers:\n\n" +
          "1. Select your favorite colors\n" +
          "→ Red\n" +
          "→ Blue",
      );
    });

    it("should format multi-select question with empty selections", () => {
      const questions: Question[] = [
        {
          options: [{ label: "Feature A" }, { label: "Feature B" }],
          prompt: "Which optional features do you want?",
          title: "Optional Features",
          multiSelect: true,
        },
      ];

      const answers: SessionAnswer = {
        answers: [
          {
            questionIndex: 0,
            selectedOptions: [],
            timestamp: "2025-01-01T00:00:00Z",
          },
        ],
        sessionId: "test-123",
        timestamp: "2025-01-01T00:00:00Z",
      };

      const result = ResponseFormatter.formatUserResponse(answers, questions);

      expect(result).toBe(
        "Here are the user's answers:\n\n" +
          "1. Which optional features do you want?\n" +
          "→ (No selection)",
      );
    });

    it("should format mixed single-select and multi-select questions", () => {
      const questions: Question[] = [
        {
          options: [
            {
              description: "Type-safe JavaScript",
              label: "TypeScript",
            },
            {
              description: "Dynamic web language",
              label: "JavaScript",
            },
          ],
          prompt: "What is your primary language?",
          title: "Language",
          multiSelect: false,
        },
        {
          options: [
            {
              description: "Authentication support",
              label: "Auth",
            },
            {
              description: "Database integration",
              label: "Database",
            },
            {
              description: "API endpoints",
              label: "API",
            },
          ],
          prompt: "Which features do you want?",
          title: "Features",
          multiSelect: true,
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
            selectedOptions: ["Auth", "Database"],
            timestamp: "2025-01-01T00:00:00Z",
          },
        ],
        sessionId: "test-123",
        timestamp: "2025-01-01T00:00:00Z",
      };

      const result = ResponseFormatter.formatUserResponse(answers, questions);

      expect(result).toBe(
        "Here are the user's answers:\n\n" +
          "1. What is your primary language?\n" +
          "→ TypeScript — Type-safe JavaScript\n\n" +
          "2. Which features do you want?\n" +
          "→ Auth — Authentication support\n" +
          "→ Database — Database integration",
      );
    });

    it("should format multi-select with single selection (edge case)", () => {
      const questions: Question[] = [
        {
          options: [
            { label: "Option A" },
            { label: "Option B" },
            { label: "Option C" },
          ],
          prompt: "Select any options you like",
          title: "Options",
          multiSelect: true,
        },
      ];

      const answers: SessionAnswer = {
        answers: [
          {
            questionIndex: 0,
            selectedOptions: ["Option B"],
            timestamp: "2025-01-01T00:00:00Z",
          },
        ],
        sessionId: "test-123",
        timestamp: "2025-01-01T00:00:00Z",
      };

      const result = ResponseFormatter.formatUserResponse(answers, questions);

      expect(result).toBe(
        "Here are the user's answers:\n\n" +
          "1. Select any options you like\n" +
          "→ Option B",
      );
    });

    it("should format multi-select with both selected options AND custom text", () => {
      const questions: Question[] = [
        {
          options: [
            {
              description: "Authentication support",
              label: "Auth",
            },
            {
              description: "Database integration",
              label: "Database",
            },
            {
              description: "API endpoints",
              label: "API",
            },
          ],
          prompt: "Which features do you want?",
          title: "Features",
          multiSelect: true,
        },
      ];

      const answers: SessionAnswer = {
        answers: [
          {
            questionIndex: 0,
            selectedOptions: ["Auth", "Database"],
            customText: "Also need caching system",
            timestamp: "2025-01-01T00:00:00Z",
          },
        ],
        sessionId: "test-123",
        timestamp: "2025-01-01T00:00:00Z",
      };

      const result = ResponseFormatter.formatUserResponse(answers, questions);

      expect(result).toBe(
        "Here are the user's answers:\n\n" +
          "1. Which features do you want?\n" +
          "→ Auth — Authentication support\n" +
          "→ Database — Database integration\n" +
          "→ Other: 'Also need caching system'",
      );
    });
  });

  describe("formatElaborateRequest", () => {
    it("should format elaborate request with basic values", () => {
      const result = ResponseFormatter.formatElaborateRequest(
        0,
        "Language",
        "What is your favorite programming language?",
      );

      expect(result).toContain("[ELABORATE_REQUEST]");
      expect(result).toContain("This means the user may have additional info");
      expect(result).toContain("Provide examples and larger context");
    });

    it("should format elaborate request with user note", () => {
      const result = ResponseFormatter.formatElaborateRequest(
        0,
        "Language",
        "What is your favorite programming language?",
        "I need more context about the options",
      );

      expect(result).toContain("[ELABORATE_REQUEST]");
      expect(result).toContain(
        "User note: I need more context about the options",
      );
    });

    it("should format elaborate request with user guidance text", () => {
      const result = ResponseFormatter.formatElaborateRequest(
        0,
        "Language",
        "What is your favorite programming language?",
        undefined,
        "Please explain the differences between TypeScript and JavaScript",
      );

      expect(result).toContain("[ELABORATE_REQUEST]");
      expect(result).toContain(
        'User guidance: "Please explain the differences between TypeScript and JavaScript"',
      );
      // Should NOT include verbose guidance when user provides specific text
      expect(result).not.toContain("Provide examples and larger context");
    });

    it("should escape double quotes in user guidance", () => {
      const result = ResponseFormatter.formatElaborateRequest(
        0,
        "Config",
        "Select config",
        undefined,
        'What does "production" mode do?',
      );

      expect(result).toContain(
        'User guidance: "What does \\"production\\" mode do?"',
      );
    });

    it("should handle both user note and user guidance", () => {
      const result = ResponseFormatter.formatElaborateRequest(
        0,
        "Language",
        "What is your favorite?",
        "This is confusing",
        "Need more examples",
      );

      expect(result).toContain("User note: This is confusing");
      expect(result).toContain('User guidance: "Need more examples"');
    });
  });

  describe("formatUserResponse - Elaboration Requests", () => {
    it("should format elaboration request without Other: wrapper", () => {
      const questions: Question[] = [
        {
          options: [{ label: "Option A" }, { label: "Option B" }],
          prompt: "Select an option",
          title: "Selection",
        },
      ];

      const elaborateText =
        "[ELABORATE_REQUEST] This means the user needs more info...";

      const answers: SessionAnswer = {
        answers: [
          {
            questionIndex: 0,
            customText: elaborateText,
            timestamp: "2025-01-01T00:00:00Z",
          },
        ],
        sessionId: "test-123",
        timestamp: "2025-01-01T00:00:00Z",
      };

      const result = ResponseFormatter.formatUserResponse(answers, questions);

      // Should contain the elaborate request directly, not wrapped in "Other:"
      expect(result).toContain(elaborateText);
      expect(result).not.toContain("→ Other:");
    });

    it("should format rephrase request without Other: wrapper", () => {
      const questions: Question[] = [
        {
          options: [{ label: "Option A" }, { label: "Option B" }],
          prompt: "Select an option",
          title: "Selection",
        },
      ];

      const rephraseText =
        "[REPHRASE_REQUEST] Please rephrase question 'Selection' in a different way";

      const answers: SessionAnswer = {
        answers: [
          {
            questionIndex: 0,
            customText: rephraseText,
            timestamp: "2025-01-01T00:00:00Z",
          },
        ],
        sessionId: "test-123",
        timestamp: "2025-01-01T00:00:00Z",
      };

      const result = ResponseFormatter.formatUserResponse(answers, questions);

      // Should contain the rephrase request directly, not wrapped in "Other:"
      expect(result).toContain(rephraseText);
      expect(result).not.toContain("→ Other:");
    });

    it("should handle both regular answer and elaboration request for same question", () => {
      const questions: Question[] = [
        {
          options: [
            { label: "TypeScript", description: "Type-safe JavaScript" },
            { label: "JavaScript", description: "Dynamic web language" },
          ],
          prompt: "What language do you prefer?",
          title: "Language",
        },
      ];

      const elaborateText =
        "[ELABORATE_REQUEST] Need more details about the options";

      const answers: SessionAnswer = {
        answers: [
          {
            questionIndex: 0,
            selectedOption: "TypeScript",
            timestamp: "2025-01-01T00:00:00Z",
          },
          {
            questionIndex: 0,
            customText: elaborateText,
            timestamp: "2025-01-01T00:00:01Z",
          },
        ],
        sessionId: "test-123",
        timestamp: "2025-01-01T00:00:00Z",
      };

      const result = ResponseFormatter.formatUserResponse(answers, questions);

      // Should contain both the selected option AND the elaboration request
      expect(result).toContain("→ TypeScript — Type-safe JavaScript");
      expect(result).toContain(elaborateText);
      expect(result).not.toContain("→ Other:");
    });

    it("should handle multi-select with no selections but has elaboration", () => {
      const questions: Question[] = [
        {
          options: [{ label: "Feature A" }, { label: "Feature B" }],
          prompt: "Select features",
          title: "Features",
          multiSelect: true,
        },
      ];

      const elaborateText =
        "[ELABORATE_REQUEST] Please explain what each feature does";

      const answers: SessionAnswer = {
        answers: [
          {
            questionIndex: 0,
            selectedOptions: [],
            timestamp: "2025-01-01T00:00:00Z",
          },
          {
            questionIndex: 0,
            customText: elaborateText,
            timestamp: "2025-01-01T00:00:01Z",
          },
        ],
        sessionId: "test-123",
        timestamp: "2025-01-01T00:00:00Z",
      };

      const result = ResponseFormatter.formatUserResponse(answers, questions);

      // Should NOT show "(No selection)" when there's an elaboration request
      expect(result).not.toContain("(No selection)");
      expect(result).toContain(elaborateText);
    });

    it("should still wrap regular custom text in Other:", () => {
      const questions: Question[] = [
        {
          options: [{ label: "Option A" }],
          prompt: "Select an option",
          title: "Selection",
        },
      ];

      const answers: SessionAnswer = {
        answers: [
          {
            questionIndex: 0,
            customText: "My custom answer that is not an elaborate request",
            timestamp: "2025-01-01T00:00:00Z",
          },
        ],
        sessionId: "test-123",
        timestamp: "2025-01-01T00:00:00Z",
      };

      const result = ResponseFormatter.formatUserResponse(answers, questions);

      // Regular custom text should still be wrapped in "Other:"
      expect(result).toContain(
        "→ Other: 'My custom answer that is not an elaborate request'",
      );
    });
  });

  describe("formatRephraseRequest", () => {
    it("should format rephrase request with basic title", () => {
      const result = ResponseFormatter.formatRephraseRequest(0, "Language");

      expect(result).toBe(
        "[REPHRASE_REQUEST] Please rephrase question 'Language' in a different way\n" +
          "Question index: 0",
      );
    });

    it("should format rephrase request with different question index", () => {
      const result = ResponseFormatter.formatRephraseRequest(3, "Database");

      expect(result).toBe(
        "[REPHRASE_REQUEST] Please rephrase question 'Database' in a different way\n" +
          "Question index: 3",
      );
    });

    it("should format rephrase request with special characters in title", () => {
      const result = ResponseFormatter.formatRephraseRequest(
        1,
        "API Key/Token",
      );

      expect(result).toBe(
        "[REPHRASE_REQUEST] Please rephrase question 'API Key/Token' in a different way\n" +
          "Question index: 1",
      );
    });

    it("should format rephrase request with unicode characters in title", () => {
      const result = ResponseFormatter.formatRephraseRequest(
        2,
        "Language 语言",
      );

      expect(result).toBe(
        "[REPHRASE_REQUEST] Please rephrase question 'Language 语言' in a different way\n" +
          "Question index: 2",
      );
    });

    it("should format rephrase request with empty title", () => {
      const result = ResponseFormatter.formatRephraseRequest(0, "");

      expect(result).toBe(
        "[REPHRASE_REQUEST] Please rephrase question '' in a different way\n" +
          "Question index: 0",
      );
    });
  });
});
