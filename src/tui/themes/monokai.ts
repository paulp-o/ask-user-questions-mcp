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

    text: "#F8F8F2",
    textDim: "#75715E",
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
      queueEmpty: "#75715E",
      queueFlash: "#F8F8F2",
      pillBg: "#3E3D32",
    },
    directory: {
      label: "#75715E",
      path: "#F8F8F2",
    },
    tabBar: {
      selected: "#F8F8F2",
      selectedBg: "#3E3D32",
      default: "#75715E",
      answered: "#A6E22E",
      unanswered: "#75715E",
      divider: "#49483E",
    },
    options: {
      focused: "#A6E22E",
      focusedBg: "#383830",
      selected: "#66D9EF",
      selectedBg: "#3E3D32",
      default: "#F8F8F2",
      description: "#F8F8F2",
      hint: "#F8F8F2",
    },
    input: {
      border: "#49483E",
      borderFocused: "#66D9EF",
      placeholder: "#75715E",
      cursor: "#66D9EF",
      cursorDim: "#F8F8F2",
    },
    review: {
      border: "#49483E",
      confirmBorder: "#66D9EF",
      selectedOption: "#A6E22E",
      customAnswer: "#E6DB74",
      questionId: "#75715E",
      divider: "#49483E",
    },
    questionDisplay: {
      questionId: "#66D9EF",
      typeIndicator: "#75715E",
      elapsed: "#75715E",
    },
    footer: {
      border: "#49483E",
      keyBg: "#3E3D32",
      keyFg: "#F8F8F2",
      action: "#75715E",
      separator: "#49483E",
    },
    toast: {
      success: "#A6E22E",
      error: "#F92672",
      info: "#66D9EF",
      border: "#49483E",
    },
  },
} as const;
