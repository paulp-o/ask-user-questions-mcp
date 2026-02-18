import React from "react";
import { cleanup, render } from "ink-testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ThemeContext } from "../../ThemeContext.js";
import { darkTheme } from "../../themes/dark.js";
import { MarkdownPrompt } from "../MarkdownPrompt.js";

const mockThemeValue = {
  theme: darkTheme,
  themeName: "AUQ dark" as const,
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

function compact(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("MarkdownPrompt", () => {
  it("renders plain text unchanged", () => {
    const text = "Choose one option";
    const instance = renderWithTheme(<MarkdownPrompt text={text} />);

    expect(compact(getOutput(instance.lastFrame()))).toBe(text);
  });

  it("renders core inline markdown without raw markers", () => {
    const text = "**bold** *italic* `code` ~~strike~~";
    const instance = renderWithTheme(<MarkdownPrompt text={text} />);
    const output = getOutput(instance.lastFrame());

    expect(output).toContain("bold");
    expect(output).toContain("italic");
    expect(output).toContain("code");
    expect(output).toContain("strike");
    expect(output).not.toContain("**");
    expect(output).not.toContain("~~");
    expect(output).not.toContain("`code`");
  });

  it("keeps inline-only markdown in inline flow without extra block spacing", () => {
    const text = "Hello **there** with `inline` markdown";
    const instance = renderWithTheme(<MarkdownPrompt text={text} />);
    const output = getOutput(instance.lastFrame());

    expect(output).not.toContain("\n\n");
    expect(compact(output)).toContain("Hello there with inline markdown");
  });

  it("renders links as text followed by URL in parentheses", () => {
    const text = "Read [docs](https://example.com/docs) now";
    const instance = renderWithTheme(<MarkdownPrompt text={text} />);

    expect(compact(getOutput(instance.lastFrame()))).toContain(
      "Read docs (https://example.com/docs) now",
    );
  });

  it("renders fenced code blocks as distinct multi-line block content", () => {
    const text = "Before\n\n```ts\nconst x = 1;\n```\n\nAfter";
    const instance = renderWithTheme(<MarkdownPrompt text={text} />);
    const output = getOutput(instance.lastFrame());

    expect(output).toContain("Before");
    expect(output).toContain("const x = 1;");
    expect(output).toContain("After");
    expect(output.split("\n").length).toBeGreaterThan(2);
  });

  it("handles empty and whitespace-only inputs without crashing", () => {
    const empty = renderWithTheme(<MarkdownPrompt text="" />);
    const spaces = renderWithTheme(<MarkdownPrompt text="   " />);

    expect(getOutput(empty.lastFrame())).toBe("");
    expect(getOutput(spaces.lastFrame())).toBe("");
  });

  it("normalizes CRLF content during rendering", () => {
    const text = "Line1\r\nLine2\r\n**Bold**";
    const instance = renderWithTheme(<MarkdownPrompt text={text} />);
    const output = getOutput(instance.lastFrame());

    expect(output).not.toContain("\r");
    expect(output).toContain("Line1");
    expect(output).toContain("Line2");
    expect(output).toContain("Bold");
  });

  it("renders nested inline markdown content", () => {
    const text = "**bold and *italic* with `code`**";
    const instance = renderWithTheme(<MarkdownPrompt text={text} />);
    const output = getOutput(instance.lastFrame());

    expect(output).toContain("bold and");
    expect(output).toContain("italic");
    expect(output).toContain("code");
    expect(output).not.toContain("**");
    expect(output).not.toContain("`code`");
  });

  it("does not crash on malformed markdown", () => {
    const malformed = "Broken [link](https://example.com and **mixed";

    expect(() =>
      renderWithTheme(<MarkdownPrompt text={malformed} />),
    ).not.toThrow();

    const instance = renderWithTheme(<MarkdownPrompt text={malformed} />);
    const output = getOutput(instance.lastFrame());
    expect(output.length).toBeGreaterThan(0);
  });
});
