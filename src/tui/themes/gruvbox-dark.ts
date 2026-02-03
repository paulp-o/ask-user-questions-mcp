import type { Theme } from "./types.js";

/**
 * Gruvbox Dark Theme
 * Retro groove color scheme with warm colors.
 * https://github.com/morhetz/gruvbox
 */
export const gruvboxDarkTheme: Theme = {
  name: "gruvbox-dark",

  gradient: {
    start: "#458588", // blue
    middle: "#689d6a", // aqua
    end: "#458588",
  },

  colors: {
    primary: "#458588", // blue
    success: "#98971a", // green
    warning: "#d79921", // yellow
    error: "#cc241d", // red
    info: "#458588", // blue

    focused: "#458588", // blue
    selected: "#98971a", // green
    pending: "#d79921", // yellow

    text: "#ebdbb2", // light1
    textDim: "#928374", // gray
    textBold: "#fbf1c7", // light0
  },

  borders: {
    primary: "#458588",
    warning: "#d79921",
    error: "#cc241d",
    neutral: "#3c3836", // dark1
  },

  components: {
    header: {
      border: "#504945", // dark2 - slightly more visible
      queueActive: "#458588",
      queueEmpty: "#928374",
      queueFlash: "#689d6a",
      pillBg: "#3c3836",
    },
    directory: {
      label: "#928374",
      path: "#ebdbb2",
    },
    tabBar: {
      selected: "#ebdbb2",
      selectedBg: "#3c3836",
      default: "#928374",
      answered: "#98971a",
      unanswered: "#928374",
      divider: "#3c3836",
    },
    options: {
      focused: "#98971a",
      focusedBg: "#3c3836",
      selected: "#458588",
      selectedBg: "#3c3836",
      default: "#ebdbb2",
      description: "#ebdbb2", // light1
      hint: "#ebdbb2", // light1
    },
    input: {
      border: "#3c3836",
      borderFocused: "#458588",
      placeholder: "#928374",
      cursor: "#458588",
      cursorDim: "#689d6a",
    },
    review: {
      border: "#3c3836",
      confirmBorder: "#458588",
      selectedOption: "#98971a",
      customAnswer: "#d79921",
      questionId: "#928374",
      divider: "#3c3836",
    },
    questionDisplay: {
      questionId: "#458588",
      typeIndicator: "#928374",
      elapsed: "#928374",
    },
    footer: {
      border: "#3c3836",
      keyBg: "#3c3836",
      keyFg: "#fbf1c7",
      action: "#928374",
      separator: "#3c3836",
    },
    toast: {
      success: "#98971a",
      error: "#cc241d",
      info: "#458588",
      border: "#3c3836",
    },
  },
} as const;
