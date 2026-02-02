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
  const answeredCount = questions.reduce((count, _q, index) => {
    const answer = answers.get(index);
    const isAnswered = Boolean(
      answer && (answer.selectedOption || answer.customText),
    );
    return count + (isAnswered ? 1 : 0);
  }, 0);

  return (
    <Box flexWrap="wrap" alignItems="center">
      <Box paddingRight={1}>
        <Text dimColor>
          {answeredCount}/{questions.length}
        </Text>
      </Box>
      <Text color={theme.components.tabBar.divider} dimColor>
        │
      </Text>
      <Box paddingLeft={1} flexWrap="wrap">
        {questions.map((question, index) => {
          const isActive = index === currentIndex;
          const answer = answers.get(index);
          const isAnswered = Boolean(
            answer && (answer.selectedOption || answer.customText),
          );

          const displayLabel = tabLabel || question.title || "Question";
          const compactTitle =
            displayLabel.length > 18
              ? `${displayLabel.slice(0, 17)}…`
              : displayLabel;

          const prefix = `Q${index}`;
          const status = isAnswered ? "✓" : "·";

          return (
            <Box key={index} paddingRight={1}>
              <Text
                backgroundColor={
                  isActive ? theme.components.tabBar.selectedBg : undefined
                }
                bold={isActive}
                color={
                  isActive
                    ? theme.components.tabBar.selected
                    : theme.components.tabBar.default
                }
              >
                {` ${status} ${prefix} ${compactTitle} `}
              </Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};
