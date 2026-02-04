export const en = {
  footer: {
    options: "Options",
    questions: "Questions",
    select: "Select",
    toggle: "Toggle",
    elaborate: "Request Elaboration",
    recommended: "Recommended",
    reject: "Reject",
    quickSubmit: "Quick Submit",
    theme: "Theme",
    next: "Next",
    newline: "Newline",
    back: "Back",
    submit: "Submit",
    submitting: "Submitting...",
    confirm: "Confirm",
    cancel: "Cancel",
    cursor: "Cursor",
  },
  header: {
    title: "Ask User Questions",
    questionCount: "Question {current} of {total}",
  },
  confirmation: {
    rejectTitle: "Reject Questions?",
    rejectMessage: "Are you sure you want to reject this question set?",
    submitTitle: "Submit Answers?",
    submitMessage: "Are you sure you want to submit your answers?",
    rejectYes: "Yes, inform the AI that I rejected this question set",
    rejectNo: "No, go back to answering questions",
    keybindings: "Navigate | Enter Select | y/n Shortcuts | Esc Quit",
  },
  toast: {
    copied: "Copied to clipboard",
    saved: "Saved",
    error: "Error",
  },
  stepper: {
    submitting: "Submitting answers...",
  },
  input: {
    customAnswerLabel: "Custom answer",
    customAnswerHint: "(Press Tab to enter custom answer)",
    otherCustom: "Other (custom)",
    placeholder: "Type your answer (Enter = newline, Tab = done)",
    singleLinePlaceholder: "Type here...",
    multiLinePlaceholder: "Type your answer...",
    elaboratePlaceholder: "Tell the AI what you need (Enter/Tab = Skip)",
  },
  question: {
    multipleChoice: "Multiple Choice",
    singleChoice: "Single Choice",
  },
  review: {
    title: "Review Your Answers",
    unanswered: "Unanswered",
    customAnswer: "Custom",
    markedForElaboration: "Marked for elaboration",
  },
  waiting: {
    title: "Waiting for questions...",
    description:
      "The AI assistant will send questions here when it needs your input.",
    hint: "Press Ctrl+C to exit",
    processing: "Processing...",
    queueCount: "({count} waiting in queue)",
  },
  ui: {
    themeLabel: "theme:",
  },
} as const;

export type TranslationKeys = typeof en;
