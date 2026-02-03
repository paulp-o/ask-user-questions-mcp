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
    unansweredHighlight: "#f85149",

    text: "#c9d1d9",
    textDim: "#a0a8b4", // brightened
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
      queueEmpty: "#a0a8b4",
      queueFlash: "#79c0ff",
      pillBg: "#161b22",
    },
    directory: {
      label: "#a0a8b4",
      path: "#c9d1d9",
    },
    tabBar: {
      selected: "#c9d1d9",
      selectedBg: "#161b22",
      default: "#a0a8b4",
      answered: "#3fb950",
      unanswered: "#a0a8b4",
      divider: "#30363d",
    },
    options: {
      focused: "#3fb950",
      focusedBg: "#0d1117",
      selected: "#58a6ff",
      selectedBg: "#161b22",
      default: "#c9d1d9",
      description: "#b1bac4", // brighter for readability
      hint: "#b1bac4", // brighter for readability
    },
    input: {
      border: "#30363d",
      borderFocused: "#58a6ff",
      placeholder: "#a0a8b4",
      cursor: "#58a6ff",
      cursorDim: "#79c0ff",
    },
    review: {
      border: "#30363d",
      confirmBorder: "#58a6ff",
      selectedOption: "#3fb950",
      customAnswer: "#d29922",
      questionId: "#a0a8b4",
      divider: "#30363d",
    },
    questionDisplay: {
      questionId: "#58a6ff",
      typeIndicator: "#a0a8b4",
      elapsed: "#a0a8b4",
    },
    footer: {
      border: "#30363d",
      keyBg: "#161b22",
      keyFg: "#58a6ff",
      action: "#b1bac4", // brighter for visibility
      separator: "#30363d",
    },
    toast: {
      success: "#3fb950",
      successPillBg: "#161b22",
      error: "#f85149",
      info: "#58a6ff",
      border: "#30363d",
    },
  },
} as const;
