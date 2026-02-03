import type { Theme } from "./types.js";

/**
 * One Dark Theme
 * The iconic default theme from the Atom editor.
 * https://github.com/atom/atom/tree/master/packages/one-dark-syntax
 */
export const oneDarkTheme: Theme = {
  name: "one-dark",

  gradient: {
    start: "#61afef", // blue
    middle: "#56b6c2", // cyan
    end: "#61afef",
  },

  colors: {
    primary: "#61afef", // blue
    success: "#98c379", // green
    warning: "#d19a66", // yellow/orange
    error: "#e06c75", // red
    info: "#56b6c2", // cyan

    focused: "#61afef",
    selected: "#98c379",
    pending: "#d19a66",

    text: "#abb2bf", // foreground
    textDim: "#5c6370", // comment gray
    textBold: "#d7dae0", // lighter
  },

  borders: {
    primary: "#61afef",
    warning: "#d19a66",
    error: "#e06c75",
    neutral: "#3e4451", // gutter
  },

  components: {
    header: {
      border: "#4b5263", // slightly more visible
      queueActive: "#61afef",
      queueEmpty: "#5c6370",
      queueFlash: "#56b6c2",
      pillBg: "#3e4451",
    },
    directory: {
      label: "#5c6370",
      path: "#abb2bf",
    },
    tabBar: {
      selected: "#abb2bf",
      selectedBg: "#3e4451",
      default: "#5c6370",
      answered: "#98c379",
      unanswered: "#5c6370",
      divider: "#3e4451",
    },
    options: {
      focused: "#98c379",
      focusedBg: "#3e4451",
      selected: "#61afef",
      selectedBg: "#3e4451",
      default: "#abb2bf",
      description: "#abb2bf", // foreground
      hint: "#abb2bf", // foreground
    },
    input: {
      border: "#3e4451",
      borderFocused: "#61afef",
      placeholder: "#5c6370",
      cursor: "#61afef",
      cursorDim: "#56b6c2",
    },
    review: {
      border: "#3e4451",
      confirmBorder: "#61afef",
      selectedOption: "#98c379",
      customAnswer: "#d19a66",
      questionId: "#5c6370",
      divider: "#3e4451",
    },
    questionDisplay: {
      questionId: "#61afef",
      typeIndicator: "#5c6370",
      elapsed: "#5c6370",
    },
    footer: {
      border: "#3e4451",
      keyBg: "#3e4451",
      keyFg: "#d7dae0",
      action: "#5c6370",
      separator: "#3e4451",
    },
    toast: {
      success: "#98c379",
      error: "#e06c75",
      info: "#61afef",
      border: "#3e4451",
    },
  },
} as const;
