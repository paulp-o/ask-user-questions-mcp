import { test, expect, describe } from "bun:test";
import { SyntaxStyle } from "@opentui/core";
import { generateSyntaxStyle } from "../syntaxStyle.js";
import { getTheme, listThemes } from "../../../tui/shared/themes/index.js";

describe("generateSyntaxStyle", () => {
  test("generates a SyntaxStyle object from AUQ dark theme", () => {
    const theme = getTheme("AUQ dark");
    expect(theme).toBeDefined();
    const style = generateSyntaxStyle(theme!);
    expect(style).toBeDefined();
    expect(typeof style).toBe("object");
  });

  test("generates a SyntaxStyle object from AUQ light theme", () => {
    const theme = getTheme("AUQ light");
    expect(theme).toBeDefined();
    const style = generateSyntaxStyle(theme!);
    expect(style).toBeDefined();
    expect(style).not.toBeNull();
  });

  test("generates a valid SyntaxStyle (instanceof SyntaxStyle)", () => {
    const theme = getTheme("AUQ dark");
    const style = generateSyntaxStyle(theme!);
    expect(style instanceof SyntaxStyle).toBe(true);
  });

  test("generates a SyntaxStyle from all built-in themes", () => {
    const themes = listThemes();
    expect(themes.length).toBeGreaterThan(0);
    for (const name of themes) {
      const theme = getTheme(name);
      expect(theme).toBeDefined();
      const style = generateSyntaxStyle(theme!);
      expect(style).toBeDefined();
      expect(style instanceof SyntaxStyle).toBe(true);
    }
  });

  test("generates distinct SyntaxStyle instances for different themes", () => {
    const darkTheme = getTheme("AUQ dark");
    const lightTheme = getTheme("AUQ light");
    const darkStyle = generateSyntaxStyle(darkTheme!);
    const lightStyle = generateSyntaxStyle(lightTheme!);
    // Different theme => different SyntaxStyle instances
    expect(darkStyle).not.toBe(lightStyle);
  });

  test("covers nord theme color tokens", () => {
    const theme = getTheme("nord");
    expect(theme).toBeDefined();
    const style = generateSyntaxStyle(theme!);
    expect(style instanceof SyntaxStyle).toBe(true);
  });

  test("covers dracula theme color tokens", () => {
    const theme = getTheme("dracula");
    expect(theme).toBeDefined();
    const style = generateSyntaxStyle(theme!);
    expect(style instanceof SyntaxStyle).toBe(true);
  });

  test("covers tokyo-night theme color tokens", () => {
    const theme = getTheme("tokyo-night");
    expect(theme).toBeDefined();
    const style = generateSyntaxStyle(theme!);
    expect(style instanceof SyntaxStyle).toBe(true);
  });
});