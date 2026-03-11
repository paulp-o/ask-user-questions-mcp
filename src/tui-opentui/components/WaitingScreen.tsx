import { TextAttributes } from "@opentui/core";
import React, { useEffect, useState } from "react";

import { t } from "../../i18n/index.js";
import { useTheme } from "../ThemeProvider.js";
import { AnimatedGradient } from "./AnimatedGradient.js";

interface WaitingScreenProps {
  queueCount: number;
}

/**
 * WaitingScreen displays when no question sets are being processed.
 * Shows "Waiting for AI..." message with animated gradient effect and elapsed time.
 */
export const WaitingScreen: React.FC<WaitingScreenProps> = ({ queueCount }) => {
  const { theme } = useTheme();

  const [startTime] = useState(new Date());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Update elapsed time every second
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      setElapsedSeconds(elapsed);
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime]);

  const waitingTitle =
    queueCount === 0
      ? t("waiting.title").replace("...", "…")
      : `${t("waiting.processing").replace("...", "…")} (${t("waiting.queueCount").replace("{count}", String(queueCount))})`;

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
          paddingLeft: 4,
          paddingRight: 4,
          paddingTop: 2,
          paddingBottom: 2,
          marginLeft: 1,
          marginRight: 1,
          border: true,
          borderStyle: "rounded",
          borderColor: theme.colors.surface,
        }}
      >
        <box style={{ justifyContent: "center" }}>
          <AnimatedGradient text={waitingTitle} />
        </box>
        <box style={{ justifyContent: "center", marginTop: 1 }}>
          <text style={{ attributes: TextAttributes.DIM }}>
            {`${t("waiting.hint")} • ${elapsedSeconds}s`}
          </text>
        </box>
      </box>
    </box>
  );
};