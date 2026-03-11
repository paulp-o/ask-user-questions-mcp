/**
 * Tests for Footer component keybinding logic.
 * Since Footer uses React hooks, we test the underlying logic and constants.
 */
import { test, expect, describe } from "bun:test";
import { KEY_LABELS, KEYS } from "../../../tui/constants/keybindings.js";

describe("KEY_LABELS constants", () => {
  test("has expected review screen keybindings", () => {
    expect(KEY_LABELS.SUBMIT).toBe("Enter");
    expect(KEY_LABELS.BACK).toBe("n");
  });

  test("has navigation keybinding labels", () => {
    expect(KEY_LABELS.NAVIGATE_OPTIONS).toBe("↑↓");
    expect(KEY_LABELS.NAVIGATE_QUESTIONS).toBe("←→");
    expect(KEY_LABELS.NAVIGATE_QUESTIONS_TAB).toBe("Tab/S+Tab");
  });

  test("has selection keybinding labels", () => {
    expect(KEY_LABELS.SELECT).toBe("Space");
    expect(KEY_LABELS.SELECT_NEXT).toBe("Enter");
    expect(KEY_LABELS.NEXT).toBe("Enter");
  });

  test("has rejection keybinding label", () => {
    expect(KEY_LABELS.REJECT).toBe("Esc");
  });

  test("has theme and session keybinding labels", () => {
    expect(KEY_LABELS.THEME).toBe("Ctrl+T");
    expect(KEY_LABELS.SESSION_SWITCH).toBe("]/[");
    expect(KEY_LABELS.SESSION_LIST).toBe("Ctrl+S");
  });

  test("has quick submit and recommend keybinding labels", () => {
    expect(KEY_LABELS.QUICK_SUBMIT).toBe("Ctrl+R");
    expect(KEY_LABELS.RECOMMEND).toBe("R");
  });

  test("has cursor keybinding label", () => {
    expect(KEY_LABELS.CURSOR).toBe("←→");
  });

  test("has update keybinding label", () => {
    expect(KEY_LABELS.UPDATE).toBe("U");
  });
});

describe("KEYS constants", () => {
  test("has session navigation keys", () => {
    expect(KEYS.SESSION_NEXT).toBe("]");
    expect(KEYS.SESSION_PREV).toBe("[");
  });

  test("SESSION_JUMP range is valid 1-9", () => {
    expect(KEYS.SESSION_JUMP_MIN).toBe(1);
    expect(KEYS.SESSION_JUMP_MAX).toBe(9);
    expect(KEYS.SESSION_JUMP_MAX).toBeGreaterThan(KEYS.SESSION_JUMP_MIN);
  });

  test("RECOMMEND key is lowercase r", () => {
    expect(KEYS.RECOMMEND).toBe("r");
  });

  test("QUICK_SUBMIT key is r (used with ctrl)", () => {
    expect(KEYS.QUICK_SUBMIT).toBe("r");
  });

  test("THEME_CYCLE key is lowercase t", () => {
    expect(KEYS.THEME_CYCLE).toBe("t");
  });

  test("CONFIRM_YES matches y and Y", () => {
    expect(KEYS.CONFIRM_YES.test("y")).toBe(true);
    expect(KEYS.CONFIRM_YES.test("Y")).toBe(true);
    expect(KEYS.CONFIRM_YES.test("n")).toBe(false);
  });

  test("CONFIRM_NO matches n and N", () => {
    expect(KEYS.CONFIRM_NO.test("n")).toBe(true);
    expect(KEYS.CONFIRM_NO.test("N")).toBe(true);
    expect(KEYS.CONFIRM_NO.test("y")).toBe(false);
  });

  test("GO_BACK matches n and N", () => {
    expect(KEYS.GO_BACK.test("n")).toBe(true);
    expect(KEYS.GO_BACK.test("N")).toBe(true);
    expect(KEYS.GO_BACK.test("y")).toBe(false);
  });

  test("QUIT matches q and Q", () => {
    expect(KEYS.QUIT.test("q")).toBe(true);
    expect(KEYS.QUIT.test("Q")).toBe(true);
    expect(KEYS.QUIT.test("w")).toBe(false);
  });
});

