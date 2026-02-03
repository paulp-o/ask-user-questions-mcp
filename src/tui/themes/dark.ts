import { Theme } from "./types.js";

/**
 * Visual direction: graphite + electric-cyan accent.
 * Keep the palette tight; lean on neutrals for structure.
 *
 * This is the original AUQ theme, optimized for dark terminals.
 */
export const darkTheme: Theme = {
  name: "AUQ dark",

  gradient: {
    start: "#46D9FF",
    middle: "#B8F2FF",
    end: "#46D9FF",
  },

  colors: {
    primary: "#46D9FF",
    success: "#5AF78E",
    warning: "#FFD36A",
    error: "#FF5C57",
    info: "#46D9FF",

    focused: "#46D9FF",
    selected: "#5AF78E",
    pending: "#FFD36A",
    unansweredHighlight: "#FF6B6B",

    text: "#E7EEF5",
    textDim: "#A0AAB4",
    textBold: "#F5FAFF",
  },

  borders: {
    primary: "#46D9FF",
    warning: "#FFD36A",
    error: "#FF5C57",
    neutral: "#2A3238",
  },

  components: {
    header: {
      border: "#3D4852", // slightly more visible
      queueActive: "#46D9FF",
      queueEmpty: "#A0AAB4",
      queueFlash: "#B8F2FF",
      pillBg: "#0B1F26",
    },
    directory: {
      label: "#A0AAB4",
      path: "#E7EEF5",
    },
    tabBar: {
      selected: "#E7EEF5",
      selectedBg: "#0B1F26",
      default: "#A0AAB4",
      answered: "#5AF78E",
      unanswered: "#A0AAB4",
      divider: "#2A3238",
    },
    options: {
      focused: "#5AF78E",
      focusedBg: "#0F2417",
      selected: "#46D9FF",
      selectedBg: "#0B1F26",
      default: "#E7EEF5",
      description: "#A8B2BC",
      hint: "#A8B2BC",
    },
    input: {
      border: "#2A3238",
      borderFocused: "#46D9FF",
      placeholder: "#A0AAB4",
      cursor: "#46D9FF",
      cursorDim: "#B8F2FF",
    },
    review: {
      border: "#2A3238",
      confirmBorder: "#46D9FF",
      selectedOption: "#5AF78E",
      customAnswer: "#FFD36A",
      questionId: "#A0AAB4",
      divider: "#2A3238",
    },
    questionDisplay: {
      questionId: "#46D9FF",
      typeIndicator: "#A0AAB4",
      elapsed: "#A0AAB4",
    },
    footer: {
      border: "#2A3238",
      keyBg: "#0B1F26",
      keyFg: "#46D9FF",
      action: "#A8B2BC",
      separator: "#2A3238",
    },
    toast: {
      success: "#5AF78E",
      successPillBg: "#0F2417",
      error: "#FF5C57",
      info: "#46D9FF",
      border: "#2A3238",
    },
  },
} as const;
