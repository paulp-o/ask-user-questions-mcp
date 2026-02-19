import { Box, Text } from "ink";
import React from "react";

import type { SessionRequest } from "../../session/types.js";
import { useTheme } from "../ThemeContext.js";
import type { Answer, SessionUIState } from "../types.js";

/**
 * Lightweight session data shape used by the dots bar.
 * Mirrors the SessionData interface defined in bin/tui-app.tsx without
 * importing from the bin layer.
 */
export interface SessionDotsSessionData {
  sessionId: string;
  sessionRequest: SessionRequest;
  timestamp: Date;
}

export interface SessionDotsProps {
  sessions: SessionDotsSessionData[];
  activeIndex: number;
  sessionUIStates: Record<string, SessionUIState | undefined>;
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
 *   ● 1  ○ 2  ○ 3
 *
 * • Active session:   filled ● + bold number in theme primary
 * • Has answers:      green (theme.success)
 * • Touched/no answers: yellow (theme.warning)
 * • Untouched:        dim   (theme.textDim)
 */
export const SessionDots: React.FC<SessionDotsProps> = ({
  sessions,
  activeIndex,
  sessionUIStates,
}) => {
  const { theme } = useTheme();

  // Don't render when fewer than 2 sessions
  if (sessions.length < 2) return null;

  return (
    <Box justifyContent="center" paddingX={1}>
      {sessions.map((session, idx) => {
        const isActive = idx === activeIndex;
        const uiState = sessionUIStates[session.sessionId];

        // Determine the progress color for this session's dot
        let dotColor: string;
        if (isActive) {
          dotColor = theme.components.sessionDots.active;
        } else if (uiState && hasAnswers(uiState.answers)) {
          dotColor = theme.components.sessionDots.answered;
        } else if (uiState) {
          dotColor = theme.components.sessionDots.inProgress;
        } else {
          dotColor = theme.components.sessionDots.untouched;
        }

        const dot = isActive ? "●" : "○";
        const numberColor = isActive
          ? theme.components.sessionDots.activeNumber
          : theme.components.sessionDots.number;

        return (
          <Box
            key={session.sessionId}
            paddingRight={idx < sessions.length - 1 ? 1 : 0}
          >
            <Text color={dotColor} bold={isActive}>
              {dot}
            </Text>
            <Text color={numberColor} bold={isActive}>
              {" "}
              {idx + 1}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
};
