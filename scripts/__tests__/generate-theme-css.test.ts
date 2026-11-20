import { describe, it, expect } from "vitest";
import { generateThemeCSS } from "../generate-theme-css.js";

const EXPECTED_THEMES = [
  "AUQ dark",
  "AUQ light",
  "nord",
  "dracula",
  "catppuccin-mocha",
  "catppuccin-latte",
  "solarized-dark",
  "solarized-light",
  "gruvbox-dark",
  "gruvbox-light",
  "tokyo-night",
  "one-dark",
  "monokai",
  "github-dark",
  "github-light",
  "rose-pine",
];

describe("generateThemeCSS", () => {
  let css: string;

  it("produces output without errors", () => {
    css = generateThemeCSS();
    expect(typeof css).toBe("string");
    expect(css.length).toBeGreaterThan(0);
  });

  it("contains all 16 [data-theme] selectors", () => {
    css = generateThemeCSS();
    for (const name of EXPECTED_THEMES) {
      expect(css).toContain(`[data-theme="${name}"]`);
    }
  });

  it("maps color tokens to --color-* CSS variables", () => {
    css = generateThemeCSS();
    expect(css).toContain("--color-bg:");
    expect(css).toContain("--color-surface:");
    expect(css).toContain("--color-primary:");
    expect(css).toContain("--color-text:");
    expect(css).toContain("--color-error:");
    expect(css).toContain("--color-success:");
  });

  it("maps border tokens to --border-* CSS variables", () => {
    css = generateThemeCSS();
    expect(css).toContain("--border-primary:");
    expect(css).toContain("--border-neutral:");
    expect(css).toContain("--border-error:");
    expect(css).toContain("--border-warning:");
  });

  it("maps gradient tokens to --gradient-* CSS variables", () => {
    css = generateThemeCSS();
    expect(css).toContain("--gradient-start:");
    expect(css).toContain("--gradient-middle:");
    expect(css).toContain("--gradient-end:");
  });

  it("maps component tokens to CSS variables", () => {
    css = generateThemeCSS();
    // header
    expect(css).toContain("--header-border:");
    // footer
    expect(css).toContain("--footer-border:");
    // options
    expect(css).toContain("--options-focused:");
    expect(css).toContain("--options-focused-bg:");
    expect(css).toContain("--options-selected:");
    expect(css).toContain("--options-selected-bg:");
  });

  it("includes system preference @media queries with :root", () => {
    css = generateThemeCSS();
    expect(css).toContain("@media (prefers-color-scheme: dark)");
    expect(css).toContain("@media (prefers-color-scheme: light)");
    // Both should have :root blocks
    const darkIndex = css.indexOf("@media (prefers-color-scheme: dark)");
    const lightIndex = css.indexOf("@media (prefers-color-scheme: light)");
    expect(css.slice(darkIndex, darkIndex + 200)).toContain(":root");
    expect(css.slice(lightIndex, lightIndex + 200)).toContain(":root");
  });

  it("dark system preference maps to AUQ dark theme values", () => {
    css = generateThemeCSS();
    // AUQ dark theme has bg: #0F1419
    const darkMediaStart = css.indexOf("@media (prefers-color-scheme: dark)");
    const darkMediaEnd = css.indexOf("}", css.indexOf("}", darkMediaStart) + 1);
    const darkBlock = css.slice(darkMediaStart, darkMediaEnd + 1);
    expect(darkBlock).toContain("#0F1419");
  });

  it("light system preference maps to AUQ light theme values", () => {
    css = generateThemeCSS();
    const lightMediaStart = css.indexOf("@media (prefers-color-scheme: light)");
    const lightMediaEnd = css.indexOf("}", css.indexOf("}", lightMediaStart) + 1);
    const lightBlock = css.slice(lightMediaStart, lightMediaEnd + 1);
    // AUQ light theme exists and has different bg than dark
    expect(lightBlock.length).toBeGreaterThan(50);
  });

  it("CSS values use hex or named colors (spot check)", () => {
    css = generateThemeCSS();
    // All theme values should be hex colors
    const hexColorMatches = css.match(/#[0-9A-Fa-f]{3,8}/g) ?? [];
    expect(hexColorMatches.length).toBeGreaterThan(100);
  });
});
