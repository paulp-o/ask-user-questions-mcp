import { Box, Text, useInput } from "ink";
import React, { useState } from "react";

import type { Question } from "../../session/types.js";

import { CustomInput } from "./CustomInput.js";
import { OptionsList } from "./OptionsList.js";
import { TabBar } from "./TabBar.js";

interface QuestionDisplayProps {
  currentQuestion: Question;
  currentQuestionIndex: number;
  customAnswer?: string;
  onChangeCustomAnswer: (text: string) => void;
  onSelectOption: (label: string) => void;
  questions: Question[];
  selectedOption?: string;
}

/**
 * QuestionDisplay shows a single question with its options
 * Includes TabBar, question prompt, options list, and footer
 */
export const QuestionDisplay: React.FC<QuestionDisplayProps> = ({
  currentQuestion,
  currentQuestionIndex,
  customAnswer = "",
  onChangeCustomAnswer,
  onSelectOption,
  questions,
  selectedOption,
}) => {
  // Track which input mode is focused: options or custom
  const [focusMode, setFocusMode] = useState<"custom" | "options">("options");

  // Tab key toggles between options and custom input
  useInput((input, key) => {
    if (key.tab) {
      setFocusMode((prev) => (prev === "options" ? "custom" : "options"));
    }
  });

  // Handle option selection - clears custom answer (mutual exclusion)
  const handleSelectOption = (label: string) => {
    onSelectOption(label);
    if (customAnswer) {
      onChangeCustomAnswer(""); // Clear custom answer when option selected
    }
  };

  // Handle custom answer change - clears option selection (mutual exclusion)
  const handleCustomAnswerChange = (text: string) => {
    onChangeCustomAnswer(text);
    if (selectedOption && text) {
      onSelectOption(""); // Clear option when custom text entered
    }
  };

  return (
    <Box flexDirection="column" padding={1}>
      {/* TabBar showing all question titles */}
      <TabBar currentIndex={currentQuestionIndex} questions={questions} />

      {/* Question prompt */}
      <Box marginBottom={1} marginTop={1}>
        <Text bold>{currentQuestion.prompt}</Text>
      </Box>

      {/* Options list */}
      <OptionsList
        isFocused={focusMode === "options"}
        onSelect={handleSelectOption}
        options={currentQuestion.options}
        selectedOption={selectedOption}
      />

      {/* Custom input field */}
      <CustomInput
        isFocused={focusMode === "custom"}
        onChange={handleCustomAnswerChange}
        value={customAnswer}
      />

      {/* Footer with keybindings */}
      <Box borderColor="gray" borderStyle="single" marginTop={1} padding={0.5}>
        <Text dimColor>
          ↑↓ Options | ←→ Questions | Tab Switch | Enter Select | r Review | q
          Quit
        </Text>
      </Box>
    </Box>
  );
};
