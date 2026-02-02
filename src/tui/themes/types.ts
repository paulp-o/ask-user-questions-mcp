export interface Theme {
  name: string;

  /**
   * Gradient Colors
   * Used for the AUQ wordmark and subtle motion accents.
   */
  gradient: {
    start: string;
    middle: string;
    end: string;
  };

  /**
   * UI State Colors
   */
  colors: {
    // Semantic colors (keep to 4 hues)
    primary: string;
    success: string;
    warning: string;
    error: string;
    info: string;

    // Interactive states
    focused: string;
    selected: string;
    pending: string;

    // Text colors
    text: string;
    textDim: string;
    textBold: string;
  };

  /**
   * Border Colors
   */
  borders: {
    primary: string;
    warning: string;
    error: string;
    neutral: string;
  };

  /**
   * Component-Specific Colors
   */
  components: {
    header: {
      border: string;
      queueActive: string;
      queueEmpty: string;
      queueFlash: string;
      pillBg: string;
    };
    directory: {
      label: string;
      path: string;
    };
    tabBar: {
      selected: string;
      selectedBg: string;
      default: string;
      answered: string;
      unanswered: string;
      divider: string;
    };
    options: {
      focused: string;
      focusedBg: string;
      selected: string;
      selectedBg: string;
      default: string;
      description: string;
      hint: string;
    };
    input: {
      border: string;
      borderFocused: string;
      placeholder: string;
      cursor: string;
      cursorDim: string;
    };
    review: {
      border: string;
      confirmBorder: string;
      selectedOption: string;
      customAnswer: string;
      questionId: string;
      divider: string;
    };
    questionDisplay: {
      questionId: string;
      typeIndicator: string;
      elapsed: string;
    };
    footer: {
      border: string;
      keyBg: string;
      keyFg: string;
      action: string;
      separator: string;
    };
    toast: {
      success: string;
      error: string;
      info: string;
      border: string;
    };
  };
}
