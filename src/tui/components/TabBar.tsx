import React from "react";
import { Box, Text } from "ink";
import type { Question } from "../../session/types.js";

interface TabBarProps {
  questions: Question[];
  currentIndex: number;
}

/**
 * TabBar component displays question titles horizontally with progress indicator
 * Visual: [Language*] [App Type] [Framework] (2/3)
 * where * indicates the active/highlighted question
 */
export const TabBar: React.FC<TabBarProps> = ({ questions, currentIndex }) => {
  return (
    <Box>
      {questions.map((question, index) => {
        const isActive = index === currentIndex;
        // Use provided title or fallback to "Q1", "Q2", etc.
        const title = question.title || `Q${index + 1}`;

        return (
          <Text key={index}>
            {index > 0 && " "}
            {"["}
            <Text
              color={isActive ? "cyan" : "white"}
              bold={isActive}
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
