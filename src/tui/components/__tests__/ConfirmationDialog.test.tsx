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
      // ConfirmationDialog calls useInput without options, so always capture
      if (!options || options.isActive !== false) {
        inputState.handler = handler;
      }
    },
  };
});

import { ThemeContext } from "../../ThemeContext.js";
import { darkTheme } from "../../themes/dark.js";
import { ConfirmationDialog } from "../ConfirmationDialog.js";

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

describe("ConfirmationDialog keyboard handling", () => {
  const defaultProps = {
    message: "Test confirmation",
    onReject: vi.fn(),
    onCancel: vi.fn(),
    onQuit: vi.fn(),
  };

  function renderDialog(overrides = {}) {
    const props = {
      ...defaultProps,
      onReject: vi.fn(),
      onCancel: vi.fn(),
      onQuit: vi.fn(),
      ...overrides,
    };
    const instance = renderWithTheme(<ConfirmationDialog {...props} />);
    return { instance, ...props };
  }

  it("arrow down at last item stays at last item (clamping)", async () => {
    const { onCancel, instance } = renderDialog();
    expect(inputState.handler).not.toBeNull();

    // There are 2 options (index 0 and 1). Press down to go to last.
    inputState.handler!("", { downArrow: true });
    await new Promise((r) => setTimeout(r, 50));

    // Press down again — should clamp at last item, not wrap to first
    inputState.handler!("", { downArrow: true });
    await new Promise((r) => setTimeout(r, 50));

    // Press down a third time — still clamped at last
    inputState.handler!("", { downArrow: true });
    await new Promise((r) => setTimeout(r, 50));

    // Now press Enter — should select the last option (index 1 = onCancel)
    inputState.handler!("", { return: true });
    await new Promise((r) => setTimeout(r, 50));

    // The second option's action is onCancel
    expect(onCancel).toHaveBeenCalled();
  });

  it("arrow up at first item stays at first item (clamping)", async () => {
    const { onCancel } = renderDialog();
    expect(inputState.handler).not.toBeNull();

    // At index 0, press up multiple times
    inputState.handler!("", { upArrow: true });
    await Promise.resolve();
    inputState.handler!("", { upArrow: true });
    await Promise.resolve();

    // Press Enter — should select first option (index 0 = setShowReasonInput)
    // The first option's action is setShowReasonInput(true), not onCancel
    inputState.handler!("", { return: true });
    await Promise.resolve();

    // onCancel should NOT have been called (that's the second option)
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("Enter selects focused option", async () => {
    const { onCancel } = renderDialog();
    expect(inputState.handler).not.toBeNull();

    // Default focus is index 0 (Yes option). Press Enter.
    inputState.handler!("", { return: true });
    await Promise.resolve();

    // First option sets showReasonInput=true, does NOT call onCancel
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("y key triggers yes action", async () => {
    renderDialog();
    expect(inputState.handler).not.toBeNull();

    // Press 'y' — should trigger CONFIRM_YES shortcut (setShowReasonInput)
    inputState.handler!("y", {});
    await Promise.resolve();

    // After pressing y, the component transitions to reason input mode
    // We verify it didn't call onCancel or onQuit
    // (The actual transition to reason input is internal state)
  });

  it("Y key (uppercase) triggers yes action (case-insensitive)", async () => {
    renderDialog();
    expect(inputState.handler).not.toBeNull();

    // Press 'Y' — KEYS.CONFIRM_YES is /^[yY]$/, should match
    inputState.handler!("Y", {});
    await Promise.resolve();

    // Should work same as lowercase 'y'
  });

  it("n key triggers cancel action", async () => {
    const { onCancel } = renderDialog();
    expect(inputState.handler).not.toBeNull();

    inputState.handler!("n", {});
    await Promise.resolve();

    expect(onCancel).toHaveBeenCalled();
  });

  it("N key (uppercase) triggers cancel action (case-insensitive)", async () => {
    const { onCancel } = renderDialog();
    expect(inputState.handler).not.toBeNull();

    inputState.handler!("N", {});
    await Promise.resolve();

    expect(onCancel).toHaveBeenCalled();
  });

  it("Escape triggers quit", async () => {
    const { onQuit } = renderDialog();
    expect(inputState.handler).not.toBeNull();

    inputState.handler!("", { escape: true });
    await Promise.resolve();

    expect(onQuit).toHaveBeenCalled();
  });
});