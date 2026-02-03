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
    unansweredHighlight: "#ff5555", // dracula red

    text: "#f8f8f2", // foreground
    textDim: "#7C8BBE", // comment brightened
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
      queueEmpty: "#7C8BBE",
      queueFlash: "#ff79c6",
      pillBg: "#44475a",
    },
    directory: {
      label: "#7C8BBE",
      path: "#f8f8f2",
    },
    tabBar: {
      selected: "#f8f8f2",
      selectedBg: "#44475a",
      default: "#7C8BBE",
      answered: "#50fa7b",
      unanswered: "#7C8BBE",
      divider: "#44475a",
    },
    options: {
      focused: "#50fa7b",
      focusedBg: "#44475a",
      selected: "#bd93f9",
      selectedBg: "#44475a",
      default: "#f8f8f2",
      description: "#bd93f9", // lighter purple for readability
      hint: "#f8f8f2", // foreground for readability
    },
    input: {
      border: "#44475a",
      borderFocused: "#bd93f9",
      placeholder: "#7C8BBE",
      cursor: "#bd93f9",
      cursorDim: "#ff79c6",
    },
    review: {
      border: "#44475a",
      confirmBorder: "#bd93f9",
      selectedOption: "#50fa7b",
      customAnswer: "#f1fa8c",
      questionId: "#7C8BBE",
      divider: "#44475a",
    },
    questionDisplay: {
      questionId: "#bd93f9",
      typeIndicator: "#7C8BBE",
      elapsed: "#7C8BBE",
    },
    footer: {
      border: "#44475a",
      keyBg: "#44475a",
      keyFg: "#bd93f9",
      action: "#8294C4",
      separator: "#44475a",
    },
    toast: {
      success: "#50fa7b",
      successPillBg: "#44475a", // current line
      error: "#ff5555",
      info: "#bd93f9",
      border: "#44475a",
    },
  },
} as const;
