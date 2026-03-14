import React, { useEffect, useMemo, useRef, useState } from "react";
import { useKeyboard } from "@opentui/react";

import type { SessionRequest, UserAnswer } from "../../session/types.js";

import { t } from "../../i18n/index.js";
import { ResponseFormatter } from "../../session/ResponseFormatter.js";
import { SessionManager } from "../../session/SessionManager.js";
import { getSessionDirectory } from "../../session/utils.js";
import { useTheme } from "../ThemeProvider.js";
import { useConfig } from "../ConfigContext.js";
import { useTerminalDimensions } from "../hooks/useTerminalDimensions.js";
import type { Answer, FocusContext, SessionUIState } from "../../tui/shared/types.js";
import { isRecommendedOption } from "../../tui/shared/utils/recommended.js";
import { KEYS } from "../../tui/constants/keybindings.js";
import { ConfirmationDialog } from "./ConfirmationDialog.js";
import { QuestionDisplay } from "./QuestionDisplay.js";
import { ReviewScreen } from "./ReviewScreen.js";

interface StepperViewProps {
  onComplete?: (wasRejected?: boolean, rejectionReason?: string | null) => void;
  onProgress?: (answered: number, total: number) => void;
  hasMultipleSessions?: boolean;
  initialState?: SessionUIState;
  onStateSnapshot?: (sessionId: string, state: SessionUIState) => void;
  onFlowStateChange?: (state: {
    showReview: boolean;
    showRejectionConfirm: boolean;
    showAbandonedConfirm: boolean;
  }) => void;
  sessionId: string;
  sessionRequest: SessionRequest;
  isAbandoned?: boolean;
  onAbandonedCancel?: () => void;
}

/**
 * StepperView orchestrates the question-answering flow.
 * Manages state for current question, answers, and navigation.
 */
