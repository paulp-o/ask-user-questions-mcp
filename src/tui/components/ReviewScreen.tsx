import { Box, Text, useApp, useInput } from "ink";
import React from "react";

import type { Question, UserAnswer } from "../../session/types.js";
import { theme } from "../theme.js";

interface ReviewScreenProps {
  answers: Map<number, { customText?: string; selectedOption?: string; selectedOptions?: string[] }>;
  onConfirm: (userAnswers: UserAnswer[]) => void;
  onGoBack: () => void;
  questions: Question[];
  sessionId: string;
}

/**
 * ReviewScreen displays a summary of all answers for confirmation
 * User can press Enter to confirm and submit, or 'n' to go back and edit
 */
export const ReviewScreen: React.FC<ReviewScreenProps> = ({
  answers,
  onConfirm,
  onGoBack,
  questions,
}) => {
  const { exit } = useApp();

  useInput((input, key) => {
    if (key.return) {
      // Convert answers to UserAnswer format
      const userAnswers: UserAnswer[] = [];
      answers.forEach((answer, questionIndex) => {
        if (answer.selectedOption || answer.selectedOptions || answer.customText) {
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
    if (input === "q") {
      exit();
    }
  });

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box
        borderColor={theme.components.review.border}
        borderStyle="single"
        marginBottom={1}
        padding={0.5}
      >
        <Text bold color={theme.components.review.border}>
          Review Your Answers
        </Text>
      </Box>

      {/* Questions and Answers */}
      <Box flexDirection="column" marginBottom={1}>
        {questions.map((question, index) => {
          const answer = answers.get(index);
          const questionTitle = question.title || `Q${index + 1}`;

          return (
            <Box flexDirection="column" key={index} marginBottom={1}>
              {/* Question title and prompt */}
              <Text bold>
                {questionTitle}. {question.prompt}
              </Text>

              {/* Answer */}
              <Box marginLeft={2} marginTop={0.5}>
                {/* Multi-select answers */}
                {answer?.selectedOptions && answer.selectedOptions.length > 0 && (
                  <Box flexDirection="column">
                    {answer.selectedOptions.map((option, idx) => (
                      <Text key={idx} color={theme.components.review.selectedOption}>
                        → {option}
                      </Text>
                    ))}
                  </Box>
                )}

                {/* Single-select answer */}
                {answer?.selectedOption && (
                  <Text color={theme.components.review.selectedOption}>→ {answer.selectedOption}</Text>
                )}
                {answer?.customText && (
                  <Box flexDirection="column">
                    {answer.customText.split("\n").map((line, lineIndex) => (
                      <Text key={lineIndex} color={theme.components.review.customAnswer}>
                        {lineIndex === 0
                          ? `→ Custom: "${line}`
                          : `  ${line}`}
                      </Text>
                    ))}
                    <Text color={theme.components.review.customAnswer}>"</Text>
                  </Box>
                )}
                {!answer?.selectedOption && !answer?.customText && (
                  <Text dimColor>→ (No answer provided)</Text>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Confirmation prompt */}
      <Box
        borderColor={theme.components.review.confirmBorder}
        borderStyle="single"
        marginTop={1}
        padding={0.5}
      >
        <Text bold color={theme.components.review.confirmBorder}>
          Submit these answers? Press Enter to confirm, 'n' to go back, 'q' to
          quit
        </Text>
      </Box>
    </Box>
  );
};
