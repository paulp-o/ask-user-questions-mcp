/**
 * Response Formatter
 *
 * Formats user answers according to PRD specification for returning to AI models
 */

import type { Question, SessionAnswer, UserAnswer } from "./types.js";

/**
 * ResponseFormatter - Formats session answers into human-readable text
 * according to the PRD specification
 */
export class ResponseFormatter {
  /**
   * Format user answers into PRD-compliant text response
   *
   * Format specification:
   * - Header: "Here are the user's answers:"
   * - Numbered questions: "1. {prompt}"
   * - Arrow symbol for answers: "→ {label} — {description}"
   * - Custom text: "→ Other: '{customText}'"
   * - Double newline separation between questions
   *
   * @param answers - Session answer data containing user responses
   * @param questions - Original questions asked to the user
   * @returns Formatted text response ready to send to AI model
   */
  static formatUserResponse(
    answers: SessionAnswer,
    questions: Question[],
  ): string {
    // Validate that we have matching questions and answers
    if (answers.answers.length === 0) {
      throw new Error("No answers provided in session");
    }

    if (questions.length === 0) {
      throw new Error("No questions provided");
    }

    // Start with header
    const lines: string[] = ["Here are the user's answers:", ""];

    // Format each question and its answer(s)
    // Note: A question can have multiple answers (e.g., regular answer + elaboration request)
    const formattedQuestions: string[] = [];

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      // Get ALL answers for this question (there may be multiple, e.g., answer + elaboration)
      const questionAnswers = answers.answers.filter(
        (a) => a.questionIndex === i,
      );

      if (questionAnswers.length === 0) {
        // If no answer found for this question, skip it
        // (This shouldn't happen in normal operation, but handle gracefully)
        continue;
      }

      // Format the question and all its answers
      const formattedQA = this.formatQuestion(question, questionAnswers, i + 1);
      formattedQuestions.push(formattedQA);
    }

    // Join formatted questions with blank lines between them
    lines.push(formattedQuestions.join("\n\n"));

