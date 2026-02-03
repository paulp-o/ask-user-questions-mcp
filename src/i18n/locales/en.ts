export const en = {
  footer: {
    options: "Options",
    questions: "Questions",
    select: "Select",
    toggle: "Toggle",
    elaborate: "Elaborate",
    rephrase: "Rephrase",
    reject: "Reject",
    quickSubmit: "Quick Submit",
    theme: "Theme",
    next: "Next",
    newline: "Newline",
    back: "Back",
    submit: "Submit",
    confirm: "Confirm",
    cancel: "Cancel",
  },
  header: {
    title: "Ask User Questions",
    questionCount: "Question {current} of {total}",
  },
  waiting: {
    title: "Waiting for questions...",
    description:
      "The AI assistant will send questions here when it needs your input.",
    hint: "Press Ctrl+C to exit",
  },
  review: {
    title: "Review Your Answers",
    unanswered: "Unanswered",
    customAnswer: "Custom",
  },
  confirmation: {
    rejectTitle: "Reject Questions?",
    rejectMessage: "Are you sure you want to reject these questions?",
    submitTitle: "Submit Answers?",
    submitMessage: "Are you sure you want to submit your answers?",
  },
  toast: {
    copied: "Copied to clipboard",
    saved: "Saved",
    error: "Error",
  },
} as const;

export type TranslationKeys = typeof en;
