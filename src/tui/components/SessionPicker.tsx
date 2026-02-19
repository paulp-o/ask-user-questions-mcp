import { Box, Text, useInput, useStdout } from "ink";
import React, { useEffect, useState } from "react";

import type { SessionRequest } from "../../session/types.js";
import { useTheme } from "../ThemeContext.js";
import type { Answer, SessionUIState } from "../types.js";
import { formatRelativeTime } from "../utils/relativeTime.js";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

/**
 * Lightweight session data shape used by the picker.
 * Mirrors the SessionData interface defined in bin/tui-app.tsx.
 */
export interface SessionPickerSessionData {
  sessionId: string;
  sessionRequest: SessionRequest;
  timestamp: Date;
}

export interface SessionPickerProps {
  isOpen: boolean;
  sessions: SessionPickerSessionData[];
  activeIndex: number;
  sessionUIStates: Record<string, SessionUIState | undefined>;
  onSelectIndex: (idx: number) => void;
  onClose: () => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function countAnswered(answers: Map<number, Answer> | undefined): number {
  if (!answers) return 0;
  let count = 0;
  for (const ans of answers.values()) {
    if (ans.selectedOption || ans.customText) {
      count++;
      continue;
    }
    if (ans.selectedOptions && ans.selectedOptions.length > 0) count++;
  }
  return count;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + "…";
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

/**
 * SessionPicker — a modal overlay listing all queued sessions.
 *
 * Opened via Ctrl+S. Each row shows:
 *   {index}. {title} — {workDir}  [{answered}/{total}]  {age}
 *
 * Navigation:
 *   ↑ / ↓ : move highlight
 *   Enter  : select highlighted session
 *   Esc    : close without switching
 */
export const SessionPicker: React.FC<SessionPickerProps> = ({
  isOpen,
  sessions,
  activeIndex,
  sessionUIStates,
  onSelectIndex,
  onClose,
}) => {
  const { theme } = useTheme();
  const { stdout } = useStdout();
  const termHeight = stdout?.rows ?? 24;
  const termWidth = stdout?.columns ?? 80;

  // ── Highlight state ──────────────────────────────────────────────
  const [highlightIndex, setHighlightIndex] = useState(activeIndex);

  // Reset highlight to active index each time the picker opens
  useEffect(() => {
    if (isOpen) {
      setHighlightIndex(activeIndex);
    }
  }, [isOpen, activeIndex]);

  // ── Keyboard handling (only active when overlay is open) ────────
  useInput(
    (input, key) => {
      if (key.upArrow) {
        setHighlightIndex((prev) => Math.max(0, prev - 1));
      } else if (key.downArrow) {
        setHighlightIndex((prev) => Math.min(sessions.length - 1, prev + 1));
      } else if (key.return) {
        onSelectIndex(highlightIndex);
        onClose();
      } else if (key.escape) {
        onClose();
      } else {
        // Direct number jump (1-9)
        const num = parseInt(input, 10);
        if (num >= 1 && num <= sessions.length) {
          onSelectIndex(num - 1);
          onClose();
        }
      }
    },
    { isActive: isOpen },
  );

  // ── Render nothing when closed ──────────────────────────────────
  if (!isOpen) return null;

  // ── Scrolling logic ─────────────────────────────────────────────
  // Reserve lines for border (2), title (1), padding (2), footer hint (2)
  const chromeLines = 7;
  const maxVisibleRows = Math.max(1, termHeight - chromeLines);
  const needsScroll = sessions.length > maxVisibleRows;

  let scrollOffset = 0;
  if (needsScroll) {
    // Keep highlighted row centred in the visible window
    scrollOffset = Math.max(
      0,
      Math.min(
        highlightIndex - Math.floor(maxVisibleRows / 2),
        sessions.length - maxVisibleRows,
      ),
    );
  }

  const visibleSessions = sessions.slice(
    scrollOffset,
    scrollOffset + maxVisibleRows,
  );

  // ── Derive max label widths from terminal size ──────────────────
  // Layout: " {idx}. {title} — {dir}  [{x}/{y}]  {age} "
  // We cap the variable-width parts to fit a single line.
  const innerWidth = Math.max(30, termWidth - 6); // 6 for border + padding
  const fixedOverhead = 18; // " 1. " + " — " + "  [x/y]  " + " Xm ago"
  const dynamicWidth = Math.max(10, innerWidth - fixedOverhead);
  const titleMax = Math.max(6, Math.floor(dynamicWidth * 0.55));
  const dirMax = Math.max(4, dynamicWidth - titleMax);

  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center">
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={theme.components.sessionPicker.border}
        paddingX={2}
        paddingY={1}
        width={Math.min(innerWidth + 6, termWidth)}
      >
        {/* Title bar */}
        <Box justifyContent="center" marginBottom={1}>
          <Text bold color={theme.components.sessionPicker.title}>
            Switch Session
          </Text>
          <Text color={theme.components.sessionPicker.rowDim}>
            {"  "}({sessions.length} queued)
          </Text>
        </Box>

        {/* Scroll-up indicator */}
        {needsScroll && scrollOffset > 0 && (
          <Box justifyContent="center">
            <Text color={theme.components.sessionPicker.rowDim}>▲ more</Text>
          </Box>
        )}

        {/* Session rows */}
        {visibleSessions.map((session, visibleIdx) => {
          const realIdx = scrollOffset + visibleIdx;
          const isHighlighted = realIdx === highlightIndex;
          const isActive = realIdx === activeIndex;
          const uiState = sessionUIStates[session.sessionId];

          const questions = session.sessionRequest.questions;
          const title = truncate(questions[0]?.title || "Untitled", titleMax);
          const dir = truncate(
            session.sessionRequest.workingDirectory || "unknown",
            dirMax,
          );
          const total = questions.length;
          const answered = countAnswered(uiState?.answers);
          const age = formatRelativeTime(session.timestamp);

          // Row colors
          const rowBg = isHighlighted
            ? theme.components.sessionPicker.highlightBg
            : undefined;
          const textColor = isHighlighted
            ? theme.components.sessionPicker.highlightFg
            : isActive
              ? theme.components.sessionPicker.activeMark
              : theme.components.sessionPicker.rowText;

          // Progress color
          const progressColor =
            answered === total && total > 0
              ? theme.components.sessionPicker.progress
              : answered > 0
                ? theme.components.sessionPicker.progress
                : theme.components.sessionPicker.rowDim;

          return (
            <Box key={session.sessionId}>
              <Text
                backgroundColor={rowBg}
                bold={isHighlighted}
                color={textColor}
              >
                {isActive ? "►" : " "} {realIdx + 1}. {title}
              </Text>
              <Text
                backgroundColor={rowBg}
                color={theme.components.sessionPicker.rowDim}
              >
                {" — "}
                {dir}
              </Text>
              <Text backgroundColor={rowBg} color={progressColor}>
                {"  ["}
                {answered}/{total}
                {"]"}
              </Text>
              <Text
                backgroundColor={rowBg}
                color={theme.components.sessionPicker.rowDim}
                dimColor
              >
                {age}
              </Text>
            </Box>
          );
        })}

        {/* Scroll-down indicator */}
        {needsScroll && scrollOffset + maxVisibleRows < sessions.length && (
          <Box justifyContent="center">
            <Text color={theme.components.sessionPicker.rowDim}>▼ more</Text>
          </Box>
        )}

        {/* Footer hint */}
        <Box justifyContent="center" marginTop={1}>
          <Text color={theme.components.sessionPicker.rowDim} dimColor>
            ↑↓ navigate · Enter select · Esc close · 1-9 jump
          </Text>
        </Box>
      </Box>
    </Box>
  );
};
