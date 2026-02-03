import type { Theme } from "./types.js";

/**
 * Catppuccin Latte Theme
 * Soothing pastel theme - light flavor.
 * https://github.com/catppuccin/catppuccin
 */
export const catppuccinLatteTheme: Theme = {
  name: "catppuccin-latte",

  gradient: {
    start: "#1e66f5", // blue
    middle: "#8839ef", // mauve
    end: "#1e66f5",
  },

  colors: {
    primary: "#1e66f5", // blue
    success: "#40a02b", // green
    warning: "#df8e1d", // yellow
    error: "#d20f39", // red
    info: "#04a5e5", // sky

    focused: "#1e66f5",
    selected: "#40a02b",
    pending: "#fe640b", // peach
    unansweredHighlight: "#d20f39",

    text: "#4c4f69", // text
    textDim: "#acb0c0", // overlay0 lightened
    textBold: "#4c4f69",
  },

  borders: {
    primary: "#1e66f5",
    warning: "#df8e1d",
    error: "#d20f39",
    neutral: "#ccd0da", // surface0
  },

  components: {
    header: {
      border: "#9ca0b0", // overlay0 - slightly more visible
      queueActive: "#1e66f5",
      queueEmpty: "#acb0c0",
      queueFlash: "#8839ef",
      pillBg: "#ccd0da",
    },
    directory: {
      label: "#acb0c0",
      path: "#4c4f69",
    },
    tabBar: {
      selected: "#4c4f69",
      selectedBg: "#ccd0da",
      default: "#acb0c0",
      answered: "#40a02b",
      unanswered: "#acb0c0",
      divider: "#ccd0da",
    },
    options: {
      focused: "#40a02b",
      focusedBg: "#ccd0da",
      selected: "#1e66f5",
      selectedBg: "#ccd0da",
      default: "#4c4f69",
      description: "#6c6f85", // subtext0 - darker for readability
      hint: "#6c6f85", // subtext0 - darker for readability
    },
    input: {
      border: "#ccd0da",
      borderFocused: "#1e66f5",
      placeholder: "#acb0c0",
      cursor: "#1e66f5",
      cursorDim: "#8839ef",
    },
    review: {
      border: "#ccd0da",
      confirmBorder: "#1e66f5",
      selectedOption: "#40a02b",
      customAnswer: "#df8e1d",
      questionId: "#acb0c0",
      divider: "#ccd0da",
    },
    questionDisplay: {
      questionId: "#1e66f5",
      typeIndicator: "#acb0c0",
      elapsed: "#acb0c0",
    },
    footer: {
      border: "#ccd0da",
      keyBg: "#ccd0da",
      keyFg: "#1e66f5",
      action: "#7c7f93", // overlay1 - darker for visibility
      separator: "#ccd0da",
    },
    toast: {
      success: "#40a02b",
      successPillBg: "#dce0e8",
      error: "#d20f39",
      info: "#1e66f5",
      border: "#ccd0da",
    },
  },
} as const;
