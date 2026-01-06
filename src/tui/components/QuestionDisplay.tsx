import { Box, Text } from "ink";
import React, { useState } from "react";

import type { Question } from "../../session/types.js";

import { Footer } from "./Footer.js";
import { OptionsList } from "./OptionsList.js";
import { TabBar } from "./TabBar.js";

interface QuestionDisplayProps {
  currentQuestion: Question;
  currentQuestionIndex: number;
  customAnswer?: string;
  elapsedLabel: string;
  onChangeCustomAnswer: (text: string) => void;
  onSelectOption: (label: string) => void;
  questions: Question[];
  selectedOption?: string;
  onAdvanceToNext?: () => void;
  answers: Map<
    number,
    { customText?: string; selectedOption?: string; selectedOptions?: string[] }
  >;
  onToggleOption?: (label: string) => void;
  multiSelect?: boolean;
}

/**
 * QuestionDisplay shows a single question with its options
 * Includes TabBar, question prompt, options list, and footer
 */
export const QuestionDisplay: React.FC<QuestionDisplayProps> = ({
  currentQuestion,
  currentQuestionIndex,
  customAnswer = "",
  elapsedLabel,
  onChangeCustomAnswer,
  onSelectOption,
  questions,
  selectedOption,
  onAdvanceToNext,
  answers,
  onToggleOption,
  multiSelect,
}) => {
  // Track focus context for Footer component
  const [focusContext, setFocusContext] = useState<"option" | "custom-input">(
    "option",
  );

  // Handle option selection - clears custom answer only in single-select mode
  const handleSelectOption = (label: string) => {
    onSelectOption(label);
    if (customAnswer && !multiSelect) {
      onChangeCustomAnswer(""); // Clear custom answer when option selected (single-select only)
    }
  };

  // Handle custom answer change - clears option selection only in single-select mode
  const handleCustomAnswerChange = (text: string) => {
    onChangeCustomAnswer(text);
    if (selectedOption && text && !multiSelect) {
      onSelectOption(""); // Clear option when custom text entered (single-select only)
    }
  };

  return (
    <Box flexDirection="column">
      {/* TabBar showing all question titles */}
      <TabBar
        currentIndex={currentQuestionIndex}
        questions={questions}
        answers={answers}
      />

      {/* Question prompt with type indicator */}
      <Box flexDirection="row" justifyContent="space-between" marginTop={1}>
        <Box>
          <Text bold>{currentQuestion.prompt} </Text>
          <Text dimColor>
            {multiSelect ? "[Multiple Choice]" : "[Single Choice]"}
          </Text>
        </Box>
        <Text dimColor>Elapsed {elapsedLabel}</Text>
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
        onToggle={onToggleOption}
        multiSelect={multiSelect}
        selectedOptions={answers.get(currentQuestionIndex)?.selectedOptions}
        onFocusContextChange={setFocusContext}
      />

      {/* Footer with context-aware keybindings */}
      <Footer
        focusContext={focusContext}
        multiSelect={multiSelect ?? false}
        customInputValue={customAnswer}
      />
    </Box>
  );
};
