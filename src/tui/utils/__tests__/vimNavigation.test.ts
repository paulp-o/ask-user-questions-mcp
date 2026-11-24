import { describe, expect, it } from "vitest";

import { getVimNavigationDirection } from "../../shared/utils/vimNavigation.js";

describe("getVimNavigationDirection", () => {
  it.each([
    ["j", "down"],
    ["k", "up"],
  ] as const)("maps bare %s to %s outside text input", (input, direction) => {
    expect(getVimNavigationDirection(input, {}, false)).toBe(direction);
  });

  it.each(["j", "k"])("leaves %s as text while editing", (input) => {
    expect(getVimNavigationDirection(input, {}, true)).toBeNull();
  });

  it.each([
    { ctrl: true },
    { hyper: true },
    { meta: true },
    { shift: true },
    { super: true },
  ])("rejects modified j/k with %s", (modifiers) => {
    expect(getVimNavigationDirection("j", modifiers, false)).toBeNull();
    expect(getVimNavigationDirection("k", modifiers, false)).toBeNull();
  });

  it.each(["J", "K", "h", "l", "jj", ""])(
    "does not map non-bare input %s",
    (input) => {
      expect(getVimNavigationDirection(input, {}, false)).toBeNull();
    },
  );
});
