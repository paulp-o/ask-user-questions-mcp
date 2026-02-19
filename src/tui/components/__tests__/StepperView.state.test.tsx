import React from "react";
import { cleanup, render } from "ink-testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { SessionRequest } from "../../../session/types.js";
import { ConfigProvider } from "../../ConfigContext.js";
import { ThemeContext } from "../../ThemeContext.js";
import type { SessionUIState } from "../../types.js";
import { darkTheme } from "../../themes/dark.js";
import { StepperView } from "../StepperView.js";

const mockThemeValue = {
  theme: darkTheme,
  themeName: "AUQ dark" as const,
  cycleTheme: () => {},
};

const sessionRequest: SessionRequest = {
  sessionId: "session-1",
  status: "pending",
  timestamp: new Date().toISOString(),
  callId: "call-1",
  questions: [
    {
      title: "Language",
      prompt: "Pick a language",
      options: [{ label: "TypeScript" }, { label: "Python" }],
    },
    {
      title: "Framework",
      prompt: "Pick a framework",
      options: [{ label: "React" }, { label: "Vue" }],
    },
    {
      title: "Runtime",
      prompt: "Pick a runtime",
      options: [{ label: "Bun" }, { label: "Node.js" }],
    },
  ],
};

function renderStepper(
  props: Partial<React.ComponentProps<typeof StepperView>> = {},
) {
  return render(
    <ThemeContext.Provider value={mockThemeValue}>
      <ConfigProvider>
        <StepperView
          sessionId={sessionRequest.sessionId}
          sessionRequest={sessionRequest}
          {...props}
        />
      </ConfigProvider>
    </ThemeContext.Provider>,
  );
}

function getOutput(frame: string | undefined): string {
  return (frame ?? "").replace(/\x1b\[[0-9;]*m/g, "").replace(/\r/g, "");
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("StepperView SessionUIState boundary", () => {
  it("hydrates from initialState and starts on the hydrated question", async () => {
    const initialState: SessionUIState = {
      currentQuestionIndex: 1,
      answers: new Map([[0, { selectedOption: "TypeScript" }]]),
      elaborateMarks: new Map([[0, "Please elaborate"]]),
      focusContext: "option",
      focusedOptionIndex: 1,
      showReview: false,
    };

    const instance = renderStepper({ initialState });
    await vi.waitFor(() => {
      const hydratedOutput = getOutput(instance.lastFrame());
      expect(hydratedOutput).toContain("Pick a framework");
    });

    const output = getOutput(instance.lastFrame());

    expect(output).not.toContain("Pick a language");
    expect(output).toContain("1/3");
  });

  it("uses default state when no initialState is provided", () => {
    const instance = renderStepper();
    const output = getOutput(instance.lastFrame());

    expect(output).toContain("Pick a language");
    expect(output).not.toContain("Pick a framework");
    expect(output).toContain("0/3");
  });

  it("emits snapshot after state change and skips initial mount emission", async () => {
    const onStateSnapshot = vi.fn();
    const instance = renderStepper({ onStateSnapshot });

    expect(onStateSnapshot).not.toHaveBeenCalled();

    instance.stdin.write("\t");

    await vi.waitFor(() => {
      expect(onStateSnapshot).toHaveBeenCalled();
    });

    const [sessionId, state] = onStateSnapshot.mock.lastCall as [
      string,
      SessionUIState,
    ];

    expect(sessionId).toBe("session-1");
    expect(state.currentQuestionIndex).toBe(1);
    expect(state.focusContext).toBe("option");
    expect(state.showReview).toBe(false);
    expect(state.answers).toBeInstanceOf(Map);
    expect(state.elaborateMarks).toBeInstanceOf(Map);
  });

  it("emits initial flow state via onFlowStateChange", async () => {
    const onFlowStateChange = vi.fn();
    renderStepper({ onFlowStateChange });

    await vi.waitFor(() => {
      expect(onFlowStateChange).toHaveBeenCalled();
    });

    expect(onFlowStateChange).toHaveBeenCalledWith({
      showReview: false,
      showRejectionConfirm: false,
    });
  });
});
