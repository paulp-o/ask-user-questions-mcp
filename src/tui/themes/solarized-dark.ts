import type { Theme } from "./types.js";

/**
 * Solarized Dark Theme
 * Precision colors for machines and people.
 * https://ethanschoonover.com/solarized/
 */
export const solarizedDarkTheme: Theme = {
  name: "solarized-dark",

  gradient: {
    start: "#268bd2", // blue
    middle: "#2aa198", // cyan
    end: "#268bd2",
  },

  colors: {
    primary: "#268bd2", // blue
    success: "#859900", // green
    warning: "#b58900", // yellow
    error: "#dc322f", // red
    info: "#2aa198", // cyan

    focused: "#268bd2",
    selected: "#859900",
    pending: "#b58900",

    text: "#839496", // base0
    textDim: "#586e75", // base01
    textBold: "#93a1a1", // base1
  },

  borders: {
    primary: "#268bd2",
    warning: "#b58900",
    error: "#dc322f",
    neutral: "#073642", // base02
  },

  components: {
    header: {
      border: "#586e75", // base01 - slightly more visible
      queueActive: "#268bd2",
      queueEmpty: "#586e75",
      queueFlash: "#2aa198",
      pillBg: "#073642",
    },
    directory: {
      label: "#586e75",
      path: "#839496",
    },
    tabBar: {
      selected: "#93a1a1",
      selectedBg: "#073642",
      default: "#586e75",
      answered: "#859900",
      unanswered: "#586e75",
      divider: "#073642",
    },
    options: {
      focused: "#859900",
      focusedBg: "#073642",
      selected: "#268bd2",
      selectedBg: "#073642",
      default: "#839496",
      description: "#839496", // base0
      hint: "#839496", // base0
    },
    input: {
      border: "#073642",
      borderFocused: "#268bd2",
      placeholder: "#586e75",
      cursor: "#268bd2",
      cursorDim: "#2aa198",
    },
    review: {
      border: "#073642",
      confirmBorder: "#268bd2",
      selectedOption: "#859900",
      customAnswer: "#b58900",
      questionId: "#586e75",
      divider: "#073642",
    },
    questionDisplay: {
      questionId: "#268bd2",
      typeIndicator: "#586e75",
      elapsed: "#586e75",
    },
    footer: {
      border: "#073642",
      keyBg: "#073642",
      keyFg: "#93a1a1",
      action: "#586e75",
      separator: "#073642",
    },
    toast: {
      success: "#859900",
      error: "#dc322f",
      info: "#268bd2",
      border: "#073642",
    },
  },
} as const;
