import { Box, Text } from "ink";
import React from "react";

import { t } from "../../i18n/index.js";
import type { Question } from "../../session/types.js";
import { useTheme } from "../ThemeContext.js";
import type { Answer, FocusContext } from "../types.js";

import { Footer } from "./Footer.js";
import { MarkdownPrompt } from "./MarkdownPrompt.js";
import { OptionsList } from "./OptionsList.js";
import { TabBar } from "./TabBar.js";

interface QuestionDisplayProps {
  currentQuestion: Question;
  currentQuestionIndex: number;
  customAnswer?: string;
  showSessionSwitching?: boolean;
  elapsedLabel: string;
  onChangeCustomAnswer: (text: string) => void;
  onSelectOption: (label: string) => void;
  questions: Question[];
  selectedOption?: string;
  onAdvanceToNext?: () => void;
  answers: Map<number, Answer>;
  onToggleOption?: (label: string) => void;
  multiSelect?: boolean;
  focusContext: FocusContext;
  onFocusContextChange?: (context: FocusContext) => void;
  focusedOptionIndex: number;
  onFocusedOptionIndexChange?: (index: number) => void;
  workingDirectory?: string;
  // Recommended option detection
  onRecommendedDetected?: (hasRecommended: boolean) => void;
  hasRecommendedOptions?: boolean;
  // Session-level recommended flag for Ctrl+R visibility
  hasAnyRecommendedInSession?: boolean;
  // Elaborate marks for visual indicators
  elaborateMarks?: Map<number, string>;
  // Elaborate selection handler
  onElaborateSelect?: () => void;
  // Elaborate text input support
  elaborateText?: string;
  onElaborateTextChange?: (text: string) => void;
}

/**
 * QuestionDisplay shows a single question with its options
 * Includes TabBar, question prompt, options list, and footer
 */
export const QuestionDisplay: React.FC<QuestionDisplayProps> = ({
  currentQuestion,
  currentQuestionIndex,
  customAnswer = "",
  showSessionSwitching,
  elapsedLabel,
  onChangeCustomAnswer,
  onSelectOption,
  questions,
  selectedOption,
  onAdvanceToNext,
  answers,
  onToggleOption,
  multiSelect,
  focusContext,
  onFocusContextChange,
  focusedOptionIndex,
  onFocusedOptionIndexChange,
  workingDirectory,
  onRecommendedDetected,
  hasRecommendedOptions,
  hasAnyRecommendedInSession,
  elaborateMarks,
  onElaborateSelect,
  elaborateText = "",
  onElaborateTextChange,
}) => {
  const { theme } = useTheme();
  const FooterWithSessionSwitching = Footer as React.ComponentType<
    React.ComponentProps<typeof Footer> & { showSessionSwitching?: boolean }
  >;

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
            📁
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
        elaborateMarks={elaborateMarks}
      />

      {/* Question prompt and type indicator */}
      <Box flexDirection="column">
        <Box>
          <MarkdownPrompt text={currentQuestion.prompt} />
          <Text color={theme.components.questionDisplay.typeIndicator}>
            {" "}
            [
            {multiSelect
              ? t("question.multipleChoice")
              : t("question.singleChoice")}
            ]
          </Text>
        </Box>
        <Box>
          <Text color={theme.components.questionDisplay.elapsed} dimColor>
            {elapsedLabel}
          </Text>
        </Box>
      </Box>

      {/* Options list with integrated custom input and elaborate option */}
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
        onFocusContextChange={onFocusContextChange}
        focusedIndex={focusedOptionIndex}
        onFocusedIndexChange={onFocusedOptionIndexChange}
        onRecommendedDetected={onRecommendedDetected}
        questionKey={currentQuestionIndex}
        isElaborateMarked={elaborateMarks?.has(currentQuestionIndex)}
        onElaborateSelect={onElaborateSelect}
        elaborateText={elaborateText}
        onElaborateTextChange={onElaborateTextChange}
      />

      {/* Footer with context-aware keybindings */}
      <FooterWithSessionSwitching
        focusContext={focusContext}
        multiSelect={multiSelect ?? false}
        customInputValue={customAnswer}
        hasRecommendedOptions={hasRecommendedOptions}
        hasAnyRecommendedInSession={hasAnyRecommendedInSession}
        showSessionSwitching={showSessionSwitching}
      />
    </Box>
  );
};
