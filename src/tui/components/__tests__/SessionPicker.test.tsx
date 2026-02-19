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
      if (options?.isActive) {
        inputState.handler = handler;
      }
    },
  };
});

import { ThemeContext } from "../../ThemeContext.js";
import { darkTheme } from "../../themes/dark.js";
import type { SessionUIState } from "../../types.js";
import {
  SessionPicker,
  type SessionPickerSessionData,
} from "../SessionPicker.js";

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

function getOutput(frame: string | undefined): string {
  return (frame ?? "").replace(/\x1b\[[0-9;]*m/g, "").replace(/\r/g, "");
}

function createSession(id: number): SessionPickerSessionData {
  return {
    sessionId: `picker-id-${id}`,
    sessionRequest: {
      sessionId: `picker-id-${id}`,
      status: "pending",
      timestamp: new Date("2026-01-01T00:00:00.000Z").toISOString(),
      workingDirectory: `/work/dir-${id}`,
      questions: [
        {
          title: `Title ${id}`,
          prompt: "choose",
          options: [{ label: "A" }],
          multiSelect: false,
        },
      ],
    },
    timestamp: new Date("2026-01-01T00:00:00.000Z"),
  };
}

afterEach(() => {
  cleanup();
  inputState.handler = null;
  vi.restoreAllMocks();
});

describe("SessionPicker", () => {
  it("renders nothing when isOpen is false", () => {
    const instance = renderWithTheme(
      <SessionPicker
        isOpen={false}
        sessions={[createSession(1), createSession(2)]}
        activeIndex={0}
        sessionUIStates={{}}
        onSelectIndex={() => {}}
        onClose={() => {}}
      />,
    );

    expect(getOutput(instance.lastFrame())).toBe("");
  });

  it("renders session rows with number, title, directory, progress, and active marker", () => {
    const sessions = [createSession(1), createSession(2)];
    const answeredState: SessionUIState = {
      currentQuestionIndex: 0,
      answers: new Map([[0, { selectedOption: "A" }]]),
      elaborateMarks: new Map(),
      focusContext: "option",
      focusedOptionIndex: 0,
      showReview: false,
    };

    const instance = renderWithTheme(
      <SessionPicker
        isOpen
        sessions={sessions}
        activeIndex={0}
        sessionUIStates={{ [sessions[0].sessionId]: answeredState }}
        onSelectIndex={() => {}}
        onClose={() => {}}
      />,
    );

    const output = getOutput(instance.lastFrame());
    expect(output).toContain("Switch Session");
    expect(output).toContain("1. Title 1");
    expect(output).toContain("2. Title 2");
    expect(output).toContain("/work/dir-1");
    expect(output).toContain("[1/1]");
    expect(output).toContain("[0/1]");
    expect(output).toContain("► 1.");
  });

  it("handles down arrow without immediate selection", async () => {
    const sessions = [createSession(1), createSession(2), createSession(3)];
    const onSelectIndex = vi.fn();
    const onClose = vi.fn();

    renderWithTheme(
      <SessionPicker
        isOpen
        sessions={sessions}
        activeIndex={0}
        sessionUIStates={{}}
        onSelectIndex={onSelectIndex}
        onClose={onClose}
      />,
    );

    expect(inputState.handler).not.toBeNull();
    inputState.handler!("", { downArrow: true });
    await Promise.resolve();

    expect(onSelectIndex).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("selects the currently highlighted session on Enter", async () => {
    const sessions = [createSession(1), createSession(2), createSession(3)];
    const onSelectIndex = vi.fn();
    const onClose = vi.fn();

    renderWithTheme(
      <SessionPicker
        isOpen
        sessions={sessions}
        activeIndex={0}
        sessionUIStates={{}}
        onSelectIndex={onSelectIndex}
        onClose={onClose}
      />,
    );

    expect(inputState.handler).not.toBeNull();
    inputState.handler!("", { return: true });
    await Promise.resolve();

    expect(onSelectIndex).toHaveBeenCalledWith(0);
    expect(onClose).toHaveBeenCalled();
  });

  it("supports direct number key selection", async () => {
    const sessions = [createSession(1), createSession(2), createSession(3)];
    const onSelectIndex = vi.fn();
    const onClose = vi.fn();

    renderWithTheme(
      <SessionPicker
        isOpen
        sessions={sessions}
        activeIndex={0}
        sessionUIStates={{}}
        onSelectIndex={onSelectIndex}
        onClose={onClose}
      />,
    );

    expect(inputState.handler).not.toBeNull();
    inputState.handler!("2", {});
    await Promise.resolve();

    expect(onSelectIndex).toHaveBeenCalledWith(1);
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose on Escape", async () => {
    const onSelectIndex = vi.fn();
    const onClose = vi.fn();

    renderWithTheme(
      <SessionPicker
        isOpen
        sessions={[createSession(1), createSession(2)]}
        activeIndex={0}
        sessionUIStates={{}}
        onSelectIndex={onSelectIndex}
        onClose={onClose}
      />,
    );

    expect(inputState.handler).not.toBeNull();
    inputState.handler!("", { escape: true });
    await Promise.resolve();

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSelectIndex).not.toHaveBeenCalled();
  });
});
