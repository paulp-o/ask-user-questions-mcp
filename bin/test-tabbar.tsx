#!/usr/bin/env node
import React, { useState, useEffect } from "react";
import { render, Box, Text } from "ink";
import { TabBar } from "../src/tui/components/TabBar.js";
import type { Question } from "../src/session/types.js";

const mockQuestions: Question[] = [
  {
    title: "Language",
    prompt: "Which programming language?",
    options: [{ label: "JavaScript" }, { label: "TypeScript" }],
  },
  {
    title: "App Type",
    prompt: "What type of application?",
    options: [{ label: "Web" }, { label: "CLI" }],
  },
  {
    title: "Framework",
    prompt: "Which framework?",
    options: [{ label: "React" }, { label: "Vue" }],
  },
];

const TestTabBar: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Cycle through questions every 2 seconds to show highlighting
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % mockQuestions.length);
    }, 2000);

    return () => clearInterval(timer);
  }, []);

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="green">
        TabBar Component Test
      </Text>
      <Text dimColor>
        (Cycles through questions every 2 seconds to show highlighting)
      </Text>
      <Box marginTop={1}>
        <TabBar questions={mockQuestions} currentIndex={currentIndex} />
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Current question: {currentIndex + 1}</Text>
      </Box>
    </Box>
  );
};

render(<TestTabBar />);