export const StepperView: React.FC<StepperViewProps> = ({
  onComplete,
  onProgress,
  hasMultipleSessions,
  initialState,
  onStateSnapshot,
  onFlowStateChange,
  sessionId,
  sessionRequest,
  isAbandoned,
  onAbandonedCancel,
}) => {
  const { theme } = useTheme();
  const config = useConfig();
  const { height: terminalRows } = useTerminalDimensions();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<number, Answer>>(new Map());
  const [showReview, setShowReview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showRejectionConfirm, setShowRejectionConfirm] = useState(false);
  const [showAbandonedConfirm, setShowAbandonedConfirm] = useState(false);
  const [abandonedConfirmed, setAbandonedConfirmed] = useState(false);
  const [abandonedFocusedIndex, setAbandonedFocusedIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [focusContext, setFocusContext] = useState<FocusContext>("option");
  const [focusedOptionIndex, setFocusedOptionIndex] = useState(0);
  const [hasRecommendedOptions, setHasRecommendedOptions] = useState(false);
  const [hasAnyRecommendedInSession, setHasAnyRecommendedInSession] =
    useState(false);
  const [elaborateMarks, setElaborateMarks] = useState<Map<number, string>>(
    new Map(),
  );
  const [forceMultiByQuestion, setForceMultiByQuestion] = useState<Set<number>>(
    new Set(),
  );

  const safeIndex = Math.min(
    currentQuestionIndex,
    sessionRequest.questions.length - 1,
  );
  const currentQuestion = sessionRequest.questions[safeIndex];
  const isQuestionMultiSelect = (questionIndex: number): boolean => {
    const question = sessionRequest.questions[questionIndex];
    return Boolean(question?.multiSelect || forceMultiByQuestion.has(questionIndex));
  };
  const currentQuestionMultiSelect = isQuestionMultiSelect(currentQuestionIndex);
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

  // Detect content overflow to pause periodic re-renders
  const [isOverflowing, setIsOverflowing] = useState(false);
  const isOverflowingRef = useRef(isOverflowing);
  isOverflowingRef.current = isOverflowing;

  // Report progress when question index changes
  useEffect(() => {
    if (onProgress) {
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

  // Reset focused option to first when switching between questions
  useEffect(() => {
    setFocusedOptionIndex(0);
  }, [currentQuestionIndex]);

  // Handle option selection (single-select mode)
  const handleSelectOption = (label: string) => {
    const existing = answers.get(currentQuestionIndex) || {};
    const isDeselecting = existing.selectedOption === label;

    setAnswers((prev) => {
      const newAnswers = new Map(prev);
      const existingAnswer = newAnswers.get(currentQuestionIndex) || {};
      if (isDeselecting) {
        newAnswers.set(currentQuestionIndex, {
          ...existingAnswer,
          selectedOption: undefined,
          selectedOptions: undefined,
        });
      } else {
        newAnswers.set(currentQuestionIndex, {
          ...existingAnswer,
          selectedOption: label,
          selectedOptions: undefined,
          customText: undefined,
        });
      }
      return newAnswers;
    });

    // Clear elaborate mark only when SELECTING (not deselecting) a regular option
    if (!isDeselecting) {
      setElaborateMarks((prev) => {
        if (prev.has(currentQuestionIndex)) {
          const newMarks = new Map(prev);
          newMarks.delete(currentQuestionIndex);
          return newMarks;
        }
        return prev;
      });
    }
  };

  const handleToggleOption = (label: string) => {
    setAnswers((prev) => {
      const newAnswers = new Map(prev);
      const existing = newAnswers.get(currentQuestionIndex) || {};
      const currentSelections = existing.selectedOptions || [];

      const isAdding = !currentSelections.includes(label);
      const newSelections = isAdding
        ? [...currentSelections, label]
        : currentSelections.filter((l) => l !== label);

      newAnswers.set(currentQuestionIndex, {
        ...existing,
        selectedOption: undefined,
        selectedOptions: newSelections,
        customText: existing.customText,
      });
      return newAnswers;
    });

    // Clear elaboration when selecting a regular option (mutually exclusive)
    const currentSelections =
      answers.get(currentQuestionIndex)?.selectedOptions || [];
    const isAdding = !currentSelections.includes(label);
    if (isAdding && elaborateMarks.has(currentQuestionIndex)) {
      setElaborateMarks((prev) => {
        const newMarks = new Map(prev);
        newMarks.delete(currentQuestionIndex);
        return newMarks;
      });
    }
  };

  // Handle custom answer text
  const handleChangeCustomAnswer = (text: string) => {
    setAnswers((prev) => {
      const newAnswers = new Map(prev);
      const existing = newAnswers.get(currentQuestionIndex) || {};
      const isMultiSelect = isQuestionMultiSelect(currentQuestionIndex);
      newAnswers.set(currentQuestionIndex, {
        ...existing,
        customText: text,
        // Single-choice: clear selectedOption when typing custom text
        ...(text.trim().length > 0 && !isMultiSelect ? { selectedOption: undefined } : {}),
      });
      return newAnswers;
    });

    // Clear elaboration when typing custom text (mutually exclusive)
    if (text.trim().length > 0 && elaborateMarks.has(currentQuestionIndex)) {
      setElaborateMarks((prev) => {
        const newMarks = new Map(prev);
        newMarks.delete(currentQuestionIndex);
        return newMarks;
      });
    }
  };

  // Track mount status to avoid state updates after unmount
  const isMountedRef = useRef(true);
  const skipSnapshotRef = useRef(true);
  const sessionIdRef = useRef<string | null>(null);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Reset internal stepper state when the session changes
  useEffect(() => {
    // Only run full initialization when the session actually changes.
    // When a snapshot is saved (cursor movement), initialState prop changes but
    // sessionId stays the same — skip the reset to avoid resetting the timer.
    if (sessionId === sessionIdRef.current) return;
    sessionIdRef.current = sessionId;

    const maxQuestionIndex = Math.max(0, sessionRequest.questions.length - 1);

    if (initialState) {
      const hydratedQuestionIndex = Math.min(
        Math.max(initialState.currentQuestionIndex, 0),
        maxQuestionIndex,
      );
      const hydratedQuestion = sessionRequest.questions[hydratedQuestionIndex];
      const maxFocusedOptionIndex = (hydratedQuestion?.options.length ?? 0) + 1;

      setCurrentQuestionIndex(hydratedQuestionIndex);
      setAnswers(new Map(initialState.answers));
      setElaborateMarks(new Map(initialState.elaborateMarks));
      setFocusContext(initialState.focusContext);
      setFocusedOptionIndex(
        Math.min(
          Math.max(initialState.focusedOptionIndex, 0),
          Math.max(0, maxFocusedOptionIndex),
        ),
      );
      setShowReview(initialState.showReview);
    } else {
      setCurrentQuestionIndex(0);
      setAnswers(new Map());
      setElaborateMarks(new Map());
      setFocusContext("option");
      setFocusedOptionIndex(0);
      setShowReview(false);
    }

    setSubmitting(false);
    setForceMultiByQuestion(new Set());
    setShowRejectionConfirm(false);
    setElapsedSeconds(0);
    skipSnapshotRef.current = true;

    // Compute session-level recommended flag
    const anyHasRecommended = sessionRequest.questions.some((question) =>
      question.options.some((opt) => isRecommendedOption(opt.label)),
    );
    setHasAnyRecommendedInSession(anyHasRecommended);
  }, [initialState, sessionId, sessionRequest.questions]);

  // Show abandoned confirmation when entering an abandoned session
  useEffect(() => {
    if (isAbandoned && !abandonedConfirmed) {
      setShowAbandonedConfirm(true);
      setAbandonedFocusedIndex(0);
    } else {
      setShowAbandonedConfirm(false);
    }
  }, [sessionId, isAbandoned, abandonedConfirmed]);

  // Emit state snapshot on changes
  useEffect(() => {
    if (!onStateSnapshot) {
      return;
    }

    if (skipSnapshotRef.current) {
      skipSnapshotRef.current = false;
      return;
    }

    onStateSnapshot(sessionId, {
      currentQuestionIndex,
      answers: new Map(answers),
      elaborateMarks: new Map(elaborateMarks),
      focusContext,
      focusedOptionIndex,
      showReview,
    });
  }, [
    answers,
    currentQuestionIndex,
    elaborateMarks,
    focusContext,
    focusedOptionIndex,
    onStateSnapshot,
    sessionId,
    showReview,
  ]);

  // Emit flow state changes
  useEffect(() => {
    onFlowStateChange?.({ showReview, showRejectionConfirm, showAbandonedConfirm });
  }, [onFlowStateChange, showRejectionConfirm, showReview, showAbandonedConfirm]);

  // Update elapsed time since session creation
  useEffect(() => {
    const timer = setInterval(() => {
      if (isOverflowingRef.current) return;
      const elapsed = Math.floor((Date.now() - sessionCreatedAt) / 1000);
      setElapsedSeconds(elapsed >= 0 ? elapsed : 0);
    }, 1000);

    return () => clearInterval(timer);
  }, [sessionCreatedAt]);

  // Detect overflow: estimate content height vs terminal rows
  useEffect(() => {
    const currentQ = sessionRequest.questions[safeIndex];
    const optionCount = currentQ?.options?.length ?? 0;
    const estimatedContentHeight = 2 + 3 + 3 + optionCount * 2 + 2 + 6 + 2;
    const nextOverflow = estimatedContentHeight > terminalRows;
    setIsOverflowing((prev) => (prev === nextOverflow ? prev : nextOverflow));
  }, [safeIndex, sessionRequest.questions, terminalRows]);

  // Handle answer confirmation
  const handleConfirm = async (userAnswers: UserAnswer[]) => {
    setSubmitting(true);
    try {
      const sessionManager = new SessionManager({
        baseDir: getSessionDirectory(),
      });

      // Apply forced single/multi override before persisting answers
      const normalizedAnswers = userAnswers.map((answer) => {
        const isMultiSelect = isQuestionMultiSelect(answer.questionIndex);

        if (isMultiSelect) {
          const selectedOptions = answer.selectedOptions ??
            (answer.selectedOption ? [answer.selectedOption] : undefined);
          return {
            ...answer,
            selectedOption: undefined,
            selectedOptions,
          };
        }

        const selectedOption = answer.selectedOption ?? answer.selectedOptions?.[0];
        return {
          ...answer,
          selectedOption,
          selectedOptions: undefined,
        };
      });

      const allAnswers = [...normalizedAnswers];
      elaborateMarks.forEach((customExplanation, questionIndex) => {
        const question = sessionRequest.questions[questionIndex];
        if (question) {
          const elaborateRequest = ResponseFormatter.formatElaborateRequest(
            questionIndex,
            question.title,
            question.prompt,
            customExplanation || undefined,
          );
          allAnswers.push({
            questionIndex,
            selectedOption: undefined,
            selectedOptions: undefined,
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
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
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

      if (onComplete) {
        onComplete(true, reason);
      }
    } catch (error) {
      console.error("Failed to reject session:", error);
      setShowRejectionConfirm(false);
    }
  };

  // Handle elaborate option selection
  const handleElaborateSelect = () => {
    const isMarking = !elaborateMarks.has(currentQuestionIndex);

    setElaborateMarks((prev) => {
      const newMarks = new Map(prev);
      if (newMarks.has(currentQuestionIndex)) {
        newMarks.delete(currentQuestionIndex);
      } else {
        const existingText = prev.get(currentQuestionIndex) || "";
        newMarks.set(currentQuestionIndex, existingText);
      }
      return newMarks;
    });

    // In single-select mode, clear selected option when marking elaborate
    if (isMarking && !currentQuestionMultiSelect) {
      setAnswers((prev) => {
        const existing = prev.get(currentQuestionIndex);
        if (existing?.selectedOption || existing?.customText) {
          const newAnswers = new Map(prev);
          newAnswers.set(currentQuestionIndex, {
            ...existing,
            selectedOption: undefined,
            customText: undefined,
          });
          return newAnswers;
        }
        return prev;
      });
    }
  };

  // Handle elaborate text change
  const handleElaborateTextChange = (text: string) => {
    if (!text.trim()) {
      // Auto-remove elaborate mark when text is cleared
      setElaborateMarks((prev) => {
        if (prev.has(currentQuestionIndex)) {
          const newMarks = new Map(prev);
          newMarks.delete(currentQuestionIndex);
          return newMarks;
        }
        return prev;
      });
    } else {
      setElaborateMarks((prev) => {
        const newMarks = new Map(prev);
        newMarks.set(currentQuestionIndex, text);
        return newMarks;
      });
    }
  };

  const handleToggleForceMulti = () => {
    if (currentQuestion.multiSelect) return;

    const wasForced = forceMultiByQuestion.has(currentQuestionIndex);

    setForceMultiByQuestion((prev) => {
      const next = new Set(prev);
      if (next.has(currentQuestionIndex)) {
        next.delete(currentQuestionIndex);
      } else {
        next.add(currentQuestionIndex);
      }
      return next;
    });

    setAnswers((prev) => {
      const existing = prev.get(currentQuestionIndex);
      if (!existing) return prev;

      const nextAnswers = new Map(prev);

      if (wasForced) {
        const firstSelected = existing.selectedOptions?.[0] ?? existing.selectedOption;
        nextAnswers.set(currentQuestionIndex, {
          ...existing,
          selectedOption: firstSelected,
          selectedOptions: undefined,
        });
      } else {
        const promotedSelections = existing.selectedOptions?.length
          ? existing.selectedOptions
          : existing.selectedOption
            ? [existing.selectedOption]
            : [];
        nextAnswers.set(currentQuestionIndex, {
          ...existing,
          selectedOption: undefined,
          selectedOptions: promotedSelections,
        });
      }

      return nextAnswers;
    });
  };

  // Keyboard handling for abandoned confirmation dialog
  useKeyboard((key) => {
    if (!showAbandonedConfirm) return;

    if (key.name === "up") {
      setAbandonedFocusedIndex((prev) => Math.max(0, prev - 1));
    }
    if (key.name === "down") {
      setAbandonedFocusedIndex((prev) => Math.min(1, prev + 1));
    }
    if (key.name === "return") {
      if (abandonedFocusedIndex === 0) {
        setAbandonedConfirmed(true);
        setShowAbandonedConfirm(false);
      } else {
        onAbandonedCancel?.();
      }
    }
    if (key.name === "escape") {
      onAbandonedCancel?.();
    }
  });

  // Global keyboard shortcuts and navigation
  useKeyboard((key) => {
    // Don't handle navigation when showing review, submitting, or confirming
    if (showReview || submitting || showRejectionConfirm || showAbandonedConfirm) return;

    // Derive text-input state from both focusContext and focusedOptionIndex
    const isInTextInput =
      focusContext !== "option" ||
      focusedOptionIndex >= currentQuestion.options.length;

    // Esc key - show rejection confirmation
    if (key.name === "escape") {
      setShowRejectionConfirm(true);
      return;
    }

    // Ctrl+R: Quick submit with recommended options
    if (
      key.name?.toLowerCase() === KEYS.QUICK_SUBMIT &&
      key.ctrl &&
      hasAnyRecommendedInSession &&
      !isInTextInput
    ) {
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

        const recommendedOptions = question.options.filter((opt) =>
          isRecommendedOption(opt.label),
        );

        if (recommendedOptions.length > 0) {
          if (isQuestionMultiSelect(i)) {
            newAnswers.set(i, {
              selectedOptions: recommendedOptions.map((opt) => opt.label),
            });
          } else {
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
      key.name?.toLowerCase() === KEYS.RECOMMEND &&
      !key.ctrl &&
      !isInTextInput &&
      hasRecommendedOptions
    ) {
      const question = currentQuestion;
      const recommendedOptions = question.options.filter((opt) =>
        isRecommendedOption(opt.label),
      );

      if (recommendedOptions.length > 0) {
        if (currentQuestionMultiSelect) {
          setAnswers((prev) => {
            const newAnswers = new Map(prev);
            newAnswers.set(currentQuestionIndex, {
              ...newAnswers.get(currentQuestionIndex),
              selectedOption: undefined,
              selectedOptions: recommendedOptions.map((opt) => opt.label),
            });
            return newAnswers;
          });
        } else {
          handleSelectOption(recommendedOptions[0].label);
        }
      }
      return;
    }

    if (
      key.name?.toLowerCase() === "m" &&
      key.ctrl &&
      !isInTextInput &&
      !currentQuestion.multiSelect
    ) {
      handleToggleForceMulti();
      return;
    }

    // Tab/Shift+Tab: Global question navigation
    if (key.name === "tab" && !isInTextInput) {
      if (key.shift) {
        setCurrentQuestionIndex((prev) => Math.max(0, prev - 1));
      } else {
        setCurrentQuestionIndex((prev) =>
          Math.min(sessionRequest.questions.length - 1, prev + 1),
        );
      }
      return;
    }

    // Left/Right arrow: question navigation (only when NOT in text input)
    if (!isInTextInput && key.name === "left" && currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
    if (
      !isInTextInput &&
      key.name === "right" &&
      currentQuestionIndex < sessionRequest.questions.length - 1
    ) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  });

  const currentAnswer = answers.get(currentQuestionIndex);

  // Show abandoned session confirmation
  if (showAbandonedConfirm) {
    const abandonedOptions = [
      { label: t("abandoned.continue") },
      { label: t("abandoned.cancel") },
    ];

    return (
      <box style={{ flexDirection: "column", paddingLeft: 2, paddingRight: 2, paddingTop: 1, paddingBottom: 1 }}>
        <box
          style={{
            borderStyle: "rounded",
            borderColor: theme.borders.warning,
            flexDirection: "column",
            padding: 1,
          }}
        >
          <box style={{ marginBottom: 1 }}>
            <text style={{ fg: theme.colors.warning, bold: true }}>{t("abandoned.title")}</text>
          </box>
          <box style={{ marginBottom: 1 }}>
            <text>{t("abandoned.message")}</text>
          </box>
          {abandonedOptions.map((option, index) => {
            const isFocused = index === abandonedFocusedIndex;
            const rowBg = isFocused
              ? theme.components.options.focusedBg
              : undefined;
            return (
              <box key={index} style={{ marginTop: index > 0 ? 1 : 0 }}>
                <text
                  bg={rowBg}
                  fg={isFocused ? theme.colors.focused : theme.colors.text}
                  style={{ bold: isFocused }}
                >
                  {`${isFocused ? "> " : "  "}${option.label}`}
                </text>
              </box>
            );
          })}
          <box style={{ marginTop: 1 }}>
            <text fg={theme.colors.textDim}>{"\u2191\u2193 Navigate | Enter Select"}</text>
          </box>
        </box>
      </box>
    );
  }

  // Show rejection confirmation
  if (showRejectionConfirm) {
    return (
      <box style={{ flexDirection: "column", paddingLeft: 2, paddingRight: 2, paddingTop: 1, paddingBottom: 1 }}>
        <ConfirmationDialog
          message={t("confirmation.rejectMessage")}
          onCancel={() => setShowRejectionConfirm(false)}
          onQuit={() => process.exit(0)}
          onReject={handleRejectSession}
        />
      </box>
    );
  }

  // Show review screen
  if (showReview) {
    return (
      <box style={{ flexDirection: "column", paddingLeft: 2, paddingRight: 2, paddingTop: 1, paddingBottom: 1 }}>
        <ReviewScreen
          isSubmitting={submitting}
          answers={answers}
          elapsedLabel={elapsedLabel}
          onConfirm={handleConfirm}
          onGoBack={handleGoBack}
          questions={sessionRequest.questions}
          sessionId={sessionId}
          elaborateMarks={elaborateMarks}
        />
      </box>
    );
  }

  // Show question display (default)
  return (
    <box style={{ flexDirection: "column", paddingLeft: 2, paddingRight: 2 }}>
      <QuestionDisplay
        currentQuestion={currentQuestion}
        currentQuestionIndex={currentQuestionIndex}
        customAnswer={currentAnswer?.customText}
        elapsedLabel={elapsedLabel}
        onAdvanceToNext={handleAdvanceToNext}
        onChangeCustomAnswer={handleChangeCustomAnswer}
        onSelectOption={handleSelectOption}
        questions={sessionRequest.questions}
        onToggleOption={handleToggleOption}
        multiSelect={currentQuestionMultiSelect}
        showMultiToggleHint={!currentQuestion.multiSelect}
        isForceMultiActive={forceMultiByQuestion.has(currentQuestionIndex)}
        selectedOption={currentAnswer?.selectedOption}
        answers={answers}
        focusContext={focusContext}
        onFocusContextChange={setFocusContext}
        focusedOptionIndex={focusedOptionIndex}
        onFocusedOptionIndexChange={setFocusedOptionIndex}
        workingDirectory={sessionRequest.workingDirectory}
        onRecommendedDetected={setHasRecommendedOptions}
        hasRecommendedOptions={hasRecommendedOptions}
        hasAnyRecommendedInSession={hasAnyRecommendedInSession}
        elaborateMarks={elaborateMarks}
        onElaborateSelect={handleElaborateSelect}
        elaborateText={elaborateMarks.get(currentQuestionIndex) || ""}
        onElaborateTextChange={handleElaborateTextChange}
        onSelectIndex={(idx) => setCurrentQuestionIndex(Math.max(0, Math.min(idx, sessionRequest.questions.length - 1)))}
        showSessionSwitching={!showReview && !showRejectionConfirm}
      />
    </box>
  );
};