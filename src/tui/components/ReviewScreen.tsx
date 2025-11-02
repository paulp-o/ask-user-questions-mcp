import React from "react";
import { Box, Text, useInput, useApp } from "ink";
import type { Question, UserAnswer } from "../../session/types.js";

interface ReviewScreenProps {
  questions: Question[];
  answers: Map<number, { selectedOption?: string; customText?: string }>;
  sessionId: string;
  onConfirm: (userAnswers: UserAnswer[]) => void;
  onGoBack: () => void;
}

/**
 * ReviewScreen displays a summary of all answers for confirmation
 * User can press 'y' to confirm and submit, or 'n' to go back and edit
 */
export const ReviewScreen: React.FC<ReviewScreenProps> = ({
  questions,
  answers,
  sessionId,
  onConfirm,
  onGoBack,
}) => {
  const { exit } = useApp();

  useInput((input) => {
    if (input === "y") {
      // Convert answers to UserAnswer format
      const userAnswers: UserAnswer[] = [];
      answers.forEach((answer, questionIndex) => {
        if (answer.selectedOption || answer.customText) {
          userAnswers.push({
            questionIndex,
            selectedOption: answer.selectedOption,
            customText: answer.customText,
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
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box marginBottom={1} borderStyle="single" borderColor="cyan" padding={0.5}>
        <Text bold color="cyan">
          Review Your Answers
        </Text>
      </Box>

      {/* Questions and Answers */}
      <Box flexDirection="column" marginBottom={1}>
        {questions.map((question, index) => {
          const answer = answers.get(index);
          const questionTitle = question.title || `Q${index + 1}`;

          return (
            <Box key={index} flexDirection="column" marginBottom={1}>
              {/* Question title and prompt */}
              <Text bold>
                {questionTitle}. {question.prompt}
              </Text>

              {/* Answer */}
              <Box marginLeft={2} marginTop={0.5}>
                {answer?.selectedOption && (
                  <Text color="green">→ {answer.selectedOption}</Text>
                )}
                {answer?.customText && (
                  <Text color="yellow">→ Custom: "{answer.customText}"</Text>
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
        marginTop={1}
        borderStyle="single"
        borderColor="yellow"
        padding={0.5}
      >
        <Text bold color="yellow">
          Submit these answers? Press 'y' to confirm, 'n' to go back, 'q' to
          quit
        </Text>
      </Box>
    </Box>
  );
};
