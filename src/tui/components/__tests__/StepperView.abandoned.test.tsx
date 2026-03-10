import React from "react";
import { cleanup, render } from "ink-testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { SessionRequest } from "../../../session/types.js";
import { ConfigProvider } from "../../ConfigContext.js";
import { ThemeContext } from "../../ThemeContext.js";
import { darkTheme } from "../../themes/dark.js";
import { StepperView } from "../StepperView.js";

const mockThemeValue = {
  theme: darkTheme,
  themeName: "AUQ dark" as const,
  cycleTheme: () => {},
};

const sessionRequest: SessionRequest = {
  sessionId: "abandoned-test-session",
  status: "pending",
  timestamp: new Date().toISOString(),
  callId: "call-abandoned-1",
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

describe("StepperView abandoned session confirmation", () => {
  it("shows abandoned confirmation dialog when isAbandoned is true", async () => {
    const instance = renderStepper({ isAbandoned: true });

    await vi.waitFor(() => {
      const output = getOutput(instance.lastFrame());
      expect(output).toContain("AI Disconnected");
    });

    const output = getOutput(instance.lastFrame());
    expect(output).toContain("Answer anyway");
    expect(output).toContain("Cancel");
    // Should NOT show question content behind the dialog
    expect(output).not.toContain("Pick a language");
  });

  it("does not show abandoned dialog when isAbandoned is false", () => {
    const instance = renderStepper({ isAbandoned: false });
    const output = getOutput(instance.lastFrame());

    expect(output).not.toContain("AI Disconnected");
    expect(output).toContain("Pick a language");
  });

  it("does not show abandoned dialog when isAbandoned is undefined", () => {
    const instance = renderStepper();
    const output = getOutput(instance.lastFrame());

    expect(output).not.toContain("AI Disconnected");
    expect(output).toContain("Pick a language");
  });

  it("selecting 'Answer anyway' dismisses dialog and shows questions", async () => {
    const instance = renderStepper({ isAbandoned: true });

    await vi.waitFor(() => {
      const output = getOutput(instance.lastFrame());
      expect(output).toContain("AI Disconnected");
    });

    // Press Enter to select the first option ("Answer anyway")
    instance.stdin.write("\r");

    await vi.waitFor(() => {
      const output = getOutput(instance.lastFrame());
      expect(output).toContain("Pick a language");
    });

    const output = getOutput(instance.lastFrame());
    expect(output).not.toContain("AI Disconnected");
  });

  it("selecting 'Cancel' calls onAbandonedCancel", async () => {
    const onAbandonedCancel = vi.fn();
    const instance = renderStepper({
      isAbandoned: true,
      onAbandonedCancel,
    });

    await vi.waitFor(() => {
      const output = getOutput(instance.lastFrame());
      expect(output).toContain("AI Disconnected");
    });

    // Navigate down to "Cancel" then press Enter
    // Use OA/OB sequences which ink reliably parses as arrows
    instance.stdin.write("\x1bOB"); // Down arrow (application mode)

    await new Promise((r) => setTimeout(r, 100));

    // Press Enter to select "Cancel"
    instance.stdin.write("\r");

    await vi.waitFor(() => {
      expect(onAbandonedCancel).toHaveBeenCalledOnce();
    });
  });

  it("pressing Escape calls onAbandonedCancel", async () => {
    const onAbandonedCancel = vi.fn();
    const instance = renderStepper({
      isAbandoned: true,
      onAbandonedCancel,
    });

    await vi.waitFor(() => {
      const output = getOutput(instance.lastFrame());
      expect(output).toContain("AI Disconnected");
    });

    // Press Escape
    instance.stdin.write("\x1b");

    await vi.waitFor(() => {
      expect(onAbandonedCancel).toHaveBeenCalledOnce();
    });
  });

  it("after confirming, dialog does not reappear for the same session", async () => {
    const instance = renderStepper({ isAbandoned: true });

    // Wait for dialog
    await vi.waitFor(() => {
      expect(getOutput(instance.lastFrame())).toContain("AI Disconnected");
    });

    // Confirm ("Answer anyway")
    instance.stdin.write("\r");

    // Wait for questions to appear
    await vi.waitFor(() => {
      expect(getOutput(instance.lastFrame())).toContain("Pick a language");
    });

    // The dialog should stay dismissed - verify questions are still shown
    const output = getOutput(instance.lastFrame());
    expect(output).toContain("Pick a language");
    expect(output).not.toContain("AI Disconnected");
  });

  it("emits showAbandonedConfirm in onFlowStateChange", async () => {
    const onFlowStateChange = vi.fn();
    renderStepper({
      isAbandoned: true,
      onFlowStateChange,
    });

    await vi.waitFor(() => {
      expect(onFlowStateChange).toHaveBeenCalledWith(
        expect.objectContaining({ showAbandonedConfirm: true }),
      );
    });
  });

  it("blocks keyboard navigation while dialog is shown", async () => {
    const instance = renderStepper({ isAbandoned: true });

    await vi.waitFor(() => {
      expect(getOutput(instance.lastFrame())).toContain("AI Disconnected");
    });

    // Try Tab to navigate questions - should do nothing
    instance.stdin.write("\t");

    // Dialog should still be shown
    await vi.waitFor(() => {
      const output = getOutput(instance.lastFrame());
      expect(output).toContain("AI Disconnected");
      expect(output).not.toContain("Pick a language");
    });
  });
});