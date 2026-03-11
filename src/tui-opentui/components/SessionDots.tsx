import React from "react";

import type { SessionRequest } from "../../session/types.js";
import { useTheme } from "../ThemeProvider.js";
import type { Answer, SessionUIState } from "../../tui/shared/types.js";

/**
 * Lightweight session data shape used by the dots bar.
 * Mirrors the SessionData interface defined in bin/tui-app.tsx without
 * importing from the bin layer.
 */
export interface SessionDotsSessionData {
  sessionId: string;
  sessionRequest: SessionRequest;
  timestamp: Date;
  isStale?: boolean;
  isAbandoned?: boolean;
}

export interface SessionDotsProps {
  sessions: SessionDotsSessionData[];
  activeIndex: number;
  sessionUIStates: Record<string, SessionUIState | undefined>;
  onSelectIndex?: (index: number) => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/** Check whether at least one answer in the map has meaningful content. */
function hasAnswers(answers: Map<number, Answer> | undefined): boolean {
  if (!answers || answers.size === 0) return false;
  for (const ans of answers.values()) {
    if (ans.selectedOption || ans.customText) return true;
    if (ans.selectedOptions && ans.selectedOptions.length > 0) return true;
  }
  return false;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

/**
 * SessionDots — a compact row of numbered dots rendered below the footer.
 *
 * Visual language:
 *   ● 1  ○ 2  ✕ 3  ○ 4
 *
 * • Active session:     filled ● + bold number in theme primary
 * • Abandoned:          red ✕ + \"(AI disconnected)\" when active
 * • Stale:              yellow ○ + \"(stale)\" when active
 * • Has answers:        green (theme.success)
 * • Touched/no answers: yellow (theme.warning)
 * • Untouched:          dim   (theme.textDim)
 */
export const SessionDots: React.FC<SessionDotsProps> = ({
  sessions,
  activeIndex,
  sessionUIStates,
  onSelectIndex,
}) => {
  const { theme } = useTheme();

  // Don't render when fewer than 2 sessions
  if (sessions.length < 2) return null;

  return (
    <box style={{ flexDirection: "row", justifyContent: "center", paddingLeft: 2, paddingRight: 2 }}>
      {sessions.map((session, idx) => {
        const isActive = idx === activeIndex;
        const uiState = sessionUIStates[session.sessionId];

        const isStale = session.isStale ?? false;
        const isAbandoned = session.isAbandoned ?? false;

        // Determine the progress color for this session's dot
        // Abandoned/stale take priority over normal state colors
        let dotColor: string;
        if (isAbandoned) {
          dotColor =
            (theme.components.sessionDots as Record<string, string>)
              .abandoned ?? theme.colors.error;
        } else if (isStale) {
          dotColor =
            (theme.components.sessionDots as Record<string, string>)
              .stale ?? theme.colors.warning;
        } else if (isActive) {
          dotColor = theme.components.sessionDots.active;
        } else if (uiState && hasAnswers(uiState.answers)) {
          dotColor = theme.components.sessionDots.answered;
        } else if (uiState) {
          dotColor = theme.components.sessionDots.inProgress;
        } else {
          dotColor = theme.components.sessionDots.untouched;
        }

        // Abandoned inactive sessions use ✕ to signal a problem
        const dot = isAbandoned && !isActive
          ? "✕"
          : isActive
            ? "●"
            : "○";

        const numberColor = isActive
          ? theme.components.sessionDots.activeNumber
          : theme.components.sessionDots.number;

        // Status label shown next to active abandoned/stale sessions
        const statusLabel = isActive && isAbandoned
          ? "(AI disconnected)"
          : isActive && isStale
            ? "(stale)"
            : null;

        return (
          <box
            key={session.sessionId}
            style={{ flexDirection: "row", paddingRight: idx < sessions.length - 1 ? 1 : 0 }}
            onMouseDown={() => onSelectIndex?.(idx)}
          >
            <text style={{ fg: dotColor, bold: isActive }}>
              {dot}
            </text>
            <text style={{ fg: numberColor, bold: isActive }}>
              {` ${idx + 1}`}
            </text>
            {statusLabel ? (
              <text style={{ fg: dotColor, dim: true }}>
                {` ${statusLabel}`}
              </text>
            ) : null}
          </box>
        );
      })}
    </box>
  );
};
