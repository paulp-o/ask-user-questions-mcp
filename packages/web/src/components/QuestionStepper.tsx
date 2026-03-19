"use client";

import React from "react";
import type { Question, UserAnswer } from "@auq/core";
import { useMemo, useState } from "react";

type QuestionStepperProps = {
  questions: Question[];
  sessionId: string;
  onComplete: () => void;
};

type AnswerDraft = {
  customText?: string;
  selectedOption?: string;
  selectedOptions?: string[];
};

function isOtherOption(label: string): boolean {
  return label.trim().toLowerCase() === "other";
}

function getAnswerPreview(answer: AnswerDraft, multiSelect: boolean): string {
  if (multiSelect) {
    if (!answer.selectedOptions || answer.selectedOptions.length === 0) {
      return "No selection";
    }

    const withCustom = answer.customText
      ? [...answer.selectedOptions, `Other: ${answer.customText}`]
      : answer.selectedOptions;

    return withCustom.join(", ");
  }

  if (!answer.selectedOption) {
    return "No selection";
  }

  if (answer.customText) {
    return `${answer.selectedOption} (${answer.customText})`;
  }

  return answer.selectedOption;
}

function toUserAnswers(answers: AnswerDraft[], questions: Question[]): UserAnswer[] {
  const timestamp = new Date().toISOString();

  return questions.map((question, questionIndex) => {
    const answer = answers[questionIndex] ?? {};

    if (question.multiSelect) {
      return {
        questionIndex,
        selectedOptions: answer.selectedOptions ?? [],
        customText: answer.customText,
        timestamp,
      };
    }

    return {
      questionIndex,
      selectedOption: answer.selectedOption,
      customText: answer.customText,
      timestamp,
    };
  });
}

