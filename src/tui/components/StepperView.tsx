import { Box, Text, useApp, useInput } from "ink";
import React, { useEffect, useMemo, useRef, useState } from "react";

import type { SessionRequest, UserAnswer } from "../../session/types.js";

import { ResponseFormatter } from "../../session/ResponseFormatter.js";
import { SessionManager } from "../../session/SessionManager.js";
import { getSessionDirectory } from "../../session/utils.js";
import { theme } from "../theme.js";
import { ConfirmationDialog } from "./ConfirmationDialog.js";
import { QuestionDisplay } from "./QuestionDisplay.js";
import { ReviewScreen } from "./ReviewScreen.js";

interface Answer {
  customText?: string;
  selectedOption?: string; // For single-select
  selectedOptions?: string[]; // For multi-select
}

interface StepperViewProps {
  onComplete?: (wasRejected?: boolean, rejectionReason?: string | null) => void;
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
  const { exit } = useApp();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<number, Answer>>(new Map());
  const [showReview, setShowReview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showRejectionConfirm, setShowRejectionConfirm] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [focusContext, setFocusContext] = useState<"option" | "custom-input">(
    "option",
  );
  const [hasRecommendedOptions, setHasRecommendedOptions] = useState(false);

  const safeIndex = Math.min(
    currentQuestionIndex,
    sessionRequest.questions.length - 1,
  );
  const currentQuestion = sessionRequest.questions[safeIndex];
  const sessionCreatedAt = useMemo(() => {
    const parsed = Date.parse(sessionRequest.timestamp);
    return Number.isNaN(parsed) ? Date.now() : parsed;
  }, [sessionRequest.timestamp]);

  const elapsedLabel = useMemo(() => {
    const hours = Math.floor(elapsedSeconds / 3600);
    const minutes = Math.floor((elapsedSeconds % 3600) / 60);
    const seconds = elapsedSeconds % 60;
    return [hours, minutes, seconds]
      .map((value) => value.toString().padStart(2, "0"))
      .join(":");
  }, [elapsedSeconds]);

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

