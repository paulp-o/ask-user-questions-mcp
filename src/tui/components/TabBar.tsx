import { Box, Text } from "ink";
import React from "react";

import type { Question } from "../../session/types.js";

interface TabBarProps {
  currentIndex: number;
  questions: Question[];
  answers: Map<number, { customText?: string; selectedOption?: string }>;
}

/**
 * TabBar component displays question titles horizontally with progress indicator
 * Visual: ● [Language*] ○ [App Type] ○ [Framework] (2/3)
 * where ● indicates answered questions, ○ indicates unanswered, and * indicates the active/highlighted question
 */
export const TabBar: React.FC<TabBarProps> = ({
  currentIndex,
  questions,
  answers,
}) => {
  return (
    <Box>
      {questions.map((question, index) => {
        const isActive = index === currentIndex;
        // Use provided title or fallback to "Q1", "Q2", etc.
        const title = question.title || `Q${index + 1}`;

        // Check if question is answered
        const answer = answers.get(index);
        const isAnswered = answer && (answer.selectedOption || answer.customText);
        const icon = isAnswered ? "●" : "○";
        const iconColor = isAnswered ? "green" : "gray";

        return (
          <Text key={index}>
            {index > 0 && " "}
            <Text color={iconColor}>{icon}</Text>
            {" "}
            {"["}
            <Text
              bold={isActive}
              color={isActive ? "cyan" : "white"}
              underline={isActive}
            >
              {title}
            </Text>
            {"]"}
          </Text>
        );
      })}
      <Text>
        {" "}
        ({currentIndex + 1}/{questions.length})
      </Text>
    </Box>
  );
};
