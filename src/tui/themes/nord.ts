import type { Theme } from "./types.js";

/**
 * Nord Theme
 * An arctic, north-bluish color palette.
 * https://www.nordtheme.com/
 */
export const nordTheme: Theme = {
  name: "nord",

  gradient: {
    start: "#88c0d0", // nord8 - frost
    middle: "#8fbcbb", // nord7 - teal
    end: "#88c0d0",
  },

  colors: {
    primary: "#88c0d0", // nord8 - frost
    success: "#a3be8c", // nord14 - aurora green
    warning: "#ebcb8b", // nord13 - aurora yellow
    error: "#bf616a", // nord11 - aurora red
    info: "#81a1c1", // nord9 - frost blue

    focused: "#88c0d0", // nord8
    selected: "#a3be8c", // nord14
    pending: "#ebcb8b", // nord13

    text: "#eceff4", // nord6 - snow storm
    textDim: "#4c566a", // nord3 - polar night
    textBold: "#eceff4", // nord6
  },

  borders: {
    primary: "#88c0d0", // nord8
    warning: "#ebcb8b", // nord13
    error: "#bf616a", // nord11
    neutral: "#3b4252", // nord1
  },

  components: {
    header: {
      border: "#4c566a", // nord3 - slightly more visible
      queueActive: "#88c0d0", // nord8
      queueEmpty: "#4c566a", // nord3
      queueFlash: "#8fbcbb", // nord7
      pillBg: "#3b4252", // nord1
    },
    directory: {
      label: "#4c566a", // nord3
      path: "#eceff4", // nord6
    },
    tabBar: {
      selected: "#eceff4", // nord6
      selectedBg: "#3b4252", // nord1
      default: "#4c566a", // nord3
      answered: "#a3be8c", // nord14
      unanswered: "#4c566a", // nord3
      divider: "#3b4252", // nord1
    },
    options: {
      focused: "#a3be8c", // nord14 - green cursor
      focusedBg: "#3b4252", // nord1
      selected: "#88c0d0", // nord8 - cyan selected
      selectedBg: "#3b4252", // nord1
      default: "#eceff4", // nord6
      description: "#eceff4", // nord6
      hint: "#eceff4", // nord6
    },
    input: {
      border: "#3b4252", // nord1
      borderFocused: "#88c0d0", // nord8
      placeholder: "#4c566a", // nord3
      cursor: "#88c0d0", // nord8
      cursorDim: "#5e81ac", // nord10
    },
    review: {
      border: "#3b4252", // nord1
      confirmBorder: "#88c0d0", // nord8
      selectedOption: "#a3be8c", // nord14
      customAnswer: "#ebcb8b", // nord13
      questionId: "#4c566a", // nord3
      divider: "#3b4252", // nord1
    },
    questionDisplay: {
      questionId: "#88c0d0", // nord8
      typeIndicator: "#4c566a", // nord3
      elapsed: "#4c566a", // nord3
    },
    footer: {
      border: "#3b4252", // nord1
      keyBg: "#3b4252", // nord1
      keyFg: "#eceff4", // nord6
      action: "#4c566a", // nord3
      separator: "#3b4252", // nord1
    },
    toast: {
      success: "#a3be8c", // nord14
      error: "#bf616a", // nord11
      info: "#88c0d0", // nord8
      border: "#3b4252", // nord1
    },
  },
} as const;
