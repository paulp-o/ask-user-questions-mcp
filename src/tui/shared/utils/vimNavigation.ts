export interface VimNavigationModifiers {
  ctrl?: boolean;
  hyper?: boolean;
  meta?: boolean;
  shift?: boolean;
  super?: boolean;
}

export type VimNavigationDirection = "down" | "up";

/**
 * Map only bare j/k to navigation. Arrow keys remain renderer-specific, and
 * modified or uppercase keys must keep their existing shortcuts/text behavior.
 */
export function getVimNavigationDirection(
  input: string,
  modifiers: VimNavigationModifiers,
  isInTextInput: boolean,
): VimNavigationDirection | null {
  if (
    isInTextInput ||
    modifiers.ctrl ||
    modifiers.hyper ||
    modifiers.meta ||
    modifiers.shift ||
    modifiers.super
  ) {
    return null;
  }

  if (input === "j") return "down";
  if (input === "k") return "up";
  return null;
}
