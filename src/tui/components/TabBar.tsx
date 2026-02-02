import { Box, Text } from "ink";
import React from "react";

import type { Question } from "../../session/types.js";
import { theme } from "../theme.js";

interface TabBarProps {
  currentIndex: number;
  questions: Question[];
  answers: Map<number, { customText?: string; selectedOption?: string }>;
  tabLabel?: string;
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
  tabLabel,
}) => {
  return (
    <Box flexWrap="wrap">
      <Box paddingRight={1}>
        <Text color={theme.colors.info}>←</Text>
      </Box>
      {questions.map((question, index) => {
        const isActive = index === currentIndex;
        // Use tabLabel prop when available, otherwise fallback to title or Q{index}
        const displayLabel = tabLabel || question.title || `Q${index}`;

        // Check if question is answered
        const answer = answers.get(index);
        const isAnswered =
          answer && (answer.selectedOption || answer.customText);
        const icon = isAnswered ? "☑" : "☐";
        const iconColor = isAnswered
          ? theme.components.tabBar.answered
          : theme.components.tabBar.unanswered;

        return (
          <Box key={index} minWidth={15} paddingRight={1}>
            <Text color={iconColor}>{icon} </Text>
            <Text
              bold={isActive}
              color={
                isActive
                  ? theme.components.tabBar.selected
                  : theme.components.tabBar.default
              }
              backgroundColor={
                isActive ? theme.components.tabBar.selectedBg : undefined
              }
              underline={isActive}
            >
              {displayLabel}
            </Text>
          </Box>
        );
      })}
      <Box paddingRight={1}>
        <Text color={theme.colors.info}>→</Text>
      </Box>
      <Box minWidth={10}>
        <Text color={theme.colors.info}>
          [{currentIndex + 1}/{questions.length}]
        </Text>
      </Box>
    </Box>
  );
};
