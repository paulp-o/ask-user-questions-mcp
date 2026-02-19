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
    unansweredHighlight: string; // Red-family color for unanswered questions emphasis

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
      successPillBg: string; // Background color for success pill/badge style
      error: string;
      info: string;
      border: string;
    };
    markdown: {
      codeBlockBg: string;
      codeBlockText: string;
      codeBlockBorder: string;
    };
    sessionDots: {
      active: string; // Filled dot for active session
      answered: string; // Green for sessions with answers
      inProgress: string; // Yellow for touched but no answers
      untouched: string; // Dim for untouched sessions
      number: string; // Color for the session number text
      activeNumber: string; // Color for active session number (bold)
    };
    sessionPicker: {
      border: string; // Modal border color
      title: string; // Modal title color
      rowText: string; // Normal row text
      rowDim: string; // Dim text (workdir, age)
      highlightBg: string; // Background for highlighted/cursor row
      highlightFg: string; // Foreground for highlighted row
      activeMark: string; // Color for the active session marker
      progress: string; // Color for progress info [2/4]
    };
  };
}
