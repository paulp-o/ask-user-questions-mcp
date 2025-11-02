import { Box, Text, useApp, useInput } from "ink";
import React, { useState } from "react";

import type { SessionRequest, UserAnswer } from "../../session/types.js";

import { SessionManager } from "../../session/SessionManager.js";
import { QuestionDisplay } from "./QuestionDisplay.js";
import { ReviewScreen } from "./ReviewScreen.js";

interface Answer {
  customText?: string;
  selectedOption?: string;
}

interface StepperViewProps {
  onComplete?: () => void;
  sessionId: string;
  sessionRequest: SessionRequest;
}

/**
 * StepperView orchestrates the question-answering flow
 * Manages state for current question, answers, and navigation
 */
export const StepperView: React.FC<StepperViewProps> = ({
  onComplete,
  sessionId,
  sessionRequest,
}) => {
  // const { exit } =
  useApp();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<number, Answer>>(new Map());
  const [showReview, setShowReview] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const currentQuestion = sessionRequest.questions[currentQuestionIndex];

  // Handle option selection
  const handleSelectOption = (label: string) => {
    setAnswers((prev) => {
      const newAnswers = new Map(prev);
      const existing = newAnswers.get(currentQuestionIndex) || {};
      newAnswers.set(currentQuestionIndex, {
        ...existing,
        selectedOption: label,
      });
      return newAnswers;
    });
  };

  // Handle custom answer text
  const handleChangeCustomAnswer = (text: string) => {
    setAnswers((prev) => {
      const newAnswers = new Map(prev);
      const existing = newAnswers.get(currentQuestionIndex) || {};
      newAnswers.set(currentQuestionIndex, {
        ...existing,
        customText: text,
      });
      return newAnswers;
    });
  };

  // Handle answer confirmation
  const handleConfirm = async (userAnswers: UserAnswer[]) => {
    setSubmitting(true);
    try {
      const sessionManager = new SessionManager();
      await sessionManager.saveSessionAnswers(sessionId, {
        answers: userAnswers,
        sessionId,
        timestamp: new Date().toISOString(),
      });
      // Call onComplete callback immediately (toast will show in parent)
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error("Failed to save answers:", error);
      setSubmitting(false);
    }
  };

  // Handle going back from review
  const handleGoBack = () => {
    setShowReview(false);
  };

  // Handle advance to next question or review
  const handleAdvanceToNext = () => {
    if (currentQuestionIndex < sessionRequest.questions.length - 1) {
      // Move to next question
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      // Last question - show review
      setShowReview(true);
    }
  };

  // Global keyboard shortcuts and navigation
  useInput((input, key) => {
    // Don't handle navigation when showing review or submitting
    if (showReview || submitting) return;

    // Question navigation with arrow keys
    if (key.leftArrow && currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
    if (
      key.rightArrow &&
      currentQuestionIndex < sessionRequest.questions.length - 1
    ) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  });

  const currentAnswer = answers.get(currentQuestionIndex);

  // Show submitting message
  if (submitting) {
    return (
      <Box flexDirection="column" padding={1}>
        <Box borderColor="yellow" borderStyle="single" padding={1}>
          <Text color="yellow">Submitting answers...</Text>
        </Box>
      </Box>
    );
  }

  // Show review screen
  if (showReview) {
    return (
      <ReviewScreen
        answers={answers}
        onConfirm={handleConfirm}
        onGoBack={handleGoBack}
        questions={sessionRequest.questions}
        sessionId={sessionId}
      />
    );
  }

  // Show question display (default)
  return (
    <QuestionDisplay
      currentQuestion={currentQuestion}
      currentQuestionIndex={currentQuestionIndex}
      customAnswer={currentAnswer?.customText}
      onAdvanceToNext={handleAdvanceToNext}
      onChangeCustomAnswer={handleChangeCustomAnswer}
      onSelectOption={handleSelectOption}
      questions={sessionRequest.questions}
      selectedOption={currentAnswer?.selectedOption}
    />
  );
};
