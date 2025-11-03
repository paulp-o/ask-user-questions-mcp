import { Box, Text } from "ink";
import React from "react";

import type { Question } from "../../session/types.js";
import { theme } from "../theme.js";

interface TabBarProps {
  currentIndex: number;
  questions: Question[];
  answers: Map<number, { customText?: string; selectedOption?: string }>;
}

/**
 * TabBar component displays question titles horizontally with progress indicator
 * Visual: ☑ Language ☐ App Type ☐ Framework (2/3)
 * where ☑ indicates answered questions, ☐ indicates unanswered
 * Active tab has underline, cyan text, and blue background
 */
export const TabBar: React.FC<TabBarProps> = ({
  currentIndex,
  questions,
  answers,
}) => {
  return (
    <Box flexWrap="wrap">
      {questions.map((question, index) => {
        const isActive = index === currentIndex;
        // Use provided title or fallback to "Q1", "Q2", etc.
        const title = question.title || `Q${index + 1}`;

        // Check if question is answered
        const answer = answers.get(index);
        const isAnswered = answer && (answer.selectedOption || answer.customText);
        const icon = isAnswered ? "☑" : "☐";
        const iconColor = isAnswered ? theme.components.tabBar.answered : theme.components.tabBar.unanswered;

        return (
          <Box key={index} minWidth={15} paddingRight={1}>
            <Text color={iconColor}>{icon}</Text>
            {" "}
            <Text
              bold={isActive}
              color={isActive ? theme.components.tabBar.selected : theme.components.tabBar.default}
              backgroundColor={isActive ? theme.components.tabBar.selectedBg : undefined}
              underline={isActive}
            >
              {title}
            </Text>
          </Box>
        );
      })}
      <Box minWidth={10}>
        <Text>
          ({currentIndex + 1}/{questions.length})
        </Text>
      </Box>
    </Box>
  );
};
