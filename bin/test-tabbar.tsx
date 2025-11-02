import { render, Box, Text } from "ink";
#!/usr/bin/env node
import React, { useState, useEffect } from "react";

import type { Question } from "../src/session/types.js";

import { TabBar } from "../src/tui/components/TabBar.js";

const mockQuestions: Question[] = [
  {
    options: [{ label: "JavaScript" }, { label: "TypeScript" }],
    prompt: "Which programming language?",
    title: "Language",
  },
  {
    options: [{ label: "Web" }, { label: "CLI" }],
    prompt: "What type of application?",
    title: "App Type",
  },
  {
    options: [{ label: "React" }, { label: "Vue" }],
    prompt: "Which framework?",
    title: "Framework",
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
        <TabBar currentIndex={currentIndex} questions={mockQuestions} />
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Current question: {currentIndex + 1}</Text>
      </Box>
    </Box>
  );
};

render(<TestTabBar />);
