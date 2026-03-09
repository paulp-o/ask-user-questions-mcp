import React from "react";
import { cleanup, render } from "ink-testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";

const inputState = vi.hoisted(() => ({
  handler: null as
    | null
    | ((input: string, key: Record<string, boolean>) => void),
}));

vi.mock("ink", async () => {
  const actual = await vi.importActual<typeof import("ink")>("ink");
  return {
    ...actual,
    useInput: (
      handler: (input: string, key: Record<string, boolean>) => void,
      options?: { isActive?: boolean },
    ) => {
      // ReviewScreen calls useInput without options, so always capture
      if (!options || options.isActive !== false) {
        inputState.handler = handler;
      }
    },
  };
});

import { ThemeContext } from "../../ThemeContext.js";
import { darkTheme } from "../../themes/dark.js";
import { ReviewScreen } from "../ReviewScreen.js";
import type { Question } from "../../../session/types.js";

const mockThemeValue = {
  theme: darkTheme,
  themeName: "AUQ dark",
  cycleTheme: () => {},
};

function renderWithTheme(ui: React.ReactElement) {
  return render(
    <ThemeContext.Provider value={mockThemeValue}>{ui}</ThemeContext.Provider>,
  );
}

afterEach(() => {
  cleanup();
  inputState.handler = null;
  vi.restoreAllMocks();
});

describe("ReviewScreen keyboard handling", () => {
  const sampleQuestions: Question[] = [
    {
      title: "Q1",
      prompt: "Choose an option",
      options: [{ label: "Option A" }, { label: "Option B" }],
      multiSelect: false,
    },
  ];

  const sampleAnswers = new Map([
    [0, { selectedOption: "Option A" }],
  ]);

  function renderReview(overrides: Record<string, unknown> = {}) {
    const props = {
      questions: sampleQuestions,
      answers: sampleAnswers,
      elapsedLabel: "5s",
      sessionId: "test-session-1",
      onConfirm: vi.fn(),
      onGoBack: vi.fn(),
      isSubmitting: false,
      ...overrides,
    };
    const instance = renderWithTheme(<ReviewScreen {...props} />);
    return { instance, ...props };
  }

  it("Enter submits answers", async () => {
    const { onConfirm } = renderReview();
    expect(inputState.handler).not.toBeNull();

    inputState.handler!("", { return: true });
    await Promise.resolve();

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("n key goes back", async () => {
    const { onGoBack } = renderReview();
    expect(inputState.handler).not.toBeNull();

    inputState.handler!("n", {});
    await Promise.resolve();

    expect(onGoBack).toHaveBeenCalledTimes(1);
  });

  it("N key (uppercase) goes back (case-insensitive)", async () => {
    const { onGoBack } = renderReview();
    expect(inputState.handler).not.toBeNull();

    inputState.handler!("N", {});
    await Promise.resolve();

    expect(onGoBack).toHaveBeenCalledTimes(1);
  });

  it("Enter does not fire while submitting", async () => {
    const { onConfirm } = renderReview({ isSubmitting: true });
    expect(inputState.handler).not.toBeNull();

    inputState.handler!("", { return: true });
    await Promise.resolve();

    expect(onConfirm).not.toHaveBeenCalled();
  });
});