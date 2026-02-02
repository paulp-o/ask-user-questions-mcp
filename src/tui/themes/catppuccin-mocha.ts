import type { Theme } from "./types.js";

/**
 * Catppuccin Mocha Theme
 * Soothing pastel theme - darkest flavor.
 * https://github.com/catppuccin/catppuccin
 */
export const catppuccinMochaTheme: Theme = {
  name: "catppuccin-mocha",

  gradient: {
    start: "#89b4fa", // blue
    middle: "#cba6f7", // mauve
    end: "#89b4fa",
  },

  colors: {
    primary: "#89b4fa", // blue
    success: "#a6e3a1", // green
    warning: "#f9e2af", // yellow
    error: "#f38ba8", // red
    info: "#89dceb", // sky

    focused: "#89b4fa",
    selected: "#a6e3a1",
    pending: "#fab387", // peach

    text: "#cdd6f4", // text
    textDim: "#6c7086", // overlay0
    textBold: "#cdd6f4",
  },

  borders: {
    primary: "#89b4fa",
    warning: "#f9e2af",
    error: "#f38ba8",
    neutral: "#313244", // surface0
  },

  components: {
    header: {
      border: "#45475a", // surface1 - slightly more visible
      queueActive: "#89b4fa",
      queueEmpty: "#6c7086",
      queueFlash: "#cba6f7",
      pillBg: "#313244",
    },
    directory: {
      label: "#6c7086",
      path: "#cdd6f4",
    },
    tabBar: {
      selected: "#cdd6f4",
      selectedBg: "#313244",
      default: "#6c7086",
      answered: "#a6e3a1",
      unanswered: "#6c7086",
      divider: "#313244",
    },
    options: {
      focused: "#a6e3a1",
      focusedBg: "#313244",
      selected: "#89b4fa",
      selectedBg: "#313244",
      default: "#cdd6f4",
      description: "#a6adc8", // subtext0 - lighter for readability
      hint: "#a6adc8", // subtext0 - lighter for readability
    },
    input: {
      border: "#313244",
      borderFocused: "#89b4fa",
      placeholder: "#6c7086",
      cursor: "#89b4fa",
      cursorDim: "#cba6f7",
    },
    review: {
      border: "#313244",
      confirmBorder: "#89b4fa",
      selectedOption: "#a6e3a1",
      customAnswer: "#f9e2af",
      questionId: "#6c7086",
      divider: "#313244",
    },
    questionDisplay: {
      questionId: "#89b4fa",
      typeIndicator: "#6c7086",
      elapsed: "#6c7086",
    },
    footer: {
      border: "#313244",
      keyBg: "#313244",
      keyFg: "#89b4fa",
      action: "#6c7086",
      separator: "#313244",
    },
    toast: {
      success: "#a6e3a1",
      error: "#f38ba8",
      info: "#89b4fa",
      border: "#313244",
    },
  },
} as const;
