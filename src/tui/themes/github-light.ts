import { Theme } from "./types.js";

/**
 * GitHub Light theme.
 * Authentic GitHub Light color palette optimized for readability.
 */
export const githubLightTheme: Theme = {
  name: "github-light",

  gradient: {
    start: "#0969DA", // GitHub blue
    middle: "#8250DF", // GitHub purple
    end: "#0969DA",
  },

  colors: {
    primary: "#0969DA", // GitHub blue
    success: "#1A7F37", // GitHub green
    warning: "#9A6700", // GitHub orange/brown
    error: "#CF222E", // GitHub red
    info: "#0969DA",

    focused: "#0969DA",
    selected: "#1A7F37",
    pending: "#9A6700",

    text: "#24292F", // GitHub foreground
    textDim: "#57606A", // Muted text
    textBold: "#1F2328",
  },

  borders: {
    primary: "#0969DA",
    warning: "#9A6700",
    error: "#CF222E",
    neutral: "#D0D7DE", // Light gray border
  },

  components: {
    header: {
      border: "#A0A8B0",
      queueActive: "#0969DA",
      queueEmpty: "#57606A",
      queueFlash: "#DDF4FF", // Light blue flash
      pillBg: "#DDF4FF", // Light blue bg
    },
    directory: {
      label: "#57606A",
      path: "#24292F",
    },
    tabBar: {
      selected: "#24292F",
      selectedBg: "#F6F8FA", // Very light gray
      default: "#57606A",
      answered: "#1A7F37",
      unanswered: "#57606A",
      divider: "#D0D7DE",
    },
    options: {
      focused: "#1A7F37", // Green cursor
      focusedBg: "#DAFBE1", // Light green bg
      selected: "#0969DA", // Blue selected
      selectedBg: "#DDF4FF", // Light blue bg
      default: "#24292F",
      description: "#57606A",
      hint: "#57606A",
    },
    input: {
      border: "#D0D7DE",
      borderFocused: "#0969DA",
      placeholder: "#6E7781",
      cursor: "#0969DA",
      cursorDim: "#B8E0FF", // Lighter blue for cursor dim
    },
    review: {
      border: "#D0D7DE",
      confirmBorder: "#0969DA",
      selectedOption: "#1A7F37",
      customAnswer: "#9A6700",
      questionId: "#57606A",
      divider: "#D0D7DE",
    },
    questionDisplay: {
      questionId: "#0969DA",
      typeIndicator: "#57606A",
      elapsed: "#57606A",
    },
    footer: {
      border: "#D0D7DE",
      keyBg: "#F6F8FA", // Light key cap
      keyFg: "#0969DA",
      action: "#57606A",
      separator: "#D0D7DE",
    },
    toast: {
      success: "#1A7F37",
      error: "#CF222E",
      info: "#0969DA",
      border: "#D0D7DE",
    },
  },
} as const;
