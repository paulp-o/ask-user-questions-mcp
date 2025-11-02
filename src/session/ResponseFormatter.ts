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
    questions: Question[]
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

    // Format each question and its answer
    const formattedQuestions: string[] = [];

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const answer = answers.answers.find((a) => a.questionIndex === i);

      if (!answer) {
        // If no answer found for this question, skip it
        // (This shouldn't happen in normal operation, but handle gracefully)
        continue;
      }

      // Format the question and answer
      const formattedQA = this.formatQuestion(question, answer, i + 1);
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
          `Answer references invalid question index: ${answer.questionIndex}`
        );
      }

      // Check that answer has either selectedOption or customText
      if (!answer.selectedOption && !answer.customText) {
        throw new Error(
          `Answer for question ${answer.questionIndex} has neither selectedOption nor customText`
        );
      }

      // If selectedOption is provided, verify it exists in the question's options
      if (answer.selectedOption) {
        const question = questions[answer.questionIndex];
        const optionExists = question.options.some(
          (opt) => opt.label === answer.selectedOption
        );

        if (!optionExists) {
          throw new Error(
            `Answer for question ${answer.questionIndex} references non-existent option: ${answer.selectedOption}`
          );
        }
      }
    }
  }

  /**
   * Format a single question and its answer
   *
   * @param question - The question data
   * @param answer - The user's answer
   * @param index - Question number (1-indexed for display)
   * @returns Formatted string for this question/answer pair
   */
  private static formatQuestion(
    question: Question,
    answer: UserAnswer,
    index: number
  ): string {
    const lines: string[] = [];

    // Add question with number
    lines.push(`${index}. ${question.prompt}`);

    // Format the answer
    if (answer.customText) {
      // Custom text answer - escape single quotes for display
      const escapedText = answer.customText.replace(/'/g, "\\'");
      lines.push(`→ Other: '${escapedText}'`);
    } else if (answer.selectedOption) {
      // Selected option - find the option details
      const option = question.options.find(
        (opt) => opt.label === answer.selectedOption
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
    } else {
      // No answer provided - this shouldn't happen
      lines.push("→ No answer provided");
    }

    return lines.join("\n");
  }
}
