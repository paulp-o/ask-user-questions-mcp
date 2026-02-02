import { Box, Text, useStdout } from "ink";
import React from "react";

import type { Question } from "../../session/types.js";
import { theme } from "../theme.js";

interface TabBarProps {
  currentIndex: number;
  questions: Question[];
  answers: Map<
    number,
    {
      customText?: string;
      selectedOption?: string;
      selectedOptions?: string[];
    }
  >;
  tabLabel?: string;
}

const truncate = (value: string, maxChars: number) => {
  if (maxChars <= 0) return "";
  if (value.length <= maxChars) return value;
  if (maxChars === 1) return "…";
  return `${value.slice(0, maxChars - 1)}…`;
};

const isAnswerPresent = (
  answer:
    | {
        customText?: string;
        selectedOption?: string;
        selectedOptions?: string[];
      }
    | undefined,
) => {
  if (!answer) return false;
  if (answer.selectedOption) return true;
  if (answer.customText) return true;
  if (answer.selectedOptions && answer.selectedOptions.length > 0) return true;
  return false;
};

/**
 * Minimal TabBar: no brackets, no full-row background.
 * Active tab is clearly indicated; answered state is shown subtly via color.
 */
export const TabBar: React.FC<TabBarProps> = ({
  currentIndex,
  questions,
  answers,
  tabLabel,
}) => {
  const { stdout } = useStdout();
  const columns = stdout?.columns ?? 80;

  // A little breathing room at both edges.
  const paddingX = 1;
  const innerWidth = Math.max(0, columns - paddingX * 2);

  const answeredCount = questions.reduce((count, _q, index) => {
    const answer = answers.get(index);
    const isAnswered = isAnswerPresent(answer);
    return count + (isAnswered ? 1 : 0);
  }, 0);

  const progressText = `${answeredCount}/${questions.length}`;
  const separator = " │ ";
  const separatorLen = separator.length;

  // Build labels and keep the entire bar to a single line.
  const labelCount = Math.max(questions.length, 1);
  const maxLeftWidth = Math.max(0, innerWidth - progressText.length - 1);
  const availableForLabels = Math.max(
    0,
    maxLeftWidth - separatorLen * (labelCount - 1),
  );
  const maxLabelChars = Math.max(
    4,
    Math.floor(availableForLabels / labelCount),
  );

  const tabs = questions.map((question, index) => {
    const isActive = index === currentIndex;
    const answer = answers.get(index);
    const isAnswered = isAnswerPresent(answer);

    const baseLabel = tabLabel || question.title || `Question ${index + 1}`;
    const label = truncate(baseLabel, maxLabelChars - 2); // Reserve space for status
    const status = isAnswered ? "✓" : "·";

    return { index, isActive, isAnswered, label, status };
  });

  return (
    <Box width={columns} paddingX={paddingX} justifyContent="space-between">
      <Box>
        {tabs.map((tab, idx) => (
          <Text key={tab.index}>
            <Text
              color={
                tab.isAnswered
                  ? theme.components.tabBar.answered
                  : theme.components.tabBar.unanswered
              }
              dimColor={!tab.isAnswered && !tab.isActive}
            >
              {tab.status}
            </Text>
            <Text> </Text>
            <Text
              bold={tab.isActive}
              underline={tab.isActive}
              color={
                tab.isActive
                  ? theme.colors.primary
                  : tab.isAnswered
                    ? theme.components.tabBar.answered
                    : theme.components.tabBar.unanswered
              }
              dimColor={!tab.isActive && !tab.isAnswered}
            >
              {tab.label}
            </Text>
            {idx < tabs.length - 1 && (
              <Text color={theme.components.tabBar.divider}>{separator}</Text>
            )}
          </Text>
        ))}
      </Box>
      <Text color={theme.colors.textDim} dimColor>
        {progressText}
      </Text>
    </Box>
  );
};