  const handleToggleOption = (label: string) => {
    setAnswers((prev) => {
      const newAnswers = new Map(prev);
      const existing = newAnswers.get(currentQuestionIndex) || {};
      const currentSelections = existing.selectedOptions || [];

      const newSelections = currentSelections.includes(label)
        ? currentSelections.filter((l) => l !== label) // Remove if already selected
        : [...currentSelections, label]; // Add if not selected

      newAnswers.set(currentQuestionIndex, {
        selectedOptions: newSelections,
        // Keep customText in multi-select mode (allow both)
        customText: existing.customText,
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

  // Track mount status to avoid state updates after unmount
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Reset internal stepper state when the session changes (safety in case component isn't remounted)
  useEffect(() => {
    setCurrentQuestionIndex(0);
    setAnswers(new Map());
    setShowReview(false);
    setSubmitting(false);
    setShowRejectionConfirm(false);
    setElapsedSeconds(0);
  }, [sessionId]);

  // Update elapsed time since session creation
  useEffect(() => {
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - sessionCreatedAt) / 1000);
      setElapsedSeconds(elapsed >= 0 ? elapsed : 0);
    }, 1000);

    return () => clearInterval(timer);
  }, [sessionCreatedAt]);

  // Handle answer confirmation
  const handleConfirm = async (userAnswers: UserAnswer[]) => {
    setSubmitting(true);
    try {
      const sessionManager = new SessionManager({
        baseDir: getSessionDirectory(),
      });
      await sessionManager.saveSessionAnswers(sessionId, {
        answers: userAnswers,
        sessionId,
        timestamp: new Date().toISOString(),
        callId: sessionRequest.callId,
      });
      // Signal completion (successful submission)
      onComplete?.(false);
    } catch (error) {
      console.error("Failed to save answers:", error);
    } finally {
      if (isMountedRef.current) {
        setSubmitting(false);
      }
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

  // Handle session rejection
  const handleRejectSession = async (reason: string | null) => {
    try {
      const sessionManager = new SessionManager({
        baseDir: getSessionDirectory(),
      });
      await sessionManager.rejectSession(sessionId, reason);

      // Call onComplete with rejection flag and reason
      if (onComplete) {
        onComplete(true, reason);
      }
    } catch (error) {
      console.error("Failed to reject session:", error);
      setShowRejectionConfirm(false);
    }
  };

  // Global keyboard shortcuts and navigation
  useInput((input, key) => {
    // Don't handle navigation when showing review, submitting, or confirming rejection
    if (showReview || submitting || showRejectionConfirm) return;

    // Esc key - show rejection confirmation
    if (key.escape) {
      setShowRejectionConfirm(true);
      return;
    }

    // Ctrl+Enter: Quick submit with recommended options
    if (
      key.return &&
      key.ctrl &&
      hasRecommendedOptions &&
      focusContext === "option"
    ) {
      // Auto-fill all unanswered questions with recommended options
      const newAnswers = new Map(answers);

      for (let i = 0; i < sessionRequest.questions.length; i++) {
        const question = sessionRequest.questions[i];
        const existingAnswer = newAnswers.get(i);

        // Skip if already answered
        if (
          existingAnswer?.selectedOption ||
          existingAnswer?.selectedOptions?.length ||
          existingAnswer?.customText
        ) {
          continue;
        }

        // Find recommended options for this question
        const recommendedOptions = question.options.filter((opt) =>
          isRecommendedOption(opt.label),
        );

        if (recommendedOptions.length > 0) {
          if (question.multiSelect) {
            // Multi-select: select all recommended
            newAnswers.set(i, {
              selectedOptions: recommendedOptions.map((opt) => opt.label),
            });
          } else {
            // Single-select: select first recommended
            newAnswers.set(i, {
              selectedOption: recommendedOptions[0].label,
            });
          }
        }
      }

      setAnswers(newAnswers);
      setShowReview(true);
      return;
    }

    // E key: Elaborate request (only when focus is on options, not in custom input)
    if (input.toLowerCase() === "e" && focusContext === "option") {
      void handleSpecialRequest("elaborate");
      return;
    }

    // D key: Rephrase request (only when focus is on options, not in custom input)
    if (input.toLowerCase() === "d" && focusContext === "option") {
      void handleSpecialRequest("rephrase");
      return;
    }

    // Tab/Shift+Tab: Global question navigation (works in all contexts)
    if (key.tab && key.shift) {
      setCurrentQuestionIndex((prev) => Math.max(0, prev - 1));
      return;
    }
    if (key.tab && !key.shift) {
      setCurrentQuestionIndex((prev) =>
        Math.min(sessionRequest.questions.length - 1, prev + 1),
      );
      return;
    }

    const shouldNavigate = focusContext !== "custom-input";
    if (shouldNavigate && key.leftArrow && currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
    if (
      shouldNavigate &&
      key.rightArrow &&
      currentQuestionIndex < sessionRequest.questions.length - 1
    ) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  });

  const currentAnswer = answers.get(currentQuestionIndex);

  // Helper to detect recommended options
  const isRecommendedOption = (label: string): boolean => {
    const pattern = /\[?\(?(recommended|추천)\)?\]?/i;
    return pattern.test(label);
  };

  // Handle elaborate or rephrase special requests
  const handleSpecialRequest = async (type: "elaborate" | "rephrase") => {
    const question = currentQuestion;
    if (!question) return;

    setSubmitting(true);
    try {
      const sessionManager = new SessionManager({
        baseDir: getSessionDirectory(),
      });

      // Create the formatted request
      const requestText =
        type === "elaborate"
          ? ResponseFormatter.formatElaborateRequest(
              currentQuestionIndex,
              question.title,
              question.prompt,
            )
          : ResponseFormatter.formatRephraseRequest(
              currentQuestionIndex,
              question.title,
            );

      // Save a special session answer with the request as customText
      const specialAnswer: UserAnswer = {
        customText: requestText,
        questionIndex: currentQuestionIndex,
        timestamp: new Date().toISOString(),
      };

      await sessionManager.saveSessionAnswers(sessionId, {
        answers: [specialAnswer],
        sessionId,
        timestamp: new Date().toISOString(),
        callId: sessionRequest.callId,
      });

      // Signal completion (successful submission with special request)
      onComplete?.(false);
    } catch (error) {
      console.error(`Failed to save ${type} request:`, error);
    } finally {
      if (isMountedRef.current) {
        setSubmitting(false);
      }
    }
  };

  // Show rejection confirmation
  if (showRejectionConfirm) {
    return (
      <Box flexDirection="column" padding={1}>
        <ConfirmationDialog
          message="Are you sure you want to reject this question set?"
          onCancel={() => setShowRejectionConfirm(false)}
          onQuit={() => exit()}
          onReject={handleRejectSession}
        />
      </Box>
    );
  }

  // Show submitting message
  if (submitting) {
    return (
      <Box flexDirection="column" padding={1}>
        <Box
          borderColor={theme.colors.pending}
          borderStyle="single"
          padding={1}
        >
          <Text color={theme.colors.pending}>Submitting answers...</Text>
        </Box>
      </Box>
    );
  }

  // Show review screen
  if (showReview) {
    return (
      <ReviewScreen
        answers={answers}
        elapsedLabel={elapsedLabel}
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
      elapsedLabel={elapsedLabel}
      onAdvanceToNext={handleAdvanceToNext}
      onChangeCustomAnswer={handleChangeCustomAnswer}
      onSelectOption={handleSelectOption}
      onToggleOption={handleToggleOption}
      multiSelect={currentQuestion.multiSelect}
      questions={sessionRequest.questions}
      selectedOption={currentAnswer?.selectedOption}
      answers={answers}
      onFocusContextChange={setFocusContext}
      workingDirectory={sessionRequest.workingDirectory}
      onRecommendedDetected={setHasRecommendedOptions}
    />
  );
};
