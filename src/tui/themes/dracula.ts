import type { Theme } from "./types.js";

/**
 * Dracula Theme
 * A dark theme for code editors and terminal applications.
 * https://draculatheme.com/
 */
export const draculaTheme: Theme = {
  name: "dracula",

  gradient: {
    start: "#bd93f9", // purple
    middle: "#ff79c6", // pink
    end: "#bd93f9",
  },

  colors: {
    primary: "#bd93f9", // purple
    success: "#50fa7b", // green
    warning: "#f1fa8c", // yellow
    error: "#ff5555", // red
    info: "#8be9fd", // cyan

    focused: "#bd93f9",
    selected: "#50fa7b",
    pending: "#ffb86c", // orange

    text: "#f8f8f2", // foreground
    textDim: "#6272a4", // comment
    textBold: "#f8f8f2",
  },

  borders: {
    primary: "#bd93f9",
    warning: "#f1fa8c",
    error: "#ff5555",
    neutral: "#44475a", // current line
  },

  components: {
    header: {
      border: "#6272a4", // comment - slightly more visible
      queueActive: "#bd93f9",
      queueEmpty: "#6272a4",
      queueFlash: "#ff79c6",
      pillBg: "#44475a",
    },
    directory: {
      label: "#6272a4",
      path: "#f8f8f2",
    },
    tabBar: {
      selected: "#f8f8f2",
      selectedBg: "#44475a",
      default: "#6272a4",
      answered: "#50fa7b",
      unanswered: "#6272a4",
      divider: "#44475a",
    },
    options: {
      focused: "#50fa7b",
      focusedBg: "#44475a",
      selected: "#bd93f9",
      selectedBg: "#44475a",
      default: "#f8f8f2",
      description: "#f8f8f2", // foreground
      hint: "#f8f8f2", // foreground
    },
    input: {
      border: "#44475a",
      borderFocused: "#bd93f9",
      placeholder: "#6272a4",
      cursor: "#bd93f9",
      cursorDim: "#ff79c6",
    },
    review: {
      border: "#44475a",
      confirmBorder: "#bd93f9",
      selectedOption: "#50fa7b",
      customAnswer: "#f1fa8c",
      questionId: "#6272a4",
      divider: "#44475a",
    },
    questionDisplay: {
      questionId: "#bd93f9",
      typeIndicator: "#6272a4",
      elapsed: "#6272a4",
    },
    footer: {
      border: "#44475a",
      keyBg: "#44475a",
      keyFg: "#f8f8f2",
      action: "#6272a4",
      separator: "#44475a",
    },
    toast: {
      success: "#50fa7b",
      error: "#ff5555",
      info: "#bd93f9",
      border: "#44475a",
    },
  },
} as const;
