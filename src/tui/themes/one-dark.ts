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
    unansweredHighlight: "#e06c75",

    text: "#abb2bf", // foreground
    textDim: "#767D8A", // comment gray brightened
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
      queueEmpty: "#767D8A",
      queueFlash: "#56b6c2",
      pillBg: "#3e4451",
    },
    directory: {
      label: "#767D8A",
      path: "#abb2bf",
    },
    tabBar: {
      selected: "#abb2bf",
      selectedBg: "#3e4451",
      default: "#767D8A",
      answered: "#98c379",
      unanswered: "#767D8A",
      divider: "#3e4451",
    },
    options: {
      focused: "#98c379",
      focusedBg: "#3e4451",
      selected: "#61afef",
      selectedBg: "#3e4451",
      default: "#abb2bf",
      description: "#848b98", // lighter for readability
      hint: "#848b98", // lighter for readability
    },
    input: {
      border: "#3e4451",
      borderFocused: "#61afef",
      placeholder: "#767D8A",
      cursor: "#61afef",
      cursorDim: "#56b6c2",
    },
    review: {
      border: "#3e4451",
      confirmBorder: "#61afef",
      selectedOption: "#98c379",
      customAnswer: "#d19a66",
      questionId: "#767D8A",
      divider: "#3e4451",
    },
    questionDisplay: {
      questionId: "#61afef",
      typeIndicator: "#767D8A",
      elapsed: "#767D8A",
    },
    footer: {
      border: "#3e4451",
      keyBg: "#3e4451",
      keyFg: "#61afef",
      action: "#848b98",
      separator: "#3e4451",
    },
    toast: {
      success: "#98c379",
      successPillBg: "#282c34",
      error: "#e06c75",
      info: "#61afef",
      border: "#3e4451",
    },
  },
} as const;
