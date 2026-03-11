import React from "react";
import { cleanup, render } from "ink-testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { SessionRequest } from "../../../session/types.js";
import { ConfigProvider } from "../../ConfigContext.js";
import { ThemeContext } from "../../ThemeContext.js";
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

describe("StepperView keyboard shortcuts", () => {
  it("Escape shows rejection confirmation dialog", async () => {
    const instance = renderStepper();

    // Verify we start on question 1
    let output = getOutput(instance.lastFrame());
    expect(output).toContain("First question?");

    // Press Escape
    instance.stdin.write("\x1b");

    await vi.waitFor(() => {
      const out = getOutput(instance.lastFrame());
      expect(out).toContain("Reject");
    });
  });

  it("Tab navigates to next question", async () => {
    const instance = renderStepper();

    // Verify starting on question 1
    let output = getOutput(instance.lastFrame());
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
    let output = getOutput(instance.lastFrame());
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
});