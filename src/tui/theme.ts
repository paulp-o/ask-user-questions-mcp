/**
 * Centralized Theme Configuration
 * Customize all colors and gradients in one place
 *
 * HOW TO CUSTOMIZE:
 * Simply edit the color values below and rebuild with `npm run build`
 *
 * Available terminal colors:
 * - Basic: "black", "red", "green", "yellow", "blue", "magenta", "cyan", "white"
 * - Bright: "gray", "grey", "brightRed", "brightGreen", etc.
 * - Or use hex colors: "#FF5733"
 *
 * Gradients:
 * This project uses gradient-string, but we keep the brand gradient constrained
 * to a small set of stops (defined below) for a calmer, more modern TUI.
 */

export const theme = {
  /**
   * Visual direction: graphite + electric-cyan accent.
   * Keep the palette tight; lean on neutrals for structure.
   */

  /**
   * Gradient Colors
   * Used for the AUQ wordmark and subtle motion accents.
   */
  gradient: {
    start: "#46D9FF",
    middle: "#B8F2FF",
    end: "#46D9FF",
  },

  /**
   * UI State Colors
   */
  colors: {
    // Semantic colors (keep to 4 hues)
    primary: "#46D9FF", // accent cyan
    success: "#5AF78E", // green
    warning: "#FFD36A", // amber
    error: "#FF5C57", // red
    info: "#46D9FF", // same as primary

    // Interactive states
    focused: "#46D9FF",
    selected: "#5AF78E",
    pending: "#FFD36A",

    // Text colors
    text: "#E7EEF5",
    textDim: "#8A949E",
    textBold: "#F5FAFF",
  },

  /**
   * Border Colors
   */
  borders: {
    primary: "#46D9FF",
    warning: "#FFD36A",
    error: "#FF5C57",
    neutral: "#2A3238",
  },

  /**
   * Component-Specific Colors
   */
  components: {
    header: {
      border: "#2A3238",
      queueActive: "#46D9FF",
      queueEmpty: "#8A949E",
      queueFlash: "#B8F2FF",
      pillBg: "#0B1F26",
    },
    directory: {
      label: "#8A949E",
      path: "#E7EEF5",
    },
    tabBar: {
      selected: "#E7EEF5",
      selectedBg: "#0B1F26",
      default: "#8A949E",
      answered: "#5AF78E",
      unanswered: "#8A949E",
      divider: "#2A3238",
    },
    options: {
      focused: "#5AF78E", // green - active cursor
      focusedBg: "#0F2417", // dark green bg
      selected: "#46D9FF", // cyan - already picked
      selectedBg: "#0B1F26", // dark cyan bg
      default: "#E7EEF5",
      description: "#8A949E",
      hint: "#8A949E",
    },
    input: {
      border: "#2A3238",
      borderFocused: "#46D9FF",
      placeholder: "#8A949E",
      cursor: "#46D9FF",
      cursorDim: "#B8F2FF",
    },
    review: {
      border: "#2A3238",
      confirmBorder: "#46D9FF",
      selectedOption: "#5AF78E",
      customAnswer: "#FFD36A",
      questionId: "#8A949E", // Q0, Q1, etc.
      divider: "#2A3238",
    },
    questionDisplay: {
      questionId: "#46D9FF", // [Q0] identifier
      typeIndicator: "#8A949E", // [Single Choice], [Multiple Choice]
      elapsed: "#8A949E",
    },
    footer: {
      border: "#2A3238",
      keyBg: "#0B1F26",
      keyFg: "#46D9FF",
      action: "#8A949E",
      separator: "#2A3238",
    },
    toast: {
      success: "#5AF78E",
      error: "#FF5C57",
      info: "#46D9FF",
      border: "#2A3238",
    },
  },
} as const;

/**
 * Export gradient colors as array for gradient-string
 */
export const gradientColors = [
  theme.gradient.start,
  theme.gradient.middle,
  theme.gradient.end,
] as const;