describe("Footer keybinding logic (derived from component spec)", () => {
  /**
   * Simulates the getKeybindings() logic from the Footer component.
   * This validates the correct keybindings are shown for each focus context.
   */
  function getKeybindings(opts: {
    focusContext: "option" | "custom-input" | "elaborate-input";
    multiSelect: boolean;
    isReviewScreen?: boolean;
    hasRecommendedOptions?: boolean;
    hasAnyRecommendedInSession?: boolean;
    showSessionSwitching?: boolean;
    hasUpdate?: boolean;
  }): { key: string; action: string }[] {
    const {
      focusContext,
      multiSelect,
      isReviewScreen = false,
      hasRecommendedOptions = false,
      hasAnyRecommendedInSession = false,
      showSessionSwitching = false,
      hasUpdate = false,
    } = opts;

    if (isReviewScreen) {
      return [
        { key: KEY_LABELS.SUBMIT, action: "submit" },
        { key: KEY_LABELS.BACK, action: "back" },
      ];
    }

    if (focusContext === "custom-input") {
      return [
        { key: KEY_LABELS.NAVIGATE_OPTIONS, action: "options" },
        { key: KEY_LABELS.CURSOR, action: "cursor" },
        { key: KEY_LABELS.NAVIGATE_QUESTIONS_TAB, action: "questions" },
        { key: KEY_LABELS.NEWLINE, action: "newline" },
        { key: KEY_LABELS.REJECT, action: "reject" },
      ];
    }

    if (focusContext === "elaborate-input") {
      return [
        { key: KEY_LABELS.NAVIGATE_OPTIONS, action: "options" },
        { key: KEY_LABELS.CURSOR, action: "cursor" },
        { key: "Enter/Tab", action: "next" },
        { key: KEY_LABELS.REJECT, action: "reject" },
      ];
    }

    // Option mode
    const bindings: { key: string; action: string }[] = [
      { key: KEY_LABELS.NAVIGATE_OPTIONS, action: "options" },
      { key: KEY_LABELS.NAVIGATE_QUESTIONS, action: "questions" },
      { key: KEY_LABELS.NAVIGATE_QUESTIONS_TAB, action: "questions" },
    ];

    if (multiSelect) {
      bindings.push({ key: KEY_LABELS.SELECT, action: "toggle" });
      bindings.push({ key: KEY_LABELS.NEXT, action: "next" });
    } else {
      bindings.push({ key: KEY_LABELS.SELECT, action: "select" });
      bindings.push({ key: KEY_LABELS.SELECT_NEXT, action: "selectNext" });
    }

    if (hasRecommendedOptions) {
      bindings.push({ key: KEY_LABELS.RECOMMEND, action: "recommended" });
    }
    if (hasAnyRecommendedInSession) {
      bindings.push({ key: KEY_LABELS.QUICK_SUBMIT, action: "quickSubmit" });
    }
    if (showSessionSwitching) {
      bindings.push({ key: KEY_LABELS.SESSION_SWITCH, action: "sessions" });
      bindings.push({ key: "1-9", action: "jump" });
      bindings.push({ key: KEY_LABELS.SESSION_LIST, action: "list" });
    }
    bindings.push({ key: KEY_LABELS.THEME, action: "theme" });
    if (hasUpdate) {
      bindings.push({ key: KEY_LABELS.UPDATE, action: "Update" });
    }
    bindings.push({ key: KEY_LABELS.REJECT, action: "reject" });

    return bindings;
  }

  test("review screen shows only Enter and n", () => {
    const bindings = getKeybindings({ focusContext: "option", multiSelect: false, isReviewScreen: true });
    expect(bindings).toHaveLength(2);
    expect(bindings[0].key).toBe(KEY_LABELS.SUBMIT);  // Enter
    expect(bindings[1].key).toBe(KEY_LABELS.BACK);    // n
  });

  test("custom-input context shows 5 keybindings", () => {
    const bindings = getKeybindings({ focusContext: "custom-input", multiSelect: false });
    expect(bindings).toHaveLength(5);
    // Should include navigation, cursor, questions tab, newline, reject
    const keys = bindings.map((b) => b.key);
    expect(keys).toContain(KEY_LABELS.NAVIGATE_OPTIONS);
    expect(keys).toContain(KEY_LABELS.CURSOR);
    expect(keys).toContain(KEY_LABELS.REJECT);
  });

  test("elaborate-input context shows 4 keybindings", () => {
    const bindings = getKeybindings({ focusContext: "elaborate-input", multiSelect: false });
    expect(bindings).toHaveLength(4);
    const keys = bindings.map((b) => b.key);
    expect(keys).toContain(KEY_LABELS.NAVIGATE_OPTIONS);
    expect(keys).toContain("Enter/Tab");
    expect(keys).toContain(KEY_LABELS.REJECT);
  });

  test("option mode single-select shows SELECT and SELECT_NEXT", () => {
    const bindings = getKeybindings({ focusContext: "option", multiSelect: false });
    const keys = bindings.map((b) => b.key);
    expect(keys).toContain(KEY_LABELS.SELECT);     // Space
    expect(keys).toContain(KEY_LABELS.SELECT_NEXT); // Enter
    // Note: NEXT and SELECT_NEXT both equal "Enter" - we just verify the correct pattern
  });

  test("option mode multi-select shows SELECT and NEXT (not SELECT_NEXT)", () => {
    const bindings = getKeybindings({ focusContext: "option", multiSelect: true });
    const keys = bindings.map((b) => b.key);
    expect(keys).toContain(KEY_LABELS.SELECT); // Space = toggle
    expect(keys).toContain(KEY_LABELS.NEXT);   // Enter = advance
  });

  test("shows RECOMMEND key only when hasRecommendedOptions", () => {
    const withRec = getKeybindings({ focusContext: "option", multiSelect: false, hasRecommendedOptions: true });
    const withoutRec = getKeybindings({ focusContext: "option", multiSelect: false, hasRecommendedOptions: false });
    const withKeys = withRec.map((b) => b.key);
    const withoutKeys = withoutRec.map((b) => b.key);
    expect(withKeys).toContain(KEY_LABELS.RECOMMEND);
    expect(withoutKeys).not.toContain(KEY_LABELS.RECOMMEND);
  });

  test("shows QUICK_SUBMIT key only when hasAnyRecommendedInSession", () => {
    const withRec = getKeybindings({ focusContext: "option", multiSelect: false, hasAnyRecommendedInSession: true });
    const withoutRec = getKeybindings({ focusContext: "option", multiSelect: false, hasAnyRecommendedInSession: false });
    expect(withRec.map((b) => b.key)).toContain(KEY_LABELS.QUICK_SUBMIT);
    expect(withoutRec.map((b) => b.key)).not.toContain(KEY_LABELS.QUICK_SUBMIT);
  });

  test("shows session switching keys when showSessionSwitching", () => {
    const withSS = getKeybindings({ focusContext: "option", multiSelect: false, showSessionSwitching: true });
    const keys = withSS.map((b) => b.key);
    expect(keys).toContain(KEY_LABELS.SESSION_SWITCH);
    expect(keys).toContain("1-9");
    expect(keys).toContain(KEY_LABELS.SESSION_LIST);
  });

  test("always shows THEME and REJECT in option mode", () => {
    const bindings = getKeybindings({ focusContext: "option", multiSelect: false });
    const keys = bindings.map((b) => b.key);
    expect(keys).toContain(KEY_LABELS.THEME);
    expect(keys).toContain(KEY_LABELS.REJECT);
  });

  test("shows UPDATE key only when hasUpdate", () => {
    const withUpdate = getKeybindings({ focusContext: "option", multiSelect: false, hasUpdate: true });
    const withoutUpdate = getKeybindings({ focusContext: "option", multiSelect: false, hasUpdate: false });
    expect(withUpdate.map((b) => b.key)).toContain(KEY_LABELS.UPDATE);
    expect(withoutUpdate.map((b) => b.key)).not.toContain(KEY_LABELS.UPDATE);
  });
});