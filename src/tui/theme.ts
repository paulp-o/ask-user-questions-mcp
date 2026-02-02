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
 * HEADER GRADIENT THEMES (from gradient-string):
 * Change 'headerGradient' below to any of these beautiful premade gradients:
 * - "cristal"    - Crystal clear blues
 * - "teen"       - Vibrant teen energy
 * - "mind"       - Psychedelic colors
 * - "morning"    - Sunrise colors
 * - "vice"       - Neon vice city
 * - "passion"    - Passionate reds
 * - "fruit"      - Fruity colors
 * - "instagram"  - Instagram gradient
 * - "atlas"      - Atlas blue
 * - "retro"      - Retro gaming
 * - "summer"     - Summer vibes
 * - "pastel"     - Soft pastels
 * - "rainbow"    - Full rainbow
 */

export const theme = {
  /**
   * Header Gradient Theme
   * To change: Replace "pastel" with any gradient name from the list above
   */
  headerGradient: "vice" as const,

  /**
   * Gradient Colors (deprecated - use headerGradient instead)
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
      questionId: "gray" as const, // Q0, Q1, etc. in review summary
    },
    questionDisplay: {
      questionId: "blue" as const, // [Q0], [Q1] identifier
      typeIndicator: "gray" as const, // [Single Choice], [Multiple Choice]
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
