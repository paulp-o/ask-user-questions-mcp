import { TextAttributes } from "@opentui/core";
import React, { useEffect, useState } from "react";
import { useKeyboard } from "@opentui/react";

import type { SessionRequest } from "../../session/types.js";
import { useTheme } from "../ThemeProvider.js";
import type { Answer, SessionUIState } from "../../tui/shared/types.js";
import { formatRelativeTime } from "../../tui/shared/utils/relativeTime.js";
import { KEYS } from "../../tui/constants/keybindings.js";
import { useTerminalDimensions } from "../hooks/useTerminalDimensions.js";

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
  isStale?: boolean;
  isAbandoned?: boolean;
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
  return text.slice(0, max - 1) + "\u2026";
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

/**
 * SessionPicker \u2014 a modal overlay listing all queued sessions.
 *
 * Opened via Ctrl+S. Each row shows:
 *   {index}. {title} \u2014 {workDir}  [{answered}/{total}]  {age}
 *
 * Navigation:
 *   \u2191 / \u2193 : move highlight
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
  const { width: termWidth, height: termHeight } = useTerminalDimensions();

  // \u2500\u2500 Highlight state \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  const [highlightIndex, setHighlightIndex] = useState(activeIndex);

  // Reset highlight to active index each time the picker opens
  useEffect(() => {
    if (isOpen) {
      setHighlightIndex(activeIndex);
    }
  }, [isOpen, activeIndex]);

  // \u2500\u2500 Keyboard handling (only active when overlay is open) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  useKeyboard((key) => {
    if (!isOpen) return;

    if (key.name === "up") {
      setHighlightIndex((prev) => Math.max(0, prev - 1));
    } else if (key.name === "down") {
      setHighlightIndex((prev) => Math.min(sessions.length - 1, prev + 1));
    } else if (key.name === "return") {
      onSelectIndex(highlightIndex);
      onClose();
    } else if (key.name === "escape") {
      onClose();
    } else {
      // Direct number jump (1-9)
      const num = parseInt(key.sequence || key.name, 10);
      if (
        num >= KEYS.SESSION_JUMP_MIN &&
        num <= Math.min(KEYS.SESSION_JUMP_MAX, sessions.length)
      ) {
        onSelectIndex(num - 1);
        onClose();
      }
    }
  });

  // \u2500\u2500 Render nothing when closed \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  if (!isOpen) return null;

  // \u2500\u2500 Scrolling logic \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  const chromeLines = 7;
  const maxVisibleRows = Math.max(1, termHeight - chromeLines);
  const needsScroll = sessions.length > maxVisibleRows;

  let scrollOffset = 0;
  if (needsScroll) {
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

  // \u2500\u2500 Derive max label widths from terminal size \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  const innerWidth = Math.max(30, termWidth - 6);
  const fixedOverhead = 18;
  const dynamicWidth = Math.max(10, innerWidth - fixedOverhead);
  const titleMax = Math.max(6, Math.floor(dynamicWidth * 0.55));
  const dirMax = Math.max(4, dynamicWidth - titleMax);

  return (
    <box
      style={{
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        flexGrow: 1,
      }}
    >
      <box
        style={{
          flexDirection: "column",
          borderStyle: "rounded",
          borderColor: theme.components.sessionPicker.border,
          paddingX: 2,
          paddingY: 1,
          width: Math.min(innerWidth + 6, termWidth),
        }}
      >
        {/* Title bar */}
        <box style={{ flexDirection: "row", justifyContent: "center", marginBottom: 1 }}>
          <text style={{ attributes: TextAttributes.BOLD, fg: theme.components.sessionPicker.title }}>
            Switch Session
          </text>
          <text style={{ fg: theme.components.sessionPicker.rowDim }}>
            {`  (${sessions.length} queued)`}
          </text>
        </box>

        {/* Scroll-up indicator */}
        {needsScroll && scrollOffset > 0 && (
          <box style={{ justifyContent: "center" }}>
            <text style={{ fg: theme.components.sessionPicker.rowDim }}>\u25b2 more</text>
          </box>
        )}

        {/* Session rows */}
        <box onMouseScroll={(event) => {
          if (event.scroll?.direction === "down") {
            setHighlightIndex((prev) => Math.min(sessions.length - 1, prev + 1));
          } else if (event.scroll?.direction === "up") {
            setHighlightIndex((prev) => Math.max(0, prev - 1));
          }
        }}>
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

          const isStaleOrAbandoned = session.isStale || session.isAbandoned;

          return (
            <box key={session.sessionId} style={{ flexDirection: "column" }} onMouseDown={() => { onSelectIndex(realIdx); onClose(); }}>
              <box style={{ flexDirection: "row" }}>
                {/* Stale/abandoned warning icon */}
                {isStaleOrAbandoned && (
                  <text
                    style={{
                      bg: rowBg,
                      fg: theme.components.sessionPicker.staleIcon,
                    }}
                  >
                    {"\u26a0 "}
                  </text>
                )}
                <text
                  style={{
                    bg: rowBg,
                    attributes: isHighlighted ? TextAttributes.BOLD : TextAttributes.NONE,
                    fg: isStaleOrAbandoned
                      ? theme.components.sessionPicker.staleText
                      : textColor,
                  }}
                >
                  {`${isActive ? "\u25ba" : " "} ${realIdx + 1}. ${title}`}
                </text>
                <text style={{ bg: rowBg, fg: theme.components.sessionPicker.rowDim }}>
                  {` — ${dir}`}
                </text>
                <text style={{ bg: rowBg, fg: progressColor }}>
                  {`  [${answered}/${total}]`}
                </text>
                <text
                  style={{
                    bg: rowBg,
                    fg: isStaleOrAbandoned
                      ? theme.components.sessionPicker.staleAge
                      : theme.components.sessionPicker.rowDim,
                    attributes: !isStaleOrAbandoned ? TextAttributes.DIM : TextAttributes.NONE,
                  }}
                >
                  {age}
                </text>
              </box>
              {/* "may be orphaned" subtitle for stale sessions */}
              {session.isStale && !session.isAbandoned && (
                <box style={{ marginLeft: 4 }}>
                  <text style={{ fg: theme.components.sessionPicker.staleSubtitle, attributes: TextAttributes.DIM }}>
                    may be orphaned
                  </text>
                </box>
              )}
              {/* "abandoned" subtitle for abandoned sessions */}
              {session.isAbandoned && (
                <box style={{ marginLeft: 4 }}>
                  <text style={{ fg: theme.components.sessionPicker.staleSubtitle, attributes: TextAttributes.BOLD }}>
                    session abandoned
                  </text>
                </box>
              )}
            </box>
          );
        })}
        </box>

        {/* Scroll-down indicator */}
        {needsScroll && scrollOffset + maxVisibleRows < sessions.length && (
          <box style={{ justifyContent: "center" }}>
            <text style={{ fg: theme.components.sessionPicker.rowDim }}>\u25bc more</text>
          </box>
        )}

        {/* Footer hint */}
        <box style={{ justifyContent: "center", marginTop: 1 }}>
          <text style={{ fg: theme.components.sessionPicker.rowDim, attributes: TextAttributes.DIM }}>
            ↑↓ navigate · Enter select · Esc close · 1-9 jump · scroll
          </text>
        </box>
      </box>
    </box>
  );
};