import type { Theme } from "./types.js";

/**
 * Tokyo Night Theme
 * A clean, dark theme celebrating the lights of downtown Tokyo.
 * https://github.com/enkia/tokyo-night-vscode-theme
 */
export const tokyoNightTheme: Theme = {
  name: "tokyo-night",

  gradient: {
    start: "#7aa2f7", // blue
    middle: "#7dcfff", // cyan
    end: "#7aa2f7",
  },

  colors: {
    primary: "#7aa2f7", // blue
    success: "#9ece6a", // green
    warning: "#e0af68", // yellow
    error: "#f7768e", // red
    info: "#7dcfff", // cyan

    focused: "#7aa2f7",
    selected: "#9ece6a",
    pending: "#e0af68",

    text: "#c0caf5", // foreground
    textDim: "#565f89", // comment
    textBold: "#c0caf5",
  },

  borders: {
    primary: "#7aa2f7",
    warning: "#e0af68",
    error: "#f7768e",
    neutral: "#24283b", // storm bg
  },

  components: {
    header: {
      border: "#3b4261", // slightly more visible
      queueActive: "#7aa2f7",
      queueEmpty: "#565f89",
      queueFlash: "#7dcfff",
      pillBg: "#24283b",
    },
    directory: {
      label: "#565f89",
      path: "#c0caf5",
    },
    tabBar: {
      selected: "#c0caf5",
      selectedBg: "#24283b",
      default: "#565f89",
      answered: "#9ece6a",
      unanswered: "#565f89",
      divider: "#24283b",
    },
    options: {
      focused: "#9ece6a",
      focusedBg: "#24283b",
      selected: "#7aa2f7",
      selectedBg: "#24283b",
      default: "#c0caf5",
      description: "#c0caf5", // foreground
      hint: "#c0caf5", // foreground
    },
    input: {
      border: "#24283b",
      borderFocused: "#7aa2f7",
      placeholder: "#565f89",
      cursor: "#7aa2f7",
      cursorDim: "#7dcfff",
    },
    review: {
      border: "#24283b",
      confirmBorder: "#7aa2f7",
      selectedOption: "#9ece6a",
      customAnswer: "#e0af68",
      questionId: "#565f89",
      divider: "#24283b",
    },
    questionDisplay: {
      questionId: "#7aa2f7",
      typeIndicator: "#565f89",
      elapsed: "#565f89",
    },
    footer: {
      border: "#24283b",
      keyBg: "#24283b",
      keyFg: "#c0caf5",
      action: "#565f89",
      separator: "#24283b",
    },
    toast: {
      success: "#9ece6a",
      error: "#f7768e",
      info: "#7aa2f7",
      border: "#24283b",
    },
  },
} as const;
