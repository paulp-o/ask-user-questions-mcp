import { Theme } from "./types.js";

/**
 * Light theme variant.
 * Maintains the "electric-cyan" identity but optimized for light backgrounds.
 * Uses darker grays for text and deeper saturations for accents to ensure readability.
 */
export const lightTheme: Theme = {
  name: "AUQ light",

  gradient: {
    start: "#007EA7", // Darker cyan
    middle: "#46D9FF", // Electric cyan (original)
    end: "#007EA7",
  },

  colors: {
    primary: "#007EA7", // Deep cyan
    success: "#2DA44E", // GitHub green - readable on white
    warning: "#B07D00", // Dark amber
    error: "#CF222E", // Red
    info: "#007EA7",

    focused: "#007EA7",
    selected: "#2DA44E",
    pending: "#B07D00",
    unansweredHighlight: "#CF222E",

    text: "#24292F", // Graphite
    textDim: "#6E7781", // Slate gray - softened
    textBold: "#050505",
  },

  borders: {
    primary: "#007EA7",
    warning: "#B07D00",
    error: "#CF222E",
    neutral: "#D0D7DE", // Light gray border
  },

  components: {
    header: {
      border: "#A0A8B0", // slightly more visible
      queueActive: "#007EA7",
      queueEmpty: "#6E7781",
      queueFlash: "#E0F7FA", // Light cyan flash
      pillBg: "#E0F7FA", // Light cyan bg
    },
    directory: {
      label: "#6E7781",
      path: "#24292F",
    },
    tabBar: {
      selected: "#24292F",
      selectedBg: "#F0F0F0", // Very light gray
      default: "#6E7781",
      answered: "#2DA44E",
      unanswered: "#6E7781",
      divider: "#D0D7DE",
    },
    options: {
      focused: "#2DA44E", // Green cursor
      focusedBg: "#E6F9EE", // Light green bg
      selected: "#007EA7", // Cyan selected
      selectedBg: "#E0F7FA", // Light cyan bg
      default: "#24292F",
      description: "#57606A",
      hint: "#57606A",
    },
    input: {
      border: "#D0D7DE",
      borderFocused: "#007EA7",
      placeholder: "#6E7781",
      cursor: "#007EA7",
      cursorDim: "#B8F2FF", // Lighter cyan for cursor dim
    },
    review: {
      border: "#D0D7DE",
      confirmBorder: "#007EA7",
      selectedOption: "#2DA44E",
      customAnswer: "#B07D00",
      questionId: "#6E7781",
      divider: "#D0D7DE",
    },
    questionDisplay: {
      questionId: "#007EA7",
      typeIndicator: "#6E7781",
      elapsed: "#6E7781",
    },
    footer: {
      border: "#D0D7DE",
      keyBg: "#F6F8FA", // Light key cap
      keyFg: "#007EA7",
      action: "#57606A",
      separator: "#D0D7DE",
    },
    toast: {
      success: "#2DA44E",
      successPillBg: "#E6F9EE",
      error: "#CF222E",
      info: "#007EA7",
      border: "#D0D7DE",
    },
  },
} as const;
