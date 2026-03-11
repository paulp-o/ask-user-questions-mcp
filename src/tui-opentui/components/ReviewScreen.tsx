import React from "react";
import { useKeyboard } from "@opentui/react";

import { t } from "../../i18n/index.js";
import type { Question, UserAnswer } from "../../session/types.js";
import { useTheme } from "../ThemeProvider.js";
import { Footer } from "./Footer.js";
import { MarkdownPrompt } from "./MarkdownPrompt.js";
import { KEYS } from "../../tui/constants/keybindings.js";

interface ReviewScreenProps {
  answers: Map<
    number,
    { customText?: string; selectedOption?: string; selectedOptions?: string[] }
  >;
  elapsedLabel: string;
  onConfirm: (userAnswers: UserAnswer[]) => void;
  onGoBack: () => void;
  questions: Question[];
  sessionId: string;
  elaborateMarks?: Map<number, string>;
  isSubmitting?: boolean;
}

/**
 * ReviewScreen displays a summary of all answers for confirmation.
 * User can press Enter to confirm and submit, or 'n' to go back and edit.
 */
export const ReviewScreen = ({
  answers,
  elapsedLabel,
  onConfirm,
  onGoBack,
  questions,
  elaborateMarks,
  isSubmitting = false,
}: ReviewScreenProps): React.ReactNode => {
  const { theme } = useTheme();

  useKeyboard((key) => {
    // Disable input while submitting
    if (isSubmitting) return;

    if (key.name === "return") {
      // Convert answers to UserAnswer format
      const userAnswers: UserAnswer[] = [];
      answers.forEach((answer, questionIndex) => {
        if (
          answer.selectedOption ||
          answer.selectedOptions ||
          answer.customText
        ) {
          userAnswers.push({
            customText: answer.customText,
            questionIndex,
            selectedOption: answer.selectedOption,
            selectedOptions: answer.selectedOptions,
            timestamp: new Date().toISOString(),
          });
        }
      });
      onConfirm(userAnswers);
    }
    if (key.name && KEYS.GO_BACK.test(key.name)) {
      onGoBack();
    }
  });

  return (
    <box style={{ flexDirection: "column" }}>
      {/* Header */}
      <box
        style={{
          flexDirection: "column",
          borderColor: theme.components.review.confirmBorder,
          borderStyle: "rounded",
          marginBottom: 1,
          paddingX: 1,
        }}
      >
        <box style={{ flexDirection: "row", justifyContent: "space-between", width: "100%" }}>
          <text style={{ bold: true }}>{t("review.title")}</text>
          <text fg={theme.colors.textDim}>{elapsedLabel}</text>
        </box>
      </box>

      {/* Questions and Answers */}
      <box style={{ flexDirection: "column", marginBottom: 1 }}>
        {questions.map((question, index) => {
          const answer = answers.get(index);
          const questionId = `Q${index}`;
          const questionTitle = question.title || questionId;

          return (
            <box style={{ flexDirection: "column", marginBottom: 1 }} key={index}>
              {/* Question ID, title and prompt */}
              <box style={{ flexDirection: "column" }}>
                <box>
                  <text fg={theme.components.review.questionId}>
                    {`[${questionId}] `}
                  </text>
                  <text style={{ bold: true }}>{`${questionTitle}. `}</text>
                </box>
                <MarkdownPrompt text={question.prompt} />
              </box>

              {/* Answer */}
              <box style={{ flexDirection: "column", marginLeft: 2, marginTop: 1 }}>
                {/* Multi-select answers */}
                {answer?.selectedOptions &&
                  answer.selectedOptions.length > 0 &&
                  answer.selectedOptions.map((option, idx) => (
                    <text
                      key={idx}
                      style={{ fg: theme.components.review.selectedOption }}
                    >
                      {`>  ${option}`}
                    </text>
                  ))}

                {/* Single-select answer */}
                {answer?.selectedOption && (
                  <text style={{ fg: theme.components.review.selectedOption }}>
                    {`>  ${answer.selectedOption}`}
                  </text>
                )}

                {/* Custom text (can coexist with multi-select) */}
                {answer?.customText && (
                  <box style={{ flexDirection: "column" }}>
                    {answer.customText
                      .replace(/\r\n?/g, "\n")
                      .split("\n")
                      .map((line, lineIndex, lines) => {
                        const isFirstLine = lineIndex === 0;
                        const isLastLine = lineIndex === lines.length - 1;

                        return (
                          <text
                            key={lineIndex}
                            style={{ fg: theme.components.review.customAnswer }}
                          >
                            {`${isFirstLine ? `  ${t("review.customAnswer")}: "` : "  "}${line}${isLastLine ? '"' : ""}`}
                          </text>
                        );
                      })}
                  </box>
                )}

                {/* No answer provided */}
                {!answer?.selectedOption &&
                  !answer?.selectedOptions &&
                  !answer?.customText && (
                    <box style={{ flexDirection: "row" }}>
                      <text style={{ fg: theme.colors.unansweredHighlight }}>
                        {` ${t("review.unanswered")}`}
                      </text>
                      {elaborateMarks?.has(index) && (() => {
                        const elaborateText = elaborateMarks.get(index);
                        const elaborationStr = elaborateText
                          ? `, ${t("review.markedForElaboration")}: "${elaborateText.length > 50 ? elaborateText.slice(0, 50) + "..." : elaborateText}"`
                          : `, ${t("review.markedForElaboration")}`;
                        return (
                          <text style={{ fg: theme.colors.warning }}>
                            {elaborationStr}
                          </text>
                        );
                      })()}
                    </box>
                  )}

                {/* Elaborate request indicator (only show separately if answered) */}
                {(answer?.selectedOption ||
                  answer?.selectedOptions ||
                  answer?.customText) &&
                  elaborateMarks?.has(index) && (
                    <box style={{ marginTop: 1 }}>
                      <text style={{ fg: theme.colors.warning }}>
                        {(() => {
                          const elaborateText = elaborateMarks.get(index);
                          if (elaborateText) {
                            const displayText =
                              elaborateText.length > 50
                                ? elaborateText.slice(0, 50) + "..."
                                : elaborateText;
                            return `${t("review.markedForElaboration")}: "${displayText}"`;
                          }
                          return t("review.markedForElaboration");
                        })()}
                      </text>
                    </box>
                  )}
              </box>
            </box>
          );
        })}
      </box>

      {/* Footer with keybindings */}
      <Footer
        focusContext="option"
        multiSelect={false}
        isReviewScreen={true}
        isSubmitting={isSubmitting}
      />
    </box>
  );
};