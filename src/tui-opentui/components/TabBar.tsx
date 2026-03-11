import React from "react";

import type { Question } from "../../session/types.js";
import { useTheme } from "../ThemeProvider.js";
import { useTerminalDimensions } from "../hooks/useTerminalDimensions.js";

interface TabBarProps {
  currentIndex: number;
  questions: Question[];
  answers: Map<
    number,
    {
      customText?: string;
      selectedOption?: string;
      selectedOptions?: string[];
    }
  >;
  tabLabel?: string;
  elaborateMarks?: Map<number, string>;
  onSelectIndex?: (index: number) => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/** Simple visual-width truncation with ellipsis. */
function truncate(value: string, maxChars: number): string {
  if (maxChars <= 0) return "";
  if (value.length <= maxChars) return value;
  return value.slice(0, maxChars - 1) + "…";
}

const isAnswerPresent = (
  answer:
    | {
        customText?: string;
        selectedOption?: string;
        selectedOptions?: string[];
      }
    | undefined,
) => {
  if (!answer) return false;
  if (answer.selectedOption) return true;
  if (answer.customText) return true;
  if (answer.selectedOptions && answer.selectedOptions.length > 0) return true;
  return false;
};

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

/**
 * TabBar — minimal question tab strip with progress indicators.
 *
 * Active tab is clearly indicated; answered state is shown subtly via color.
 * Status symbols: ✓ answered, ⟲ elaborate, · unanswered
 */
export const TabBar = ({
  currentIndex,
  questions,
  answers,
  tabLabel,
  elaborateMarks,
  onSelectIndex,
}: TabBarProps): React.ReactNode => {
  const { theme } = useTheme();
  const { width: columns } = useTerminalDimensions();

  // A little breathing room at both edges.
  const paddingX = 2;
  const innerWidth = Math.max(0, columns - paddingX * 2);

  const answeredCount = questions.reduce((count, _q, index) => {
    const answer = answers.get(index);
    return count + (isAnswerPresent(answer) ? 1 : 0);
  }, 0);

  const progressText = `${answeredCount}/${questions.length}`;
  const separator = " │ ";
  const separatorLen = separator.length;

  // Build labels and keep the entire bar to a single line.
  const labelCount = Math.max(questions.length, 1);
  const maxLeftWidth = Math.max(0, innerWidth - progressText.length - 1);
  const availableForLabels = Math.max(
    0,
    maxLeftWidth - separatorLen * (labelCount - 1),
  );
  const maxLabelChars = Math.max(
    4,
    Math.floor(availableForLabels / labelCount),
  );

  const tabs = questions.map((question, index) => {
    const isActive = index === currentIndex;
    const answer = answers.get(index);
    const isAnswered = isAnswerPresent(answer);
    const isElaborate = elaborateMarks?.has(index) ?? false;

    const baseLabel = tabLabel || question.title || `Question ${index + 1}`;
    const label = truncate(baseLabel, maxLabelChars - 2);
    const status = isElaborate ? "⟲" : isAnswered ? "✓" : "·";

    return { index, isActive, isAnswered, isElaborate, label, status };
  });

  return (
    <box style={{ flexDirection: "row", width: columns, paddingLeft: paddingX, paddingRight: paddingX, justifyContent: "space-between" }}>
      <box style={{ flexDirection: "row" }}>
        {tabs.map((tab, idx) => (
          <box key={tab.index} style={{ flexDirection: "row", backgroundColor: tab.isActive ? theme.colors.surfaceAlt : undefined, paddingLeft: tab.isActive ? 1 : 0, paddingRight: tab.isActive ? 1 : 0 }} onMouseDown={() => onSelectIndex?.(tab.index)}>
            <text
              style={{
                fg: tab.isElaborate
                  ? theme.colors.warning
                  : tab.isAnswered
                    ? theme.components.tabBar.answered
                    : theme.colors.unansweredHighlight,
              }}
            >
              {tab.status}
            </text>
            <text> </text>
            <text
              style={{
                bold: tab.isActive,
                underline: tab.isActive,
                fg: tab.isActive
                  ? theme.colors.primary
                  : tab.isAnswered
                    ? theme.components.tabBar.answered
                    : theme.components.tabBar.unanswered,
                dim: !tab.isActive && !tab.isAnswered,
              }}
            >
              {tab.label}
            </text>
            {idx < tabs.length - 1 ? (
              <text style={{ fg: theme.components.tabBar.divider }}>{separator}</text>
            ) : null}
          </box>
        ))}
      </box>
      <text style={{ fg: theme.colors.textDim, dim: true }}>
        {progressText}
      </text>
    </box>
  );
};