export function QuestionStepper({
  questions,
  sessionId,
  onComplete,
}: QuestionStepperProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerDraft[]>([]);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const questionCount = questions.length;
  const progressPercent = useMemo(() => {
    if (questionCount === 0) {
      return 0;
    }

    if (isReviewing) {
      return 100;
    }

    return Math.round(((currentIndex + 1) / questionCount) * 100);
  }, [currentIndex, isReviewing, questionCount]);

  const currentQuestion = questions[currentIndex];
  const currentAnswer = answers[currentIndex] ?? {};
  const hasOther = currentQuestion?.options.some((option) => isOtherOption(option.label));

  const canProceed = useMemo(() => {
    if (!currentQuestion) {
      return false;
    }

    if (currentQuestion.multiSelect) {
      return Boolean(currentAnswer.selectedOptions && currentAnswer.selectedOptions.length > 0);
    }

    return Boolean(currentAnswer.selectedOption);
  }, [currentAnswer.selectedOption, currentAnswer.selectedOptions, currentQuestion]);

  const setCurrentAnswer = (next: AnswerDraft) => {
    setAnswers((prev) => {
      const cloned = [...prev];
      cloned[currentIndex] = next;
      return cloned;
    });
  };

  const handleSingleSelect = (label: string) => {
    const next: AnswerDraft = {
      selectedOption: label,
      customText: isOtherOption(label) ? currentAnswer.customText : undefined,
    };
    setCurrentAnswer(next);
  };

  const handleMultiToggle = (label: string) => {
    const selected = new Set(currentAnswer.selectedOptions ?? []);
    if (selected.has(label)) {
      selected.delete(label);
    } else {
      selected.add(label);
    }

    const selectedOptions = Array.from(selected);
    const includesOther = selectedOptions.some((item) => isOtherOption(item));
    setCurrentAnswer({
      selectedOptions,
      customText: includesOther ? currentAnswer.customText : undefined,
    });
  };

  const handleCustomTextChange = (value: string) => {
    if (currentQuestion.multiSelect) {
      setCurrentAnswer({
        selectedOptions: currentAnswer.selectedOptions ?? [],
        customText: value,
      });
      return;
    }

    setCurrentAnswer({
      selectedOption: currentAnswer.selectedOption,
      customText: value,
    });
  };

  const handleBack = () => {
    if (isReviewing) {
      setIsReviewing(false);
      setCurrentIndex(questionCount - 1);
      return;
    }

    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    if (currentIndex === questionCount - 1) {
      setIsReviewing(true);
      return;
    }

    setCurrentIndex((prev) => Math.min(questionCount - 1, prev + 1));
  };

  const handleEdit = (index: number) => {
    setCurrentIndex(index);
    setIsReviewing(false);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        answers: toUserAnswers(answers, questions),
      };

      const response = await fetch(`/api/sessions/${sessionId}/answer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to submit answers: ${response.status}`);
      }

      setSubmitted(true);
      onComplete();
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to submit answers.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (questionCount === 0) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
        <p className="text-sm text-slate-600">No questions were provided for this session.</p>
      </section>
    );
  }

  if (submitted) {
    return (
      <section className="space-y-4 rounded-xl border border-green-200 bg-green-50 p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-green-900">Answers submitted</h2>
        <p className="text-sm text-green-800">This session is now marked as completed.</p>
      </section>
    );
  }

  return (
    <section className="w-full space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
      <h2 className="sr-only">Question form</h2>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>{isReviewing ? "Review" : `Question ${currentIndex + 1} of ${questionCount}`}</span>
          <span>{progressPercent}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-100" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPercent} aria-label="Question progress">
          <div
            className="h-2 rounded-full bg-slate-900 transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {isReviewing ? (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900">Review your answers</h3>
          <div className="space-y-3">
            {questions.map((question, index) => (
              <div
                key={`${question.title}-${index}`}
                className="rounded-lg border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-900">
                      {index + 1}. {question.title}
                    </p>
                    <p className="text-sm text-slate-600">{question.prompt}</p>
                    <p className="text-sm text-slate-800">
                      {getAnswerPreview(answers[index] ?? {}, Boolean(question.multiSelect))}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleEdit(index)}
                    className="inline-flex items-center rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-slate-900">{currentQuestion.title}</h3>
            <p className="text-sm text-slate-600">{currentQuestion.prompt}</p>
          </div>

          <fieldset className="space-y-2">
            <legend className="sr-only">Select an answer option</legend>
            {currentQuestion.options.map((option) => {
              if (currentQuestion.multiSelect) {
                const selected = (currentAnswer.selectedOptions ?? []).includes(option.label);
                return (
                  <div key={option.label} className="rounded-lg border border-slate-200 p-3 text-sm transition-colors hover:border-slate-300">
                    <div className="flex items-start gap-3">
                      <input
                        id={`question-${currentIndex}-option-${option.label}`}
                        type="checkbox"
                        checked={selected}
                        onChange={() => handleMultiToggle(option.label)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                      />
                      <label
                        htmlFor={`question-${currentIndex}-option-${option.label}`}
                        className="cursor-pointer space-y-0.5"
                      >
                        <span className="block font-medium text-slate-900">{option.label}</span>
                        {option.description ? (
                          <span className="block text-slate-600">{option.description}</span>
                        ) : null}
                      </label>
                    </div>
                  </div>
                );
              }

              const selected = currentAnswer.selectedOption === option.label;
              return (
                <div key={option.label} className="rounded-lg border border-slate-200 p-3 text-sm transition-colors hover:border-slate-300">
                  <div className="flex items-start gap-3">
                    <input
                      id={`question-${currentIndex}-option-${option.label}`}
                      type="radio"
                      name={`question-${currentIndex}`}
                      checked={selected}
                      onChange={() => handleSingleSelect(option.label)}
                      className="mt-0.5 h-4 w-4 border-slate-300 text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                    />
                    <label
                      htmlFor={`question-${currentIndex}-option-${option.label}`}
                      className="cursor-pointer space-y-0.5"
                    >
                      <span className="block font-medium text-slate-900">{option.label}</span>
                      {option.description ? (
                        <span className="block text-slate-600">{option.description}</span>
                      ) : null}
                    </label>
                  </div>
                </div>
              );
            })}
          </fieldset>

          {hasOther
            && ((currentQuestion.multiSelect
              && (currentAnswer.selectedOptions ?? []).some((label) => isOtherOption(label)))
              || (!currentQuestion.multiSelect
                && currentAnswer.selectedOption
                && isOtherOption(currentAnswer.selectedOption))) ? (
              <div className="space-y-2">
                <label
                  htmlFor={`custom-text-${currentIndex}`}
                  className="block text-sm font-medium text-slate-700"
                >
                  Additional details
                </label>
                <input
                  id={`custom-text-${currentIndex}`}
                  type="text"
                  value={currentAnswer.customText ?? ""}
                  onChange={(event) => handleCustomTextChange(event.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 placeholder:text-slate-400 focus-visible:border-slate-400 focus-visible:ring-2"
                  placeholder="Enter your response"
                />
              </div>
            ) : null}
        </div>
      )}

      {submitError ? (
        <div className="space-y-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert" aria-live="polite">
          <p>{submitError}</p>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isSubmitting}
            className="inline-flex items-center rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Retry submit
          </button>
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={handleBack}
          disabled={!isReviewing && currentIndex === 0}
          className="inline-flex items-center justify-center rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Back
        </button>

        {isReviewing ? (
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-white" aria-hidden="true" />
                Submitting...
              </>
            ) : (
              "Submit"
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleNext}
            disabled={!canProceed}
            className="inline-flex items-center justify-center rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {currentIndex === questionCount - 1 ? "Review" : "Next"}
          </button>
        )}
      </div>
    </section>
  );
}