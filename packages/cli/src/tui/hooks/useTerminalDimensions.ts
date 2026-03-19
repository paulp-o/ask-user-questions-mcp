import { useTerminalDimensions as useOpenTUIDimensions } from "@opentui/react";

/**
 * Hook that returns the current terminal dimensions.
 * Wraps OpenTUI's useTerminalDimensions for use in OpenTUI components.
 */
export function useTerminalDimensions(): { width: number; height: number } {
  return useOpenTUIDimensions();
}