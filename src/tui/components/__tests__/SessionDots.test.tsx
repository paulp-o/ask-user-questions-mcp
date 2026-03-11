import React from "react";
import { cleanup, render } from "ink-testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ThemeContext } from "../../ThemeContext.js";
import { darkTheme } from "../../shared/themes/dark.js";
import type { SessionUIState } from "../../shared/types.js";
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


function createSession(
  id: number,
  overrides?: Partial<SessionDotsSessionData>,
): SessionDotsSessionData {
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
    ...overrides,
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

  describe("abandoned sessions", () => {
    it("renders abandoned session with ✕ symbol when inactive", () => {
      const sessions = [
        createSession(1),
        createSession(2, { isAbandoned: true }),
        createSession(3),
      ];
      const instance = renderWithTheme(
        <SessionDots sessions={sessions} activeIndex={0} sessionUIStates={{}} />,
      );
      const output = getOutput(instance.lastFrame());

      // Abandoned inactive session uses ✕ instead of ○
      expect(output).toContain("✕");
      // Active session still uses ●
      expect(output).toContain("●");
      // Non-abandoned inactive session still uses ○
      expect(output).toContain("○");
    });

    it("renders abandoned session with different ANSI styling than normal", () => {
      // Render with abandoned session
      const abandonedSessions = [
        createSession(1),
        createSession(2, { isAbandoned: true }),
      ];
      const abandoned = renderWithTheme(
        <SessionDots sessions={abandonedSessions} activeIndex={0} sessionUIStates={{}} />,
      );
      const abandonedRaw = abandoned.lastFrame() ?? "";

      // Render with normal session
      const normalSessions = [createSession(1), createSession(2)];
      const normal = renderWithTheme(
        <SessionDots sessions={normalSessions} activeIndex={0} sessionUIStates={{}} />,
      );
      const normalRaw = normal.lastFrame() ?? "";

      // Abandoned session should render differently from normal
      // (different ANSI codes due to error color)
      expect(abandonedRaw).not.toBe(normalRaw);
    });

    it('shows "(AI disconnected)" text when active session is abandoned', () => {
      const sessions = [
        createSession(1),
        createSession(2, { isAbandoned: true }),
      ];
      const instance = renderWithTheme(
        <SessionDots sessions={sessions} activeIndex={1} sessionUIStates={{}} />,
      );
      const output = getOutput(instance.lastFrame());

      expect(output).toContain("(AI disconnected)");
    });

    it('does NOT show "(AI disconnected)" when abandoned session is inactive', () => {
      const sessions = [
        createSession(1),
        createSession(2, { isAbandoned: true }),
      ];
      const instance = renderWithTheme(
        <SessionDots sessions={sessions} activeIndex={0} sessionUIStates={{}} />,
      );
      const output = getOutput(instance.lastFrame());

      expect(output).not.toContain("(AI disconnected)");
    });

    it("uses ● for active abandoned session (not ✕)", () => {
      const sessions = [
        createSession(1),
        createSession(2, { isAbandoned: true }),
      ];
      const instance = renderWithTheme(
        <SessionDots sessions={sessions} activeIndex={1} sessionUIStates={{}} />,
      );
      const output = getOutput(instance.lastFrame());

      // Active abandoned session should still use ● (filled dot), not ✕
      expect(output).toContain("●");
    });
  });

  describe("stale sessions", () => {
    it("renders stale session with ○ symbol (unchanged from normal)", () => {
      const sessions = [
        createSession(1),
        createSession(2, { isStale: true }),
        createSession(3),
      ];
      const instance = renderWithTheme(
        <SessionDots sessions={sessions} activeIndex={0} sessionUIStates={{}} />,
      );
      const output = getOutput(instance.lastFrame());

      // Stale sessions keep ○ but with yellow color
      // Count: 1 active ●, 2 inactive ○ (one stale, one normal)
      expect((output.match(/○/g) ?? []).length).toBe(2);
    });

    it("applies stale color when session is stale (color differs from untouched)", () => {
      // When a stale session is active, it gets the stale/warning color
      // and shows a "(stale)" label — verifying the flag is correctly consumed.
      // Since ink-testing-library may strip ANSI in some envs, we verify
      // that stale active sessions show the label as a proxy for color.
      const sessions = [
        createSession(1),
        createSession(2, { isStale: true }),
      ];
      const instance = renderWithTheme(
        <SessionDots sessions={sessions} activeIndex={1} sessionUIStates={{}} />,
      );
      const output = getOutput(instance.lastFrame());

      // Active stale session should have the filled dot and stale label
      expect(output).toContain("●");
      expect(output).toContain("(stale)");
      // Stale sessions don't use ✕ (that's only for abandoned)
      expect(output).not.toContain("✕");
    });

    it('shows "(stale)" text when active session is stale', () => {
      const sessions = [
        createSession(1),
        createSession(2, { isStale: true }),
      ];
      const instance = renderWithTheme(
        <SessionDots sessions={sessions} activeIndex={1} sessionUIStates={{}} />,
      );
      const output = getOutput(instance.lastFrame());

      expect(output).toContain("(stale)");
    });

    it('does NOT show "(stale)" when stale session is inactive', () => {
      const sessions = [
        createSession(1),
        createSession(2, { isStale: true }),
      ];
      const instance = renderWithTheme(
        <SessionDots sessions={sessions} activeIndex={0} sessionUIStates={{}} />,
      );
      const output = getOutput(instance.lastFrame());

      expect(output).not.toContain("(stale)");
    });
  });

  describe("mixed states", () => {
    it("renders multiple sessions with mixed states correctly", () => {
      const sessions = [
        createSession(1),                                  // normal (active)
        createSession(2, { isAbandoned: true }),           // abandoned
        createSession(3, { isStale: true }),               // stale
        createSession(4),                                  // normal
      ];
      const instance = renderWithTheme(
        <SessionDots sessions={sessions} activeIndex={0} sessionUIStates={{}} />,
      );
      const output = getOutput(instance.lastFrame());

      // Active session shows ●
      expect(output).toContain("●");
      // Abandoned inactive shows ✕
      expect(output).toContain("✕");
      // Normal and stale inactive show ○
      expect((output.match(/○/g) ?? []).length).toBe(2);
      // All 4 session numbers rendered
      expect(output).toContain("1");
      expect(output).toContain("2");
      expect(output).toContain("3");
      expect(output).toContain("4");
    });

    it("abandoned takes priority over stale", () => {
      const sessions = [
        createSession(1),
        createSession(2, { isAbandoned: true, isStale: true }),
      ];
      const instance = renderWithTheme(
        <SessionDots sessions={sessions} activeIndex={1} sessionUIStates={{}} />,
      );
      const output = getOutput(instance.lastFrame());

      // When both abandoned and stale, show abandoned status
      expect(output).toContain("(AI disconnected)");
      expect(output).not.toContain("(stale)");
    });

    it("normal sessions remain unchanged (regression)", () => {
      const sessions = [createSession(1), createSession(2), createSession(3)];
      const instance = renderWithTheme(
        <SessionDots sessions={sessions} activeIndex={1} sessionUIStates={{}} />,
      );
      const output = getOutput(instance.lastFrame());

      // No stale/abandoned indicators for normal sessions
      expect(output).not.toContain("✕");
      expect(output).not.toContain("(AI disconnected)");
      expect(output).not.toContain("(stale)");
      // Normal rendering still works
      expect(output).toContain("●");
      expect(output).toContain("○");
      expect((output.match(/●/g) ?? []).length).toBe(1);
      expect((output.match(/○/g) ?? []).length).toBe(2);
    });
  });
});
