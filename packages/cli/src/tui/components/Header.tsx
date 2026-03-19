import React, { useEffect, useMemo, useState } from "react";

import { t } from "../../i18n/index.js";
import packageJson from "../../../package.json" with { type: "json" };
import { useTheme } from "../ThemeProvider.js";
import { UpdateBadge as _UpdateBadge } from "./UpdateBadge.js";

interface HeaderProps {
  pendingCount: number;
  isCheckingUpdate?: boolean;
  updateInfo?: {
    updateType: "patch" | "minor" | "major";
    latestVersion: string;
  } | null;
  onUpdateBadgeActivate?: () => void;
}

// Cast to FC to avoid React type mismatch between @opentui/react bundled React
// and the project's @types/react (structural type incompatibility).
const UpdateBadge = _UpdateBadge as unknown as (props: {
  updateType: "patch" | "minor" | "major";
  latestVersion: string;
}) => React.ReactElement | null;

/**
 * Header component — displays app logo and status.
 * Shows at the top of the TUI with solid accent branding and live-updating
 * pending queue count pill.
 */
export const Header: React.FC<HeaderProps> = ({
  pendingCount,
  isCheckingUpdate,
  updateInfo,
  onUpdateBadgeActivate: _onUpdateBadgeActivate,
}) => {
  const { theme } = useTheme();
  const [flash, setFlash] = useState(false);
  const [prevCount, setPrevCount] = useState(pendingCount);

  // Flash effect when count changes
  useEffect(() => {
    if (pendingCount !== prevCount) {
      setFlash(true);
      setPrevCount(pendingCount);
      const timer = setTimeout(() => setFlash(false), 300);
      return () => clearTimeout(timer);
    }
  }, [pendingCount, prevCount]);

  const version = useMemo(() => {
    return packageJson.version || "unknown";
  }, []);

  const tagline = t("header.title");

  // Queue pill color: flash > active > empty
  const queueColor = flash
    ? theme.components.header.queueFlash
    : pendingCount > 0
      ? theme.components.header.queueActive
      : theme.components.header.queueEmpty;

  const queueLabel = pendingCount > 0
    ? ` ${pendingCount} queued `
    : " idle ";

  return (
    <box
      style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 2, paddingRight: 2, border: true, borderStyle: "rounded", borderColor: theme.colors.surface }}
    >
      {/* Left: logo + tagline */}
      <box style={{ flexDirection: "row", alignItems: "center" }}>
        <text style={{ bold: true, fg: theme.colors.primary }}>AUQ</text>
        <text style={{ fg: theme.colors.textDim }}>{` ⋆ ${tagline}`}</text>
      </box>

      {/* Right: version + update badge + queue pill */}
      <box style={{ flexDirection: "row", alignItems: "center" }}>
        <text style={{ fg: theme.colors.textDim }}>{`v${version}`}</text>
        {updateInfo ? (
          <UpdateBadge
            updateType={updateInfo.updateType}
            latestVersion={updateInfo.latestVersion}
          />
        ) : null}
        <text style={{ fg: theme.colors.textDim }}> </text>
        {isCheckingUpdate ? (
          <text style={{ fg: theme.colors.textDim }}> checking... </text>
        ) : null}
        <text
          style={{
            bg: theme.components.header.pillBg,
            fg: queueColor,
            bold: flash,
          }}
        >
          {queueLabel}
        </text>
      </box>
    </box>
  );
};
