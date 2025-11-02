import { Box, Text, useApp, useInput } from "ink";
import React from "react";

import type { Question, UserAnswer } from "../../session/types.js";

interface ReviewScreenProps {
  answers: Map<number, { customText?: string; selectedOption?: string }>;
  onConfirm: (userAnswers: UserAnswer[]) => void;
  onGoBack: () => void;
  questions: Question[];
  sessionId: string;
}

/**
 * ReviewScreen displays a summary of all answers for confirmation
 * User can press 'y' to confirm and submit, or 'n' to go back and edit
 */
export const ReviewScreen: React.FC<ReviewScreenProps> = ({
  answers,
  onConfirm,
  onGoBack,
  questions,
}) => {
  const { exit } = useApp();

  useInput((input) => {
    if (input === "y") {
      // Convert answers to UserAnswer format
      const userAnswers: UserAnswer[] = [];
      answers.forEach((answer, questionIndex) => {
        if (answer.selectedOption || answer.customText) {
          userAnswers.push({
            customText: answer.customText,
            questionIndex,
            selectedOption: answer.selectedOption,
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
      <Box
        borderColor="cyan"
        borderStyle="single"
        marginBottom={1}
        padding={0.5}
      >
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
            <Box flexDirection="column" key={index} marginBottom={1}>
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
                  <Box flexDirection="column">
                    {answer.customText.split("\n").map((line, lineIndex) => (
                      <Text key={lineIndex} color="yellow">
                        {lineIndex === 0
                          ? `→ Custom: "${line}`
                          : `  ${line}`}
                      </Text>
                    ))}
                    <Text color="yellow">"</Text>
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
        borderColor="yellow"
        borderStyle="single"
        marginTop={1}
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
