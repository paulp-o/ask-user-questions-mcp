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
    unansweredHighlight: "#dc322f",

    text: "#657b83", // base00
    textDim: "#a3b1b1", // base1 lightened
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
      queueEmpty: "#a3b1b1",
      queueFlash: "#2aa198",
      pillBg: "#eee8d5",
    },
    directory: {
      label: "#a3b1b1",
      path: "#657b83",
    },
    tabBar: {
      selected: "#586e75",
      selectedBg: "#eee8d5",
      default: "#a3b1b1",
      answered: "#859900",
      unanswered: "#a3b1b1",
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
      placeholder: "#a3b1b1",
      cursor: "#268bd2",
      cursorDim: "#2aa198",
    },
    review: {
      border: "#eee8d5",
      confirmBorder: "#268bd2",
      selectedOption: "#859900",
      customAnswer: "#b58900",
      questionId: "#a3b1b1",
      divider: "#eee8d5",
    },
    questionDisplay: {
      questionId: "#268bd2",
      typeIndicator: "#a3b1b1",
      elapsed: "#a3b1b1",
    },
    footer: {
      border: "#eee8d5",
      keyBg: "#eee8d5",
      keyFg: "#268bd2",
      action: "#657b83", // base00 - darker for visibility
      separator: "#eee8d5",
    },
    toast: {
      success: "#859900",
      successPillBg: "#eee8d5",
      error: "#dc322f",
      info: "#268bd2",
      border: "#eee8d5",
    },
    markdown: {
      codeBlockBg: "#fdf6e3",
      codeBlockText: "#657b83",
      codeBlockBorder: "#eee8d5",
    },
    sessionDots: {
      active: "#268bd2",
      answered: "#859900",
      inProgress: "#b58900",
      untouched: "#a3b1b1",
      number: "#657b83",
      activeNumber: "#268bd2",
    },
    sessionPicker: {
      border: "#268bd2",
      title: "#268bd2",
      rowText: "#657b83",
      rowDim: "#a3b1b1",
      highlightBg: "#eee8d5",
      highlightFg: "#859900",
      activeMark: "#268bd2",
      progress: "#2aa198",
    },
  },
} as const;
