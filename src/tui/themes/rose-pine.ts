import { Theme } from "./types.js";

/**
 * Visual direction: Rosé Pine - All natural pine, faux fur and a bit of soho vibes.
 * A warm, cozy theme with soft pinks and purples.
 *
 * Based on the Rosé Pine color palette: https://rosepinetheme.com/
 */
export const rosePineTheme: Theme = {
  name: "rose-pine",

  gradient: {
    start: "#ebbcba",
    middle: "#f6c177",
    end: "#ebbcba",
  },

  colors: {
    primary: "#ebbcba",
    success: "#31748f",
    warning: "#f6c177",
    error: "#eb6f92",
    info: "#9ccfd8",

    focused: "#ebbcba",
    selected: "#31748f",
    pending: "#f6c177",

    text: "#e0def4",
    textDim: "#6e6a86",
    textBold: "#e0def4",
  },

  borders: {
    primary: "#ebbcba",
    warning: "#f6c177",
    error: "#eb6f92",
    neutral: "#26233a",
  },

  components: {
    header: {
      border: "#403d52",
      queueActive: "#ebbcba",
      queueEmpty: "#6e6a86",
      queueFlash: "#f6c177",
      pillBg: "#1f1d2e",
    },
    directory: {
      label: "#6e6a86",
      path: "#e0def4",
    },
    tabBar: {
      selected: "#e0def4",
      selectedBg: "#1f1d2e",
      default: "#6e6a86",
      answered: "#31748f",
      unanswered: "#6e6a86",
      divider: "#26233a",
    },
    options: {
      focused: "#31748f",
      focusedBg: "#191724",
      selected: "#ebbcba",
      selectedBg: "#1f1d2e",
      default: "#e0def4",
      description: "#6e6a86",
      hint: "#6e6a86",
    },
    input: {
      border: "#26233a",
      borderFocused: "#ebbcba",
      placeholder: "#6e6a86",
      cursor: "#ebbcba",
      cursorDim: "#f6c177",
    },
    review: {
      border: "#26233a",
      confirmBorder: "#ebbcba",
      selectedOption: "#31748f",
      customAnswer: "#f6c177",
      questionId: "#6e6a86",
      divider: "#26233a",
    },
    questionDisplay: {
      questionId: "#ebbcba",
      typeIndicator: "#6e6a86",
      elapsed: "#6e6a86",
    },
    footer: {
      border: "#26233a",
      keyBg: "#1f1d2e",
      keyFg: "#ebbcba",
      action: "#6e6a86",
      separator: "#26233a",
    },
    toast: {
      success: "#31748f",
      error: "#eb6f92",
      info: "#9ccfd8",
      border: "#26233a",
    },
  },
} as const;
