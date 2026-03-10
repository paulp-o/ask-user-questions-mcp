// Keybinding constants for the TUI application
// All keyboard shortcut definitions are centralized here.

export const KEYS = {
  // Session switching (bare keys, no Ctrl)
  SESSION_NEXT: "]",
  SESSION_PREV: "[",
  SESSION_JUMP_MIN: 1,
  SESSION_JUMP_MAX: 9,

  // Question navigation
  RECOMMEND: "r",
  QUICK_SUBMIT: "r", // used with key.ctrl

  // Theme
  THEME_CYCLE: "t", // used with key.ctrl

  // Update overlay
  UPDATE: "u",

  // Confirmation shortcuts
  CONFIRM_YES: /^[yY]$/,
  CONFIRM_NO: /^[nN]$/,

  // Review
  GO_BACK: /^[nN]$/,

  // Waiting
  QUIT: /^[qQ]$/,
} as const;

// Display labels for Footer keybinding hints
export const KEY_LABELS = {
  SESSION_SWITCH: "]/[",
  SESSION_LIST: "Ctrl+S",
  QUICK_SUBMIT: "Ctrl+R",
  RECOMMEND: "R",
  THEME: "Ctrl+T",
  NAVIGATE_QUESTIONS: "←→",
  NAVIGATE_QUESTIONS_TAB: "Tab/S+Tab",
  NAVIGATE_OPTIONS: "↑↓",
  SELECT: "Space",
  SELECT_NEXT: "Enter",
  NEXT: "Enter",
  CURSOR: "←→",
  NEWLINE: "Enter",
  REJECT: "Esc",
  BACK: "n",
  SUBMIT: "Enter",
  UPDATE: "U",
} as const;