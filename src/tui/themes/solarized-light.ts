import type { Theme } from "./types.js";

/**
 * Solarized Light Theme
 * Precision colors for machines and people - light variant.
 * https://ethanschoonover.com/solarized/
 */
export const solarizedLightTheme: Theme = {
  name: "solarized-light",

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

    text: "#657b83", // base00
    textDim: "#93a1a1", // base1
    textBold: "#586e75", // base01
  },

  borders: {
    primary: "#268bd2",
    warning: "#b58900",
    error: "#dc322f",
    neutral: "#eee8d5", // base2
  },

  components: {
    header: {
      border: "#93a1a1", // base1 - slightly more visible
      queueActive: "#268bd2",
      queueEmpty: "#93a1a1",
      queueFlash: "#2aa198",
      pillBg: "#eee8d5",
    },
    directory: {
      label: "#93a1a1",
      path: "#657b83",
    },
    tabBar: {
      selected: "#586e75",
      selectedBg: "#eee8d5",
      default: "#93a1a1",
      answered: "#859900",
      unanswered: "#93a1a1",
      divider: "#eee8d5",
    },
    options: {
      focused: "#859900",
      focusedBg: "#eee8d5",
      selected: "#268bd2",
      selectedBg: "#eee8d5",
      default: "#657b83",
      description: "#586e75", // base01 - darker for readability
      hint: "#586e75", // base01 - darker for readability
    },
    input: {
      border: "#eee8d5",
      borderFocused: "#268bd2",
      placeholder: "#93a1a1",
      cursor: "#268bd2",
      cursorDim: "#2aa198",
    },
    review: {
      border: "#eee8d5",
      confirmBorder: "#268bd2",
      selectedOption: "#859900",
      customAnswer: "#b58900",
      questionId: "#93a1a1",
      divider: "#eee8d5",
    },
    questionDisplay: {
      questionId: "#268bd2",
      typeIndicator: "#93a1a1",
      elapsed: "#93a1a1",
    },
    footer: {
      border: "#eee8d5",
      keyBg: "#eee8d5",
      keyFg: "#268bd2",
      action: "#93a1a1",
      separator: "#eee8d5",
    },
    toast: {
      success: "#859900",
      error: "#dc322f",
      info: "#268bd2",
      border: "#eee8d5",
    },
  },
} as const;
