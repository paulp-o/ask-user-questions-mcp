import { Box, Text, useApp, useInput } from "ink";
import React, { useEffect, useMemo, useRef, useState } from "react";

import type { SessionRequest, UserAnswer } from "../../session/types.js";

import { t } from "../../i18n/index.js";
import { ResponseFormatter } from "../../session/ResponseFormatter.js";
import { SessionManager } from "../../session/SessionManager.js";
import { getSessionDirectory } from "../../session/utils.js";
import { useTheme } from "../ThemeContext.js";
import { useConfig } from "../ConfigContext.js";
import { isRecommendedOption } from "../utils/recommended.js";
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
  /** Called when progress changes (for progress bar support) */
  onProgress?: (answered: number, total: number) => void;
  sessionId: string;
  sessionRequest: SessionRequest;
}

/**
 * StepperView orchestrates the question-answering flow
 * Manages state for current question, answers, and navigation
 */
export const StepperView: React.FC<StepperViewProps> = ({
  onComplete,
  onProgress,
  sessionId,
  sessionRequest,
}) => {
  const { theme } = useTheme();
  const config = useConfig();
  const { exit } = useApp();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<number, Answer>>(new Map());
  const [showReview, setShowReview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showRejectionConfirm, setShowRejectionConfirm] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [focusContext, setFocusContext] = useState<
    "option" | "custom-input" | "elaborate-input"
  >("option");
  const [hasRecommendedOptions, setHasRecommendedOptions] = useState(false);
  // Session-level flag: true if ANY question in the session has recommended options
  const [hasAnyRecommendedInSession, setHasAnyRecommendedInSession] =
    useState(false);
  // Elaborate marks: Map<questionIndex, customExplanation>
  const [elaborateMarks, setElaborateMarks] = useState<Map<number, string>>(
    new Map(),
  );

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

  // Report progress when question index changes
  useEffect(() => {
    if (onProgress) {
      // answered = currentQuestionIndex (0-indexed means 0 answered when on first question)
      // When on review screen, all questions are answered
      const answered = showReview
        ? sessionRequest.questions.length
        : currentQuestionIndex;
      onProgress(answered, sessionRequest.questions.length);
    }
  }, [
    currentQuestionIndex,
    showReview,
    sessionRequest.questions.length,
    onProgress,
  ]);

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

  // Track which questions have been visited (for auto-select logic)
  const visitedQuestionsRef = useRef<Set<number>>(new Set());

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
    setElaborateMarks(new Map());

    // Reset visited questions tracking for new session
    visitedQuestionsRef.current = new Set();

    // Compute session-level recommended flag: true if ANY question has recommended options
    const anyHasRecommended = sessionRequest.questions.some((question) =>
      question.options.some((opt) => isRecommendedOption(opt.label)),
    );
    setHasAnyRecommendedInSession(anyHasRecommended);
  }, [sessionId, sessionRequest.questions]);

  // Auto-select recommended options on first visit to each question
  useEffect(() => {
    // Only run when currentQuestionIndex changes
    // Check if question was already visited
    if (visitedQuestionsRef.current.has(currentQuestionIndex)) return;

    // Mark as visited
    visitedQuestionsRef.current.add(currentQuestionIndex);

    // Check if autoSelectRecommended is enabled
    if (!config.autoSelectRecommended) return;

    // Check if question is truly unanswered
    const existing = answers.get(currentQuestionIndex);
    if (
      existing?.selectedOption ||
      existing?.selectedOptions?.length ||
      existing?.customText
    ) {
      return;
    }

    // Get current question
    const question = sessionRequest.questions[currentQuestionIndex];
    if (!question) return;

    // Find recommended options
    const recommendedOptions = question.options.filter((opt) =>
      isRecommendedOption(opt.label),
    );

    if (recommendedOptions.length === 0) return;

    // Auto-select recommended options
    if (question.multiSelect) {
      // Multi-select: select all recommended
      setAnswers((prev) => {
        const newAnswers = new Map(prev);
        newAnswers.set(currentQuestionIndex, {
          selectedOptions: recommendedOptions.map((opt) => opt.label),
        });
        return newAnswers;
      });
    } else {
      // Single-select: select first recommended
      setAnswers((prev) => {
        const newAnswers = new Map(prev);
        newAnswers.set(currentQuestionIndex, {
          selectedOption: recommendedOptions[0].label,
        });
        return newAnswers;
      });
    }
  }, [
    currentQuestionIndex,
    config.autoSelectRecommended,
    sessionRequest.questions,
    answers,
  ]);

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

      // Add elaborate requests for marked questions
      const allAnswers = [...userAnswers];
      elaborateMarks.forEach((customExplanation, questionIndex) => {
        const question = sessionRequest.questions[questionIndex];
        if (question) {
          const elaborateRequest = ResponseFormatter.formatElaborateRequest(
            questionIndex,
            question.title,
            question.prompt,
            customExplanation || undefined,
          );
          // Add as a special answer entry
          allAnswers.push({
            questionIndex,
            customText: elaborateRequest,
            timestamp: new Date().toISOString(),
          });
        }
      });

      await sessionManager.saveSessionAnswers(sessionId, {
        answers: allAnswers,
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

  // Handle elaborate option selection - marks question and auto-advances
  const handleElaborateSelect = () => {
    setElaborateMarks((prev) => {
      const newMarks = new Map(prev);
      if (newMarks.has(currentQuestionIndex)) {
        // Toggle off if already marked
        newMarks.delete(currentQuestionIndex);
      } else {
        // Mark for elaboration (preserve any existing text)
        const existingText = prev.get(currentQuestionIndex) || "";
        newMarks.set(currentQuestionIndex, existingText);
      }
      return newMarks;
    });
    // Auto-advance to next question
    handleAdvanceToNext();
  };

  // Handle elaborate text change
  const handleElaborateTextChange = (text: string) => {
    setElaborateMarks((prev) => {
      const newMarks = new Map(prev);
      newMarks.set(currentQuestionIndex, text);
      return newMarks;
    });
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

    // Ctrl+R: Quick submit with recommended options (select all recommended and go to review)
    if (
      input.toLowerCase() === "r" &&
      key.ctrl &&
      hasAnyRecommendedInSession &&
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

    // R key: Select recommended options for current question
    if (
      input.toLowerCase() === "r" &&
      !key.ctrl &&
      focusContext === "option" &&
      hasRecommendedOptions
    ) {
      const question = currentQuestion;
      const recommendedOptions = question.options.filter((opt) =>
        isRecommendedOption(opt.label),
      );

      if (recommendedOptions.length > 0) {
        if (question.multiSelect) {
          // Multi-select: select all recommended
          setAnswers((prev) => {
            const newAnswers = new Map(prev);
            newAnswers.set(currentQuestionIndex, {
              ...newAnswers.get(currentQuestionIndex),
              selectedOptions: recommendedOptions.map((opt) => opt.label),
            });
            return newAnswers;
          });
        } else {
          // Single-select: select first recommended
          handleSelectOption(recommendedOptions[0].label);
        }
      }
      return;
    }

    // Tab/Shift+Tab: Global question navigation
    // Skip when in custom-input or elaborate-input mode - MultiLineTextInput handles Tab via onSubmit
    if (
      key.tab &&
      focusContext !== "custom-input" &&
      focusContext !== "elaborate-input"
    ) {
      if (key.shift) {
        setCurrentQuestionIndex((prev) => Math.max(0, prev - 1));
      } else {
        setCurrentQuestionIndex((prev) =>
          Math.min(sessionRequest.questions.length - 1, prev + 1),
        );
      }
      return;
    }

    const shouldNavigate =
      focusContext !== "custom-input" && focusContext !== "elaborate-input";
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

  // isRecommendedOption is imported from ../utils/recommended.js

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
          message={t("confirmation.rejectMessage")}
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
          <Text color={theme.colors.pending}>{t("stepper.submitting")}</Text>
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
        elaborateMarks={elaborateMarks}
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
      hasAnyRecommendedInSession={hasAnyRecommendedInSession}
      elaborateMarks={elaborateMarks}
      onElaborateSelect={handleElaborateSelect}
      elaborateText={elaborateMarks.get(currentQuestionIndex) || ""}
      onElaborateTextChange={handleElaborateTextChange}
    />
  );
};
