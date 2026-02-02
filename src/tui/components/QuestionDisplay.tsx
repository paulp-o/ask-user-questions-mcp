import { Box, Text } from "ink";
import React, { useState } from "react";

import type { Question } from "../../session/types.js";
import { theme } from "../theme.js";

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
  onFocusContextChange?: (context: "option" | "custom-input") => void;
  workingDirectory?: string;
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
  onFocusContextChange,
  workingDirectory,
}) => {
  const [focusContext, setFocusContext] = useState<"option" | "custom-input">(
    "option",
  );

  const handleFocusContextChange = (context: "option" | "custom-input") => {
    setFocusContext(context);
    onFocusContextChange?.(context);
  };

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
      {/* Working directory (if available from OpenCode) */}
      {workingDirectory && (
        <Box>
          <Text color={theme.components.directory.label} dimColor>
            dir
          </Text>
          <Text
            color={theme.components.directory.path}
          >{` ${workingDirectory}`}</Text>
        </Box>
      )}

      {/* TabBar showing all question titles */}
      <TabBar
        currentIndex={currentQuestionIndex}
        questions={questions}
        answers={answers}
      />

      {/* Question ID, prompt, and type indicator - all on one line */}
      <Box flexDirection="row" justifyContent="space-between">
        <Box>
          <Text color={theme.components.questionDisplay.questionId}>
            [Q{currentQuestionIndex}]
          </Text>
          <Text bold>{` ${currentQuestion.prompt} `}</Text>
          <Text color={theme.components.questionDisplay.typeIndicator}>
            [{multiSelect ? "Multiple Choice" : "Single Choice"}]
          </Text>
        </Box>
        <Text color={theme.components.questionDisplay.elapsed} dimColor>
          {elapsedLabel}
        </Text>
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
        onFocusContextChange={handleFocusContextChange}
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
