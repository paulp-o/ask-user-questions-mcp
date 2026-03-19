import React from "react";

import { useTheme } from "../ThemeProvider.js";

interface UpdateBadgeProps {
  /** Type of update based on semver comparison */
  updateType: "patch" | "minor" | "major";
  /** Latest available version string, e.g. "2.5.0" */
  latestVersion: string;
}

/**
 * UpdateBadge — compact header indicator when a new version is available.
 *
 * Color-coding by severity:
 *   patch  → success (green)  — minor fix
 *   minor  → warning (yellow) — new features
 *   major  → error  (red)     — possible breaking changes
 */
export const UpdateBadge: React.FC<UpdateBadgeProps> = ({
  updateType,
  latestVersion,
}) => {
  const { theme } = useTheme();

  const colorMap: Record<string, string> = {
    patch: theme.colors.success,
    minor: theme.colors.warning,
    major: theme.colors.error,
  };

  const color = colorMap[updateType] ?? theme.colors.info;

  // Patch updates are concise; minor/major show the target version
  const label =
    updateType === "patch"
      ? "↑ Update"
      : `↑ v${latestVersion}`;

  return (
    <box style={{ marginLeft: 1 }}>
      <text style={{ bg: color, fg: "#000000", bold: true }}>
        {` ${label} `}
      </text>
    </box>
  );
};
