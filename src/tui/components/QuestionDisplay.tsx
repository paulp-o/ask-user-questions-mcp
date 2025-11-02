import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { TabBar } from "./TabBar.js";
import { OptionsList } from "./OptionsList.js";
import { CustomInput } from "./CustomInput.js";
import type { Question } from "../../session/types.js";

interface QuestionDisplayProps {
  questions: Question[];
  currentQuestionIndex: number;
  currentQuestion: Question;
  selectedOption?: string;
  onSelectOption: (label: string) => void;
  customAnswer?: string;
  onChangeCustomAnswer: (text: string) => void;
}

/**
 * QuestionDisplay shows a single question with its options
 * Includes TabBar, question prompt, options list, and footer
 */
export const QuestionDisplay: React.FC<QuestionDisplayProps> = ({
  questions,
  currentQuestionIndex,
  currentQuestion,
  selectedOption,
  onSelectOption,
  customAnswer = "",
  onChangeCustomAnswer,
}) => {
  // Track which input mode is focused: options or custom
  const [focusMode, setFocusMode] = useState<"options" | "custom">("options");

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
      <TabBar questions={questions} currentIndex={currentQuestionIndex} />

      {/* Question prompt */}
      <Box marginTop={1} marginBottom={1}>
        <Text bold>{currentQuestion.prompt}</Text>
      </Box>

      {/* Options list */}
      <OptionsList
        options={currentQuestion.options}
        onSelect={handleSelectOption}
        selectedOption={selectedOption}
        isFocused={focusMode === "options"}
      />

      {/* Custom input field */}
      <CustomInput
        value={customAnswer}
        onChange={handleCustomAnswerChange}
        isFocused={focusMode === "custom"}
      />

      {/* Footer with keybindings */}
      <Box marginTop={1} borderStyle="single" borderColor="gray" padding={0.5}>
        <Text dimColor>
          ↑↓ Options | ←→ Questions | Tab Switch | Enter Select | r Review | q
          Quit
        </Text>
      </Box>
    </Box>
  );
};
