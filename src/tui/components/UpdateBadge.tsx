import { Box, Text } from "ink";
import React from "react";

import { useTheme } from "../ThemeContext.js";

interface UpdateBadgeProps {
  /** Type of update based on semver comparison */
  updateType: "patch" | "minor" | "major";
  /** Latest available version string, e.g. "2.5.0" */
  latestVersion: string;
}

/**
 * UpdateBadge — compact header indicator shown when a new version is available.
 *
 * Color-coding by severity:
 *   patch  → success (green)  — minor fix, can auto-install
 *   minor  → warning (yellow) — new features
 *   major  → error  (red)     — possible breaking changes
 *
 * Rendered inside Header next to the version text.
 */
export const UpdateBadge: React.FC<UpdateBadgeProps> = ({
  updateType,
  latestVersion,
}) => {
  const { theme } = useTheme();

  // Map update severity to theme colors
  const colorMap: Record<string, string> = {
    patch: theme.colors.success,
    minor: theme.colors.warning,
    major: theme.colors.error,
  };

  const color = colorMap[updateType] ?? theme.colors.info;

  // Patch updates are concise (they auto-install); minor/major show the target version
  const label =
    updateType === "patch"
      ? "↑ Update"
      : `↑ v${latestVersion}`;

  return (
    <Box marginLeft={1}>
      <Text backgroundColor={color} bold color="#000000">
        {` ${label} `}
      </Text>
    </Box>
  );
};
