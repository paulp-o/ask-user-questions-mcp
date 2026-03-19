import type { Question, SessionAnswer, UserAnswer } from "../shared/types.js";

export class ResponseFormatter {
  static formatUserResponse(
    answers: SessionAnswer,
    questions: Question[],
    sessionId?: string,
  ): string {
    if (answers.answers.length === 0) {
      throw new Error("No answers provided in session");
    }

    if (questions.length === 0) {
      throw new Error("No questions provided");
    }

    const lines: string[] = [];
    if (sessionId) {
      const shortId = sessionId.slice(0, 8);
      lines.push(`[Session: ${shortId} | Questions: ${questions.length}]`, "");
    }
    lines.push("Here are the user's answers:", "");

    const formattedQuestions: string[] = [];

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const questionAnswers = answers.answers.filter((a) => a.questionIndex === i);

      if (questionAnswers.length === 0) {
        continue;
      }

      const formattedQA = this.formatQuestion(question, questionAnswers, i + 1);
      formattedQuestions.push(formattedQA);
    }

    lines.push(formattedQuestions.join("\n\n"));

    return lines.join("\n");
  }

  static validateAnswers(answers: SessionAnswer, questions: Question[]): void {
    if (!answers || !answers.answers || answers.answers.length === 0) {
      throw new Error("No answers provided");
    }

    if (!questions || questions.length === 0) {
      throw new Error("No questions provided");
    }

    for (const answer of answers.answers) {
      if (
        answer.questionIndex < 0 ||
        answer.questionIndex >= questions.length
      ) {
        throw new Error(
          `Answer references invalid question index: ${answer.questionIndex}`,
);
      }

      if (
        !answer.selectedOption &&
        !answer.customText &&
        !answer.selectedOptions
      ) {
        throw new Error(
          `Answer for question ${answer.questionIndex} has neither selectedOption, selectedOptions, nor customText`,
);
      }

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

  static formatElaborateRequest(
    questionIndex: number,
    title: string,
    prompt: string,
    customExplanation?: string,
    elaborateText?: string,
  ): string {
    const hasElaborateText = elaborateText && elaborateText.trim() !== "";
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

  static formatRephraseRequest(questionIndex: number, title: string): string {
    return `[REPHRASE_REQUEST] Please rephrase question '${title}' in a different way\nQuestion index: ${questionIndex}`;
  }

  static getShortId(sessionId: string): string {
    return sessionId.slice(0, 8);
  }

  static formatNonBlockingSubmission(
    sessionId: string,
    questionCount: number,
  ): string {
    const shortId = sessionId.slice(0, 8);
    return [
      `[Session: ${shortId} | Questions: ${questionCount} | Status: pending]`,
      "",
      "Questions submitted successfully.",
      `Use get_answered_questions(session_id="${shortId}") or \`auq fetch-answers ${shortId}\` to retrieve answers.`,
    ].join("\n");
  }

  static formatPendingStatus(
    sessionId: string,
    remainingTime?: string,
  ): string {
    const shortId = sessionId.slice(0, 8);
    const header = remainingTime
      ? `[Session: ${shortId} | Status: pending | Remaining: ${remainingTime}]`
      : `[Session: ${shortId} | Status: pending]`;
    return [header, "", "No answers yet."].join("\n");
  }

  static formatRejectedStatus(
    sessionId: string,
    reason?: string | null,
  ): string {
    const shortId = sessionId.slice(0, 8);
    const lines = [`[Session: ${shortId} | Status: rejected]`, ""];
    if (reason) {
      lines.push(`User rejected this question set. Reason: "${reason}"`);
    } else {
      lines.push("User rejected this question set.");
    }
    return lines.join("\n");
  }

  static formatSessionStatus(sessionId: string, status: string): string {
    const shortId = sessionId.slice(0, 8);
    return [
      `[Session: ${shortId} | Status: ${status}]`,
      "",
      `Session status: ${status}`,
    ].join("\n");
  }

  static formatSuccessResponse(
    sessionId: string,
    answers: SessionAnswer,
    questions: Question[],
  ): string {
    return this.formatUserResponse(answers, questions, sessionId);
  }

  static formatNonBlockingResponse(
    sessionId: string,
    questionCount: number,
  ): string {
    return this.formatNonBlockingSubmission(sessionId, questionCount);
  }

  static formatGetAnsweredResponse(options: {
    sessionId: string;
    status: string;
    answers?: SessionAnswer;
    questions?: Question[];
    reason?: string | null;
    remainingTime?: string;
  }): string {
    if (options.status === "completed" && options.answers && options.questions) {
      return this.formatSuccessResponse(
        options.sessionId,
        options.answers,
        options.questions,
      );
    }

    if (options.status === "pending" || options.status === "in-progress") {
      return this.formatPendingStatus(options.sessionId, options.remainingTime);
    }

    if (options.status === "rejected") {
      return this.formatRejectedStatus(options.sessionId, options.reason);
    }

    return this.formatSessionStatus(options.sessionId, options.status);
  }

  private static formatQuestion(
    question: Question,
    questionAnswers: UserAnswer[],
    index: number,
  ): string {
    const lines: string[] = [];

    lines.push(`${index}. ${question.prompt}`);

    let hasAnswer = false;
    let hasElaborationRequest = false;

    for (const answer of questionAnswers) {
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

      if (answer.selectedOption && !answer.selectedOptions) {
        hasAnswer = true;
        const option = question.options.find(
          (opt) => opt.label === answer.selectedOption,
        );

        if (option) {
          if (option.description) {
            lines.push(`→ ${option.label} — ${option.description}`);
          } else {
            lines.push(`→ ${option.label}`);
          }
        } else {
          lines.push(`→ ${answer.selectedOption}`);
        }
      }

      if (answer.customText) {
        hasAnswer = true;
        if (
          answer.customText.startsWith("[ELABORATE_REQUEST]") ||
          answer.customText.startsWith("[REPHRASE_REQUEST]")
        ) {
          hasElaborationRequest = true;
          lines.push(answer.customText);
        } else {
          const escapedText = answer.customText.replace(/'/g, "\\'");
          lines.push(`→ Other: '${escapedText}'`);
        }
      }
    }

    if (!hasAnswer && !hasElaborationRequest) {
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