import { Box, Text, useInput } from "ink";
import React from "react";

import { t } from "../../i18n/index.js";
import type { Question, UserAnswer } from "../../session/types.js";
import { useTheme } from "../ThemeContext.js";
import { Footer } from "./Footer.js";
import { MarkdownPrompt } from "./MarkdownPrompt.js";

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
 * ReviewScreen displays a summary of all answers for confirmation
 * User can press Enter to confirm and submit, or 'n' to go back and edit
 */
export const ReviewScreen: React.FC<ReviewScreenProps> = ({
  answers,
  elapsedLabel,
  onConfirm,
  onGoBack,
  questions,
  elaborateMarks,
  isSubmitting = false,
}) => {
  const { theme } = useTheme();

  useInput((input, key) => {
    // Disable input while submitting
    if (isSubmitting) return;

    if (key.return) {
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
    if (input === "n") {
      onGoBack();
    }
  });

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box
        borderColor={theme.components.review.confirmBorder}
        borderStyle="round"
        marginBottom={1}
        paddingX={1}
        paddingY={0}
      >
        <Box flexDirection="row" justifyContent="space-between" width="100%">
          <Text bold>{t("review.title")}</Text>
          <Text dimColor>{elapsedLabel}</Text>
        </Box>
      </Box>

      {/* Questions and Answers */}
      <Box flexDirection="column" marginBottom={1}>
        {questions.map((question, index) => {
          const answer = answers.get(index);
          const questionId = `Q${index}`;
          const questionTitle = question.title || questionId;

          return (
            <Box flexDirection="column" key={index} marginBottom={1}>
              {/* Question ID, title and prompt */}
              <Box flexDirection="column">
                <Box>
                  <Text color={theme.components.review.questionId}>
                    [{questionId}]{" "}
                  </Text>
                  <Text bold>
                    {questionTitle}.{" "}
                  </Text>
                </Box>
                <MarkdownPrompt text={question.prompt} />
              </Box>

              {/* Answer */}
              <Box flexDirection="column" marginLeft={2} marginTop={0.5}>
                {/* Multi-select answers */}
                {answer?.selectedOptions &&
                  answer.selectedOptions.length > 0 && (
                    <>
                      {answer.selectedOptions.map((option, idx) => (
                        <Text
                          key={idx}
                          color={theme.components.review.selectedOption}
                        >
                          {">"} {option}
                        </Text>
                      ))}
                    </>
                  )}

                {/* Single-select answer */}
                {answer?.selectedOption && (
                  <Text color={theme.components.review.selectedOption}>
                    {">"} {answer.selectedOption}
                  </Text>
                )}

                {/* Custom text (can coexist with multi-select) */}
                {answer?.customText && (
                  <>
                    {answer.customText
                      .replace(/\r\n?/g, "\n")
                      .split("\n")
                      .map((line, lineIndex, lines) => {
                        const isFirstLine = lineIndex === 0;
                        const isLastLine = lineIndex === lines.length - 1;

                        return (
                          <Text
                            key={lineIndex}
                            color={theme.components.review.customAnswer}
                          >
                            {isFirstLine
                              ? `  ${t("review.customAnswer")}: "`
                              : "  "}
                            {line}
                            {isLastLine ? '"' : ""}
                          </Text>
                        );
                      })}
                  </>
                )}

                {/* No answer provided */}
                {!answer?.selectedOption &&
                  !answer?.selectedOptions &&
                  !answer?.customText && (
                    <Text color={theme.colors.unansweredHighlight}>
                      {" "}
                      {t("review.unanswered")}
                      {/* Show elaboration on same line if unanswered */}
                      {elaborateMarks?.has(index) && (
                        <Text color={theme.colors.warning}>
                          {(() => {
                            const text = elaborateMarks.get(index);
                            if (text) {
                              const displayText =
                                text.length > 50
                                  ? text.slice(0, 50) + "..."
                                  : text;
                              return `, ${t("review.markedForElaboration")}: "${displayText}"`;
                            }
                            return `, ${t("review.markedForElaboration")}`;
                          })()}
                        </Text>
                      )}
                    </Text>
                  )}

                {/* Elaborate request indicator (only show separately if answered) */}
                {(answer?.selectedOption ||
                  answer?.selectedOptions ||
                  answer?.customText) &&
                  elaborateMarks?.has(index) && (
                    <Box marginTop={0.5}>
                      <Text color={theme.colors.warning}>
                        {(() => {
                          const text = elaborateMarks.get(index);
                          if (text) {
                            const displayText =
                              text.length > 50
                                ? text.slice(0, 50) + "..."
                                : text;
                            return `${t("review.markedForElaboration")}: "${displayText}"`;
                          }
                          return t("review.markedForElaboration");
                        })()}
                      </Text>
                    </Box>
                  )}
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Footer with keybindings */}
      <Footer
        focusContext="option"
        multiSelect={false}
        isReviewScreen={true}
        isSubmitting={isSubmitting}
      />
    </Box>
  );
};
