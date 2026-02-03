import type { Theme } from "./types.js";

/**
 * Gruvbox Light Theme
 * Retro groove color scheme - light variant.
 * https://github.com/morhetz/gruvbox
 */
export const gruvboxLightTheme: Theme = {
  name: "gruvbox-light",

  gradient: {
    start: "#076678", // faded blue
    middle: "#427b58", // faded aqua
    end: "#076678",
  },

  colors: {
    primary: "#076678", // faded blue
    success: "#79740e", // faded green
    warning: "#b57614", // faded yellow
    error: "#9d0006", // faded red
    info: "#076678", // faded blue

    focused: "#076678",
    selected: "#79740e",
    pending: "#b57614",

    text: "#3c3836", // dark1
    textDim: "#928374", // gray
    textBold: "#282828", // dark0
  },

  borders: {
    primary: "#076678",
    warning: "#b57614",
    error: "#9d0006",
    neutral: "#d5c4a1", // light2
  },

  components: {
    header: {
      border: "#a89984", // gray - slightly more visible
      queueActive: "#076678",
      queueEmpty: "#928374",
      queueFlash: "#427b58",
      pillBg: "#ebdbb2", // light1
    },
    directory: {
      label: "#928374",
      path: "#3c3836",
    },
    tabBar: {
      selected: "#3c3836",
      selectedBg: "#ebdbb2",
      default: "#928374",
      answered: "#79740e",
      unanswered: "#928374",
      divider: "#d5c4a1",
    },
    options: {
      focused: "#79740e",
      focusedBg: "#ebdbb2",
      selected: "#076678",
      selectedBg: "#ebdbb2",
      default: "#3c3836",
      description: "#3c3836", // dark1
      hint: "#3c3836", // dark1
    },
    input: {
      border: "#d5c4a1",
      borderFocused: "#076678",
      placeholder: "#928374",
      cursor: "#076678",
      cursorDim: "#427b58",
    },
    review: {
      border: "#d5c4a1",
      confirmBorder: "#076678",
      selectedOption: "#79740e",
      customAnswer: "#b57614",
      questionId: "#928374",
      divider: "#d5c4a1",
    },
    questionDisplay: {
      questionId: "#076678",
      typeIndicator: "#928374",
      elapsed: "#928374",
    },
    footer: {
      border: "#d5c4a1",
      keyBg: "#ebdbb2",
      keyFg: "#282828",
      action: "#928374",
      separator: "#d5c4a1",
    },
    toast: {
      success: "#79740e",
      error: "#9d0006",
      info: "#076678",
      border: "#d5c4a1",
    },
  },
} as const;
