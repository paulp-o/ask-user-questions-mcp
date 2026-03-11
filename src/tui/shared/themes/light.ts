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
    bg: "#F8F9FA",
    surface: "#EEF1F5",
    surfaceAlt: "#E2E8F0",

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
    neutral: "#B0B8C1", // Darkened for visibility on light bg
  },

  components: {
    header: {
      border: "#A0A8B0", // slightly more visible
      queueActive: "#007EA7",
      queueEmpty: "#6E7781",
      queueFlash: "#B2EBF2", // Deeper cyan flash
      pillBg: "#B2EBF2", // Deeper cyan bg
    },
    directory: {
      label: "#6E7781",
      path: "#24292F",
    },
    tabBar: {
      selected: "#24292F",
      selectedBg: "#DDE3EA", // Visible gray
      default: "#6E7781",
      answered: "#2DA44E",
      unanswered: "#6E7781",
      divider: "#B0B8C1",
    },
    options: {
      focused: "#2DA44E", // Green cursor
      focusedBg: "#C8F0D4", // Deeper green bg
      selected: "#007EA7", // Cyan selected
      selectedBg: "#B2EBF2", // Deeper cyan bg
      default: "#24292F",
      description: "#57606A",
      hint: "#57606A",
    },
    input: {
      border: "#B0B8C1",
      borderFocused: "#007EA7",
      placeholder: "#6E7781",
      cursor: "#007EA7",
      cursorDim: "#7DD4E8", // Darker cyan for cursor dim
    },
    review: {
      border: "#B0B8C1",
      confirmBorder: "#007EA7",
      selectedOption: "#2DA44E",
      customAnswer: "#B07D00",
      questionId: "#6E7781",
      divider: "#B0B8C1",
    },
    questionDisplay: {
      questionId: "#007EA7",
      typeIndicator: "#6E7781",
      elapsed: "#6E7781",
    },
    footer: {
      border: "#B0B8C1",
      keyBg: "#E2E8F0", // Deeper key cap
      keyFg: "#007EA7",
      action: "#57606A",
      separator: "#B0B8C1",
    },
    toast: {
      success: "#2DA44E",
      successPillBg: "#C8F0D4",
      error: "#CF222E",
      info: "#007EA7",
      warning: "#B07D00",
      border: "#B0B8C1",
    },
    markdown: {
      codeBlockBg: "#EEF1F5",
      codeBlockText: "#24292F",
      codeBlockBorder: "#B0B8C1",
    },
    sessionDots: {
      active: "#007EA7",
      answered: "#2DA44E",
      inProgress: "#B07D00",
      untouched: "#6E7781",
      number: "#24292F",
      activeNumber: "#007EA7",
      stale: "#B07D00",
      abandoned: "#CF222E",
    },
    sessionPicker: {
      border: "#007EA7",
      title: "#007EA7",
      rowText: "#24292F",
      rowDim: "#6E7781",
      highlightBg: "#C8F0D4",
      highlightFg: "#2DA44E",
      activeMark: "#007EA7",
      progress: "#007EA7",
      staleIcon: "#B07D00",
      staleText: "#B07D00",
      staleAge: "#B07D00",
      staleSubtitle: "#6E7781",
    },
  },
} as const;