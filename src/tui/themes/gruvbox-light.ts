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
    unansweredHighlight: "#cc241d", // gruvbox red

    text: "#3c3836", // dark1
    textDim: "#a89984", // gray lightened
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
      queueEmpty: "#a89984",
      queueFlash: "#427b58",
      pillBg: "#ebdbb2", // light1
    },
    directory: {
      label: "#a89984",
      path: "#3c3836",
    },
    tabBar: {
      selected: "#3c3836",
      selectedBg: "#ebdbb2",
      default: "#a89984",
      answered: "#79740e",
      unanswered: "#a89984",
      divider: "#d5c4a1",
    },
    options: {
      focused: "#79740e",
      focusedBg: "#ebdbb2",
      selected: "#076678",
      selectedBg: "#ebdbb2",
      default: "#3c3836",
      description: "#665c54", // dark3 - darker for readability
      hint: "#665c54", // dark3 - darker for readability
    },
    input: {
      border: "#d5c4a1",
      borderFocused: "#076678",
      placeholder: "#a89984",
      cursor: "#076678",
      cursorDim: "#427b58",
    },
    review: {
      border: "#d5c4a1",
      confirmBorder: "#076678",
      selectedOption: "#79740e",
      customAnswer: "#b57614",
      questionId: "#a89984",
      divider: "#d5c4a1",
    },
    questionDisplay: {
      questionId: "#076678",
      typeIndicator: "#a89984",
      elapsed: "#a89984",
    },
    footer: {
      border: "#d5c4a1",
      keyBg: "#ebdbb2",
      keyFg: "#076678",
      action: "#665c54", // dark3 - darker for visibility
      separator: "#d5c4a1",
    },
    toast: {
      success: "#79740e",
      successPillBg: "#ebdbb2", // light1 - light bg
      error: "#9d0006",
      info: "#076678",
      border: "#d5c4a1",
    },
    markdown: {
      codeBlockBg: "#f9f5d9",
      codeBlockText: "#3c3836",
      codeBlockBorder: "#d5c4a1",
    },
    sessionDots: {
      active: "#076678",
      answered: "#79740e",
      inProgress: "#b57614",
      untouched: "#a89984",
      number: "#3c3836",
      activeNumber: "#076678",
    },
    sessionPicker: {
      border: "#076678",
      title: "#076678",
      rowText: "#3c3836",
      rowDim: "#a89984",
      highlightBg: "#ebdbb2",
      highlightFg: "#79740e",
      activeMark: "#076678",
      progress: "#076678",
    },
  },
} as const;
