import { Theme } from "./types.js";

/**
 * GitHub Dark theme - Authentic GitHub color palette.
 * Based on GitHub's official dark mode colors.
 */
export const githubDarkTheme: Theme = {
  name: "github-dark",

  gradient: {
    start: "#58a6ff",
    middle: "#79c0ff",
    end: "#58a6ff",
  },

  colors: {
    primary: "#58a6ff",
    success: "#3fb950",
    warning: "#d29922",
    error: "#f85149",
    info: "#58a6ff",

    focused: "#58a6ff",
    selected: "#3fb950",
    pending: "#d29922",

    text: "#c9d1d9",
    textDim: "#8b949e",
    textBold: "#f0f6fc",
  },

  borders: {
    primary: "#58a6ff",
    warning: "#d29922",
    error: "#f85149",
    neutral: "#30363d",
  },

  components: {
    header: {
      border: "#30363d",
      queueActive: "#58a6ff",
      queueEmpty: "#8b949e",
      queueFlash: "#79c0ff",
      pillBg: "#161b22",
    },
    directory: {
      label: "#8b949e",
      path: "#c9d1d9",
    },
    tabBar: {
      selected: "#c9d1d9",
      selectedBg: "#161b22",
      default: "#8b949e",
      answered: "#3fb950",
      unanswered: "#8b949e",
      divider: "#30363d",
    },
    options: {
      focused: "#3fb950",
      focusedBg: "#0d1117",
      selected: "#58a6ff",
      selectedBg: "#161b22",
      default: "#c9d1d9",
      description: "#8b949e",
      hint: "#8b949e",
    },
    input: {
      border: "#30363d",
      borderFocused: "#58a6ff",
      placeholder: "#8b949e",
      cursor: "#58a6ff",
      cursorDim: "#79c0ff",
    },
    review: {
      border: "#30363d",
      confirmBorder: "#58a6ff",
      selectedOption: "#3fb950",
      customAnswer: "#d29922",
      questionId: "#8b949e",
      divider: "#30363d",
    },
    questionDisplay: {
      questionId: "#58a6ff",
      typeIndicator: "#8b949e",
      elapsed: "#8b949e",
    },
    footer: {
      border: "#30363d",
      keyBg: "#161b22",
      keyFg: "#58a6ff",
      action: "#8b949e",
      separator: "#30363d",
    },
    toast: {
      success: "#3fb950",
      error: "#f85149",
      info: "#58a6ff",
      border: "#30363d",
    },
  },
} as const;