    return lines.join("\n");
  }

  /**
   * Validate that answers match the questions
   *
   * @param answers - Session answer data
   * @param questions - Original questions
   * @throws Error if validation fails
   */
  static validateAnswers(answers: SessionAnswer, questions: Question[]): void {
    // Check that we have answers
    if (!answers || !answers.answers || answers.answers.length === 0) {
      throw new Error("No answers provided");
    }

    // Check that we have questions
    if (!questions || questions.length === 0) {
      throw new Error("No questions provided");
    }

    // Check each answer references a valid question
    for (const answer of answers.answers) {
      if (
        answer.questionIndex < 0 ||
        answer.questionIndex >= questions.length
      ) {
        throw new Error(
          `Answer references invalid question index: ${answer.questionIndex}`,
        );
      }

      // Check that answer has either selectedOption, selectedOptions, or customText
      if (
        !answer.selectedOption &&
        !answer.customText &&
        !answer.selectedOptions
      ) {
        throw new Error(
          `Answer for question ${answer.questionIndex} has neither selectedOption, selectedOptions, nor customText`,
        );
      }

      // If selectedOption is provided, verify it exists in the question's options
      if (answer.selectedOption) {
        const question = questions[answer.questionIndex];
        const optionExists = question.options.some(
          (opt) => opt.label === answer.selectedOption,
        );

        if (!optionExists) {
          throw new Error(
            `Answer for question ${answer.questionIndex} references non-existent option: ${answer.selectedOption}`,
          );
        }
      }

      // Validate multi-select options
      if (answer.selectedOptions) {
        const question = questions[answer.questionIndex];
        for (const selectedOpt of answer.selectedOptions) {
          const optionExists = question.options.some(
            (opt) => opt.label === selectedOpt,
          );
          if (!optionExists) {
            throw new Error(
              `Answer for question ${answer.questionIndex} references non-existent option: ${selectedOpt}`,
            );
          }
        }
      }
    }
  }

  /**
   * Format an elaborate request for a question
   *
   * @param questionIndex - Index of the question to elaborate
   * @param title - Title of the question
   * @param prompt - Prompt text of the question
   * @param customExplanation - Optional custom explanation text from the user
   * @param elaborateText - Optional user guidance text for elaboration
   * @returns Formatted elaborate request string
   */
  static formatElaborateRequest(
    questionIndex: number,
    title: string,
    prompt: string,
    customExplanation?: string,
    elaborateText?: string,
  ): string {
    const hasElaborateText = elaborateText && elaborateText.trim() !== "";
    // Only show verbose guidance when user didn't provide specific text
    let result = `[ELABORATE_REQUEST] This means the user may have additional info, context or questions, or need more details to understand your question. You may exceed the normal length of questions and options only once exceptionally.`;
    if (!hasElaborateText) {
      result += ` Provide examples and larger context, use paragraph-style large content on question text.`;
    }
    if (customExplanation) {
      result += `\nUser note: ${customExplanation}`;
    }
    if (hasElaborateText) {
      const escapedText = elaborateText.replace(/"/g, '\\"');
      result += `\nUser guidance: "${escapedText}"`;
    }
    return result;
  }

  /**
   * Format a rephrase request for a question
   *
   * @param questionIndex - Index of the question to rephrase
   * @param title - Title of the question
   * @returns Formatted rephrase request string
   */
  static formatRephraseRequest(questionIndex: number, title: string): string {
    return `[REPHRASE_REQUEST] Please rephrase question '${title}' in a different way\nQuestion index: ${questionIndex}`;
  }

  /**
   * Format a single question and its answer(s)
   *
   * @param question - The question data
   * @param questionAnswers - The user's answer(s) for this question (may include elaboration request)
   * @param index - Question number (1-indexed for display)
   * @returns Formatted string for this question/answer pair
   */
  private static formatQuestion(
    question: Question,
    questionAnswers: UserAnswer[],
    index: number,
  ): string {
    const lines: string[] = [];

    // Add question with number
    lines.push(`${index}. ${question.prompt}`);

    // Track if any answer was provided
    let hasAnswer = false;
    // Track if we have an elaboration request (to avoid showing "No selection" when elaborating)
    let hasElaborationRequest = false;

    // Process all answers for this question
    for (const answer of questionAnswers) {
      // Format multi-select options (if present)
      if (answer.selectedOptions && answer.selectedOptions.length > 0) {
        hasAnswer = true;
        for (const selectedLabel of answer.selectedOptions) {
          const option = question.options.find(
            (opt) => opt.label === selectedLabel,
          );
          if (option) {
            if (option.description) {
              lines.push(`→ ${option.label} — ${option.description}`);
            } else {
              lines.push(`→ ${option.label}`);
            }
          }
        }
      }

      // Format single-select option (if present and no multi-select)
      if (answer.selectedOption && !answer.selectedOptions) {
        hasAnswer = true;
        const option = question.options.find(
          (opt) => opt.label === answer.selectedOption,
        );

        if (option) {
          // Format with description if available
          if (option.description) {
            lines.push(`→ ${option.label} — ${option.description}`);
          } else {
            lines.push(`→ ${option.label}`);
          }
        } else {
          // Option not found - shouldn't happen, but handle gracefully
          lines.push(`→ ${answer.selectedOption}`);
        }
      }

      // Format custom text (if present) - can coexist with selectedOptions in multi-select
      if (answer.customText) {
        hasAnswer = true;
        // Check if this is a special request (elaboration or rephrase)
        if (
          answer.customText.startsWith("[ELABORATE_REQUEST]") ||
          answer.customText.startsWith("[REPHRASE_REQUEST]")
        ) {
          // Format as special marker without "Other:" prefix
          hasElaborationRequest = true;
          lines.push(answer.customText);
        } else {
          // Format as regular custom text
          const escapedText = answer.customText.replace(/'/g, "\\'");
          lines.push(`→ Other: '${escapedText}'`);
        }
      }
    }

    // Handle multi-select with no selections (but NOT if there's an elaboration request)
    if (!hasAnswer && !hasElaborationRequest) {
      // Check if any answer has empty selectedOptions array
      const hasEmptyMultiSelect = questionAnswers.some(
        (a) => a.selectedOptions && a.selectedOptions.length === 0,
      );
      if (hasEmptyMultiSelect) {
        lines.push("→ (No selection)");
      } else {
        lines.push("→ No answer provided");
      }
    }

    return lines.join("\n");
  }
}
