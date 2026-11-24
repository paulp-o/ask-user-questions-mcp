import React from "react";
import { cleanup, render } from "ink-testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { SessionRequest } from "../../../session/types.js";
import { ConfigProvider } from "../../ConfigContext.js";
import { ThemeContext } from "../../ThemeContext.js";
import type { SessionUIState } from "../../shared/types.js";
import { darkTheme } from "../../shared/themes/dark.js";
import { StepperView } from "../StepperView.js";

const mockThemeValue = {
  theme: darkTheme,
  themeName: "AUQ dark" as const,
  cycleTheme: () => {},
};

const sessionRequest: SessionRequest = {
  sessionId: "kbd-test-session",
  status: "pending",
  timestamp: new Date().toISOString(),
  callId: "call-kbd-1",
  questions: [
    {
      title: "Q1",
      prompt: "First question?",
      options: [{ label: "A" }, { label: "B" }],
      multiSelect: false,
    },
    {
      title: "Q2",
      prompt: "Second question?",
      options: [{ label: "C" }, { label: "D" }],
      multiSelect: false,
    },
    {
      title: "Q3",
      prompt: "Third question?",
      options: [{ label: "E" }, { label: "F" }],
      multiSelect: false,
    },
  ],
};

function stepperElement(
  props: Partial<React.ComponentProps<typeof StepperView>> = {},
) {
  return (
    <ThemeContext.Provider value={mockThemeValue}>
      <ConfigProvider>
        <StepperView
          sessionId={sessionRequest.sessionId}
          sessionRequest={sessionRequest}
          {...props}
        />
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}

function renderStepper(
  props: Partial<React.ComponentProps<typeof StepperView>> = {},
) {
  return render(stepperElement(props));
}

function getOutput(frame: string | undefined): string {
  // eslint-disable-next-line no-control-regex -- Terminal frames contain ANSI escapes.
  return (frame ?? "").replace(/\x1b\[[0-9;]*m/g, "").replace(/\r/g, "");
}

async function expectFocusedOption(
  onStateSnapshot: ReturnType<typeof vi.fn>,
  focusedOptionIndex: number,
) {
  await vi.waitFor(() => {
    const state = onStateSnapshot.mock.lastCall?.[1] as
      | SessionUIState
      | undefined;
    expect(state?.focusedOptionIndex).toBe(focusedOptionIndex);
  });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("StepperView keyboard shortcuts", () => {
  it("Escape shows rejection confirmation dialog", async () => {
    const instance = renderStepper();

    // Verify we start on question 1
    const output = getOutput(instance.lastFrame());
    expect(output).toContain("First question?");

    // Press Escape
    instance.stdin.write("\x1b");

    await vi.waitFor(() => {
      const out = getOutput(instance.lastFrame());
      expect(out).toContain("Reject");
    });
  });

  it("blocks rejection reason input and submission while inactive", async () => {
    const onComplete = vi.fn();
    const instance = renderStepper({ onComplete });

    instance.stdin.write("\x1b");
    await vi.waitFor(() => {
      expect(getOutput(instance.lastFrame())).toContain(
        "Are you sure you want to reject this question set?",
      );
    });

    instance.stdin.write("y");
    await vi.waitFor(() => {
      expect(getOutput(instance.lastFrame())).toContain(
        "Type your reason here...",
      );
    });

    instance.rerender(stepperElement({ isInputActive: false, onComplete }));
    instance.stdin.write("\x1b");
    instance.stdin.write("\r");
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(onComplete).not.toHaveBeenCalled();
    expect(getOutput(instance.lastFrame())).toContain(
      "Type your reason here...",
    );
  });

  it("Tab navigates to next question", async () => {
    const instance = renderStepper();

    // Verify starting on question 1
    const output = getOutput(instance.lastFrame());
    expect(output).toContain("First question?");

    // Press Tab to advance to Q2
    instance.stdin.write("\t");

    await vi.waitFor(() => {
      const out = getOutput(instance.lastFrame());
      expect(out).toContain("Second question?");
    });
  });

  it("Shift+Tab navigates to previous question", async () => {
    const onStateSnapshot = vi.fn();
    const instance = renderStepper({ onStateSnapshot });

    // First advance to Q2 with Tab
    instance.stdin.write("\t");

    await vi.waitFor(() => {
      const out = getOutput(instance.lastFrame());
      expect(out).toContain("Second question?");
    });

    // Press Shift+Tab (escape sequence for shift-tab in ink)
    instance.stdin.write("\x1b[Z");

    await vi.waitFor(() => {
      const out = getOutput(instance.lastFrame());
      expect(out).toContain("First question?");
    });
  });

  it("Tab does not navigate past the last question", async () => {
    const instance = renderStepper();

    // Navigate to Q3 (last question)
    instance.stdin.write("\t"); // Q1 -> Q2
    await vi.waitFor(() => {
      const out = getOutput(instance.lastFrame());
      expect(out).toContain("Second question?");
    });

    instance.stdin.write("\t"); // Q2 -> Q3
    await vi.waitFor(() => {
      const out = getOutput(instance.lastFrame());
      expect(out).toContain("Third question?");
    });

    // Tab again should stay on Q3 (clamped)
    instance.stdin.write("\t");
    await vi.waitFor(() => {
      const out = getOutput(instance.lastFrame());
      expect(out).toContain("Third question?");
    });
  });

  it("Shift+Tab does not navigate before the first question", async () => {
    const instance = renderStepper();

    // Verify on Q1
    const output = getOutput(instance.lastFrame());
    expect(output).toContain("First question?");

    // Press Shift+Tab at Q1 — should remain on Q1
    instance.stdin.write("\x1b[Z");

    // Allow state to settle
    await vi.waitFor(() => {
      const out = getOutput(instance.lastFrame());
      expect(out).toContain("First question?");
    });
  });

  it("emits onProgress when Tab advances question", async () => {
    const onProgress = vi.fn();
    const instance = renderStepper({ onProgress });

    // Tab to advance from Q1 to Q2
    instance.stdin.write("\t");

    await vi.waitFor(() => {
      // onProgress should be called with (answered=1, total=3)
      expect(onProgress).toHaveBeenCalledWith(1, 3);
    });
  });

  it("navigates options with bare j/k", async () => {
    const onStateSnapshot = vi.fn();
    const instance = renderStepper({ onStateSnapshot });

    instance.stdin.write("j");
    await expectFocusedOption(onStateSnapshot, 1);

    instance.stdin.write("k");
    await expectFocusedOption(onStateSnapshot, 0);
  });

  it("preserves custom input and blocks keys while inactive", async () => {
    const onStateSnapshot = vi.fn();
    const onAbandonedCancel = vi.fn();
    const instance = renderStepper({ onStateSnapshot, onAbandonedCancel });

    instance.stdin.write("j");
    await expectFocusedOption(onStateSnapshot, 1);
    instance.stdin.write("j");
    await expectFocusedOption(onStateSnapshot, 2);

    instance.stdin.write("j");
    await vi.waitFor(() => {
      const state = onStateSnapshot.mock.lastCall?.[1] as
        | SessionUIState
        | undefined;
      expect(state?.answers.get(0)?.customText).toBe("j");
      expect(state?.focusedOptionIndex).toBe(2);
    });

    instance.rerender(
      stepperElement({
        isInputActive: false,
        onStateSnapshot,
        onAbandonedCancel,
      }),
    );
    instance.stdin.write("k");
    instance.stdin.write("\x1b");
    await new Promise((resolve) => setTimeout(resolve, 50));

    const inactiveState = onStateSnapshot.mock.lastCall?.[1] as
      | SessionUIState
      | undefined;
    expect(inactiveState?.answers.get(0)?.customText).toBe("j");
    expect(inactiveState?.focusedOptionIndex).toBe(2);
    expect(getOutput(instance.lastFrame())).not.toContain("Reject Questions?");
    expect(onAbandonedCancel).not.toHaveBeenCalled();

    instance.rerender(
      stepperElement({
        isInputActive: true,
        onStateSnapshot,
        onAbandonedCancel,
      }),
    );
    instance.stdin.write("k");
    await vi.waitFor(() => {
      const state = onStateSnapshot.mock.lastCall?.[1] as
        | SessionUIState
        | undefined;
      expect(state?.answers.get(0)?.customText).toBe("jk");
      expect(state?.focusedOptionIndex).toBe(2);
    });
  });
});