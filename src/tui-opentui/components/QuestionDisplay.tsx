import React from "react";

import { t } from "../../i18n/index.js";
import type { Question } from "../../session/types.js";
import { useTheme } from "../ThemeProvider.js";
import type { Answer, FocusContext } from "../../tui/shared/types.js";

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
  onRecommendedDetected?: (hasRecommended: boolean) => void;
  hasRecommendedOptions?: boolean;
  hasAnyRecommendedInSession?: boolean;
  elaborateMarks?: Map<number, string>;
  onElaborateSelect?: () => void;
  elaborateText?: string;
  onElaborateTextChange?: (text: string) => void;
  onSelectIndex?: (index: number) => void;
}

/**
 * QuestionDisplay shows a single question with its options.
 * Composes TabBar, MarkdownPrompt, OptionsList, and Footer.
 */
export const QuestionDisplay = ({
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
  onSelectIndex,
}: QuestionDisplayProps): React.ReactNode => {
  const { theme } = useTheme();

  // Handle option selection
  const handleSelectOption = (label: string) => {
    onSelectOption(label);
  };

  // Handle custom answer change
  const handleCustomAnswerChange = (text: string) => {
    onChangeCustomAnswer(text);
  };

  return (
    <box style={{ flexDirection: "column" }}>
      {/* Working directory (if available) */}
      {workingDirectory && (
        <box style={{ flexDirection: "row" }}>
          <text fg={theme.components.directory.label}>
            {"📁"}
          </text>
          <text style={{ fg: theme.components.directory.path }}>
            {` ${workingDirectory}`}
          </text>
        </box>
      )}

      {/* TabBar showing all question titles */}
      <TabBar
        currentIndex={currentQuestionIndex}
        questions={questions}
        answers={answers}
        elaborateMarks={elaborateMarks}
        onSelectIndex={onSelectIndex}
      />

      {/* Question prompt and type indicator */}
      <box style={{ flexDirection: "column" }}>
        <box>
          <MarkdownPrompt text={currentQuestion.prompt} />
        </box>
        <box style={{ flexDirection: "row" }}>
          <text fg={theme.components.questionDisplay.elapsed}>
            {elapsedLabel}
          </text>
          <text style={{ fg: theme.components.questionDisplay.typeIndicator }}>
            {` [${multiSelect ? t("question.multipleChoice") : t("question.singleChoice")}]`}
          </text>
        </box>
      </box>

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
      {/* Footer with context-aware keybindings */}
      <box style={{ marginTop: 1 }}>
        <Footer
          focusContext={focusContext}
          multiSelect={multiSelect ?? false}
          customInputValue={customAnswer}
          hasRecommendedOptions={hasRecommendedOptions}
          hasAnyRecommendedInSession={hasAnyRecommendedInSession}
          showSessionSwitching={showSessionSwitching}
        />
      </box>
    </box>
  );
};