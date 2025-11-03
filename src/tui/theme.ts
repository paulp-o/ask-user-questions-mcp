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
 * EXAMPLE THEME VARIATIONS:
 *
 * Ocean Theme:
 *   gradient: { start: "cyan", middle: "blue", end: "blueBright" }
 *
 * Sunset Theme:
 *   gradient: { start: "yellow", middle: "red", end: "magenta" }
 *
 * Forest Theme:
 *   gradient: { start: "green", middle: "cyan", end: "blue" }
 *
 * Monochrome Theme:
 *   gradient: { start: "white", middle: "gray", end: "white" }
 */

export const theme = {
  /**
   * Gradient Colors
   * Used for logo, welcome messages, and decorative text
   */
  gradient: {
    start: "cyan",
    middle: "green",
    end: "yellow",
  },

  /**
   * UI State Colors
   */
  colors: {
    // Primary UI colors
    primary: "cyan" as const,
    success: "green" as const,
    warning: "yellow" as const,
    error: "red" as const,
    info: "blue" as const,

    // Interactive states
    focused: "cyan" as const,
    selected: "green" as const,
    pending: "yellow" as const,

    // Text colors
    text: "white" as const,
    textDim: "gray" as const,
    textBold: "white" as const,
  },

  /**
   * Border Colors
   */
  borders: {
    primary: "cyan" as const,
    warning: "yellow" as const,
    error: "red" as const,
    neutral: "gray" as const,
  },

  /**
   * Component-Specific Colors
   */
  components: {
    header: {
      border: "cyan" as const,
      queueActive: "yellow" as const,
      queueEmpty: "green" as const,
      queueFlash: "cyan" as const,
    },
    tabBar: {
      selected: "cyan" as const,
      selectedBg: "black" as const,
      default: "white" as const,
      answered: "green" as const,
      unanswered: "gray" as const,
    },
    options: {
      focused: "cyan" as const,
      selected: "green" as const,
      default: "white" as const,
    },
    review: {
      border: "cyan" as const,
      confirmBorder: "yellow" as const,
      selectedOption: "green" as const,
      customAnswer: "yellow" as const,
    },
    toast: {
      success: "green" as const,
      error: "red" as const,
      info: "cyan" as const,
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
