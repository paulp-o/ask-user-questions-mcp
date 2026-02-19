import React from "react";
import { cleanup, render } from "ink-testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ThemeContext } from "../../ThemeContext.js";
import { darkTheme } from "../../themes/dark.js";
import type { SessionUIState } from "../../types.js";
import { SessionDots, type SessionDotsSessionData } from "../SessionDots.js";

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

function createSession(id: number): SessionDotsSessionData {
  return {
    sessionId: `test-id-${id}`,
    sessionRequest: {
      sessionId: `test-id-${id}`,
      status: "pending",
      timestamp: new Date("2026-01-01T00:00:00.000Z").toISOString(),
      workingDirectory: `/test/${id}`,
      questions: [
        {
          title: `Q${id}`,
          prompt: "test?",
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
  vi.restoreAllMocks();
});

describe("SessionDots", () => {
  it("renders nothing when sessions length is less than 2", () => {
    const instance = renderWithTheme(
      <SessionDots
        sessions={[createSession(1)]}
        activeIndex={0}
        sessionUIStates={{}}
      />,
    );

    expect(getOutput(instance.lastFrame())).toBe("");
  });

  it("renders numbered dots for each session", () => {
    const sessions = [createSession(1), createSession(2), createSession(3)];
    const instance = renderWithTheme(
      <SessionDots sessions={sessions} activeIndex={1} sessionUIStates={{}} />,
    );
    const output = getOutput(instance.lastFrame());

    expect(output).toContain("1");
    expect(output).toContain("2");
    expect(output).toContain("3");
    expect(output).toContain("●");
    expect(output).toContain("○");
  });

  it("renders progress-state sessions with one active and remaining inactive dots", () => {
    const sessions = [
      createSession(1),
      createSession(2),
      createSession(3),
      createSession(4),
    ];

    const answeredState: SessionUIState = {
      currentQuestionIndex: 0,
      answers: new Map([[0, { selectedOption: "A" }]]),
      elaborateMarks: new Map(),
      focusContext: "option",
      focusedOptionIndex: 0,
      showReview: false,
    };

    const inProgressState: SessionUIState = {
      currentQuestionIndex: 0,
      answers: new Map(),
      elaborateMarks: new Map(),
      focusContext: "option",
      focusedOptionIndex: 0,
      showReview: false,
    };

    const instance = renderWithTheme(
      <SessionDots
        sessions={sessions}
        activeIndex={0}
        sessionUIStates={{
          [sessions[1].sessionId]: answeredState,
          [sessions[2].sessionId]: inProgressState,
        }}
      />,
    );
    const output = getOutput(instance.lastFrame());

    expect((output.match(/●/g) ?? []).length).toBe(1);
    expect((output.match(/○/g) ?? []).length).toBe(3);
    expect(output).toContain("1");
    expect(output).toContain("2");
    expect(output).toContain("3");
    expect(output).toContain("4");
  });
});
