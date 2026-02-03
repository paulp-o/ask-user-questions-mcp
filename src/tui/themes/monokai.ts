import { Theme } from "./types.js";

/**
 * Visual direction: classic Monokai dark theme.
 * Vibrant syntax highlighting colors on a dark background.
 *
 * Based on the popular Monokai color scheme.
 */
export const monokaiTheme: Theme = {
  name: "monokai",

  gradient: {
    start: "#66D9EF",
    middle: "#F8F8F2",
    end: "#66D9EF",
  },

  colors: {
    primary: "#66D9EF",
    success: "#A6E22E",
    warning: "#E6DB74",
    error: "#F92672",
    info: "#66D9EF",

    focused: "#66D9EF",
    selected: "#A6E22E",
    pending: "#E6DB74",
    unansweredHighlight: "#f92672",

    text: "#F8F8F2",
    textDim: "#908B78", // brightened
    textBold: "#F8F8F2",
  },

  borders: {
    primary: "#66D9EF",
    warning: "#E6DB74",
    error: "#F92672",
    neutral: "#49483E",
  },

  components: {
    header: {
      border: "#49483E",
      queueActive: "#66D9EF",
      queueEmpty: "#908B78",
      queueFlash: "#F8F8F2",
      pillBg: "#3E3D32",
    },
    directory: {
      label: "#908B78",
      path: "#F8F8F2",
    },
    tabBar: {
      selected: "#F8F8F2",
      selectedBg: "#3E3D32",
      default: "#908B78",
      answered: "#A6E22E",
      unanswered: "#908B78",
      divider: "#49483E",
    },
    options: {
      focused: "#A6E22E",
      focusedBg: "#383830",
      selected: "#66D9EF",
      selectedBg: "#3E3D32",
      default: "#F8F8F2",
      description: "#A0998A",
      hint: "#A0998A",
    },
    input: {
      border: "#49483E",
      borderFocused: "#66D9EF",
      placeholder: "#908B78",
      cursor: "#66D9EF",
      cursorDim: "#F8F8F2",
    },
    review: {
      border: "#49483E",
      confirmBorder: "#66D9EF",
      selectedOption: "#A6E22E",
      customAnswer: "#E6DB74",
      questionId: "#908B78",
      divider: "#49483E",
    },
    questionDisplay: {
      questionId: "#66D9EF",
      typeIndicator: "#908B78",
      elapsed: "#908B78",
    },
    footer: {
      border: "#49483E",
      keyBg: "#3E3D32",
      keyFg: "#66D9EF",
      action: "#A0998A",
      separator: "#49483E",
    },
    toast: {
      success: "#A6E22E",
      successPillBg: "#272822",
      error: "#F92672",
      info: "#66D9EF",
      border: "#49483E",
    },
  },
} as const;
