import { Box, Text } from "ink";
import React from "react";

import type { Question } from "../../session/types.js";

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
  onAdvanceToNext?: () => void;
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
  onAdvanceToNext,
}) => {
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

      {/* Options list with integrated custom input */}
      <OptionsList
        customValue={customAnswer}
        isFocused={true}
        onAdvance={onAdvanceToNext}
        onCustomChange={handleCustomAnswerChange}
        onSelect={handleSelectOption}
        options={currentQuestion.options}
        selectedOption={selectedOption}
        showCustomInput={true}
      />

      {/* Footer with keybindings */}
      <Box borderColor="gray" borderStyle="single" marginTop={1} padding={0.5}>
        <Text dimColor>
          ↑↓ Options | ←→ Questions | Enter Select/Submit | Shift+Enter Newline | Esc Reject | q Quit
        </Text>
      </Box>
    </Box>
  );
};
