import React from "react";
import { cleanup, render } from "ink-testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ThemeContext } from "../../ThemeContext.js";
import { darkTheme } from "../../shared/themes/dark.js";
import { KEY_LABELS } from "../../constants/keybindings.js";
import { Footer } from "../Footer.js";

const mockThemeValue = {
  theme: darkTheme,
  themeName: "AUQ dark" as const,
  cycleTheme: () => {},
};

function renderWithTheme(ui: React.ReactElement) {
  return render(
    <ThemeContext.Provider value={mockThemeValue}>{ui}</ThemeContext.Provider>,
  );
}

function getOutput(frame: string | undefined): string {
  return (frame ?? "").replace(/\x1b\[[0-9;]*m/g, "").replace(/\r/g, "");
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Footer keybinding labels", () => {
  it("option context (single-select) shows correct keybindings", () => {
    const instance = renderWithTheme(
      <Footer focusContext="option" multiSelect={false} />,
    );
    const output = getOutput(instance.lastFrame());

    expect(output).toContain(KEY_LABELS.SELECT); // "Space"
    expect(output).toContain(KEY_LABELS.SELECT_NEXT); // "Enter"
    expect(output).toContain(KEY_LABELS.REJECT); // "Esc"
    expect(output).toContain(KEY_LABELS.NAVIGATE_OPTIONS); // "↑↓"
    expect(output).toContain(KEY_LABELS.NAVIGATE_QUESTIONS); // "←→"
  });

  it("option context (multi-select) shows Toggle label", () => {
    const instance = renderWithTheme(
      <Footer focusContext="option" multiSelect={true} />,
    );
    const output = getOutput(instance.lastFrame());

    expect(output).toContain("Toggle");
    expect(output).toContain(KEY_LABELS.SELECT); // "Space"
    expect(output).toContain(KEY_LABELS.NEXT); // "Enter"
  });

  it("custom-input context shows correct keybindings", () => {
    const instance = renderWithTheme(
      <Footer focusContext="custom-input" multiSelect={false} />,
    );
    const output = getOutput(instance.lastFrame());

    expect(output).toContain(KEY_LABELS.NAVIGATE_OPTIONS); // "↑↓"
    expect(output).toContain(KEY_LABELS.CURSOR); // "←→"
    expect(output).toContain(KEY_LABELS.NEWLINE); // "Shift+Enter"
    expect(output).toContain(KEY_LABELS.ADVANCE_INPUT); // "Enter"
    expect(output).toContain(KEY_LABELS.REJECT); // "Esc"
  });

  it("elaborate-input context shows correct keybindings", () => {
    const instance = renderWithTheme(
      <Footer focusContext="elaborate-input" multiSelect={false} />,
    );
    const output = getOutput(instance.lastFrame());

    expect(output).toContain(KEY_LABELS.NAVIGATE_OPTIONS); // "↑↓"
    expect(output).toContain(KEY_LABELS.CURSOR); // "←→"
    expect(output).toContain(KEY_LABELS.NEWLINE); // "Shift+Enter"
    expect(output).toContain(KEY_LABELS.ADVANCE_INPUT); // "Enter"
    expect(output).toContain(KEY_LABELS.REJECT); // "Esc"
  });

  it("review screen shows Submit and Back labels", () => {
    const instance = renderWithTheme(
      <Footer focusContext="option" multiSelect={false} isReviewScreen={true} />,
    );
    const output = getOutput(instance.lastFrame());

    expect(output).toContain(KEY_LABELS.SUBMIT); // "Enter"
    expect(output).toContain(KEY_LABELS.BACK); // "n"
    expect(output).toContain("Submit");
    expect(output).toContain("Back");
  });

  it("session switch shows ]/[ (not Ctrl+]/[)", () => {
    const instance = renderWithTheme(
      <Footer
        focusContext="option"
        multiSelect={false}
        showSessionSwitching={true}
      />,
    );
    const output = getOutput(instance.lastFrame());

    // Should show "]/ [" session label
    expect(output).toContain(KEY_LABELS.SESSION_SWITCH); // "]/["
    // Must NOT contain Ctrl+] or Ctrl+[ anywhere
    expect(output).not.toContain("Ctrl+]");
    expect(output).not.toContain("Ctrl+[");
  });

  it("recommended key shown when hasRecommendedOptions is true", () => {
    const instance = renderWithTheme(
      <Footer
        focusContext="option"
        multiSelect={false}
        hasRecommendedOptions={true}
      />,
    );
    const output = getOutput(instance.lastFrame());

    expect(output).toContain(KEY_LABELS.RECOMMEND); // "R"
    expect(output).toContain("Recommended");
  });

  it("recommended key NOT shown when hasRecommendedOptions is false", () => {
    const instance = renderWithTheme(
      <Footer
        focusContext="option"
        multiSelect={false}
        hasRecommendedOptions={false}
      />,
    );
    const output = getOutput(instance.lastFrame());

    expect(output).not.toContain("Recommended");
  });

  it("quick submit shown when hasAnyRecommendedInSession is true", () => {
    const instance = renderWithTheme(
      <Footer
        focusContext="option"
        multiSelect={false}
        hasAnyRecommendedInSession={true}
      />,
    );
    const output = getOutput(instance.lastFrame());

    expect(output).toContain(KEY_LABELS.QUICK_SUBMIT); // "Ctrl+R"
    expect(output).toContain("Quick Submit");
  });

  it("quick submit NOT shown when hasAnyRecommendedInSession is false", () => {
    const instance = renderWithTheme(
      <Footer
        focusContext="option"
        multiSelect={false}
        hasAnyRecommendedInSession={false}
      />,
    );
    const output = getOutput(instance.lastFrame());

    expect(output).not.toContain("Quick Submit");
  });

  it("session switching shows 1-9 jump and Ctrl+S list labels", () => {
    const instance = renderWithTheme(
      <Footer
        focusContext="option"
        multiSelect={false}
        showSessionSwitching={true}
      />,
    );
    const output = getOutput(instance.lastFrame());

    expect(output).toContain("1-9");
    expect(output).toContain("Jump");
    expect(output).toContain(KEY_LABELS.SESSION_LIST); // "Ctrl+S"
    expect(output).toContain("List");
  });

  it("theme toggle is always shown in option context", () => {
    const instance = renderWithTheme(
      <Footer focusContext="option" multiSelect={false} />,
    );
    const output = getOutput(instance.lastFrame());

    expect(output).toContain(KEY_LABELS.THEME); // "Ctrl+T"
    expect(output).toContain("Theme");
  });

  it("review screen shows only submit and back, not option keybindings", () => {
    const instance = renderWithTheme(
      <Footer focusContext="option" multiSelect={false} isReviewScreen={true} />,
    );
    const output = getOutput(instance.lastFrame());

    // Review screen should only show Submit and Back
    expect(output).toContain("Submit");
    expect(output).toContain("Back");
    // Should NOT contain option-context keybindings
    expect(output).not.toContain("Toggle");
    expect(output).not.toContain("Theme");
    expect(output).not.toContain("Questions");
  });
});