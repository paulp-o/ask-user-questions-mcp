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
      // WaitingScreen calls useInput without options, so always capture
      if (!options || options.isActive !== false) {
        inputState.handler = handler;
      }
    },
  };
});

// Mock AnimatedGradient to avoid timer/animation side effects
vi.mock("../AnimatedGradient.js", () => ({
  AnimatedGradient: ({ text }: { text: string }) =>
    React.createElement("ink-text", null, text),
}));

import { ThemeContext } from "../../ThemeContext.js";
import { darkTheme } from "../../shared/themes/dark.js";
import { WaitingScreen } from "../WaitingScreen.js";

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

describe("WaitingScreen keyboard handling", () => {
  it("q key triggers quit", async () => {
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation((() => {}) as never);

    renderWithTheme(<WaitingScreen queueCount={0} />);
    expect(inputState.handler).not.toBeNull();

    inputState.handler!("q", {});
    await Promise.resolve();

    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it("Q key (uppercase) triggers quit (case-insensitive)", async () => {
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation((() => {}) as never);

    renderWithTheme(<WaitingScreen queueCount={0} />);
    expect(inputState.handler).not.toBeNull();

    inputState.handler!("Q", {});
    await Promise.resolve();

    expect(exitSpy).toHaveBeenCalledWith(0);
  });
});