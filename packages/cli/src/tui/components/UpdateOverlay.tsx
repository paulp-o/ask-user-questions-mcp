import React, { useState } from "react";
import { useKeyboard } from "@opentui/react";
import { TextAttributes } from "@opentui/core";

import { useTheme } from "../ThemeProvider.js";
import { useTerminalDimensions } from "../hooks/useTerminalDimensions.js";
import { detectPackageManager } from "../../update/package-manager.js";
import { getManualCommand } from "../../update/installer.js";

interface UpdateOverlayProps {
  isOpen: boolean;
  currentVersion: string;
  latestVersion: string;
  updateType: "patch" | "minor" | "major";
  changelog: string | null;
  changelogUrl: string;
  isInstalling: boolean;
  installError: string | null;
  onInstall: () => void;
  onSkipVersion: () => void;
  onRemindLater: () => void;
}

/**
 * UpdateOverlay \u2014 fullscreen modal for minor/major update prompts.
 *
 * Displays version information, changelog (rendered as Markdown), and
 * action buttons. Major updates show a breaking-change warning badge.
 *
 * Navigation:
 *   Tab / ↓  : next button
 *   Shift+Tab / ↑ : previous button
 *   Enter    : trigger focused action
 *   Esc      : same as \"Remind me later\"
 */
export const UpdateOverlay: React.FC<UpdateOverlayProps> = ({
  isOpen,
  currentVersion,
  latestVersion,
  updateType,
  changelog,
  changelogUrl,
  isInstalling,
  installError,
  onInstall,
  onSkipVersion,
  onRemindLater,
}) => {
  const { theme, syntaxStyle } = useTheme();
  const { width: termWidth } = useTerminalDimensions();

  const [focusedButton, setFocusedButton] = useState(0);

  // \u2500\u2500 Actions bound to button indices \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  const actions = [onInstall, onSkipVersion, onRemindLater];
  const buttonLabels = ["Yes, update", "Skip this version", "Remind me later"];
  const buttonCount = buttonLabels.length;

  // \u2500\u2500 Keyboard handling (only active when overlay is open) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  useKeyboard((key) => {
    if (!isOpen) return;

    // Installing or error state \u2014 only Esc closes
    if (isInstalling) return;

    if (installError) {
      if (key.name === "return" || key.name === "escape") {
        onRemindLater();
      }
      return;
    }

    // Tab / Down arrow: next button
    if (key.name === "tab" && !key.shift) {
      setFocusedButton((prev) => (prev + 1) % buttonCount);
      return;
    }
    if (key.name === "down") {
      setFocusedButton((prev) => (prev + 1) % buttonCount);
      return;
    }

    // Shift+Tab / Up arrow: previous button
    if (key.name === "tab" && key.shift) {
      setFocusedButton((prev) => (prev - 1 + buttonCount) % buttonCount);
      return;
    }
    if (key.name === "up") {
      setFocusedButton((prev) => (prev - 1 + buttonCount) % buttonCount);
      return;
    }

    // Enter: trigger focused button
    if (key.name === "return") {
      actions[focusedButton]();
      return;
    }

    // Escape: remind me later
    if (key.name === "escape") {
      onRemindLater();
      return;
    }
  });

  // \u2500\u2500 Render nothing when closed \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  if (!isOpen) return null;

  // \u2500\u2500 Color mapping for update type badges \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  const typeColorMap: Record<string, string> = {
    patch: theme.colors.success,
    minor: theme.colors.warning,
    major: theme.colors.error,
  };
  const typeColor = typeColorMap[updateType] ?? theme.colors.info;

  const overlayWidth = Math.min(64, termWidth - 4);
  const innerWidth = overlayWidth - 6; // account for border + paddingX

  // \u2500\u2500 Package manager info for error display \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  const packageManager = detectPackageManager();
  const manualCommand = getManualCommand(packageManager);

  // \u2500\u2500 Installing state \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  if (isInstalling) {
    return (
      <box
        style={{
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <box
          style={{
            flexDirection: "column",
            borderStyle: "rounded",
            borderColor: theme.borders.primary,
            paddingX: 2,
            paddingY: 1,
            width: overlayWidth,
            alignItems: "center",
          }}
        >
          <box style={{ marginBottom: 1 }}>
            <text style={{ attributes: TextAttributes.BOLD, fg: theme.colors.primary }}>
              Installing Update
            </text>
          </box>
          <box style={{ marginBottom: 1 }}>
            <box style={{ flexDirection: "row" }}>
              <text style={{ fg: theme.colors.info }}>{"\u2819 "}</text>
              <text>{`Installing v${latestVersion}\u2026`}</text>
            </box>
          </box>
          <box>
            <text style={{ attributes: TextAttributes.DIM }}>
              {`Running: ${manualCommand}`}
            </text>
          </box>
        </box>
      </box>
    );
  }

  // \u2500\u2500 Error state \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  if (installError) {
    return (
      <box
        style={{
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <box
          style={{
            flexDirection: "column",
            borderStyle: "rounded",
            borderColor: theme.borders.error,
            paddingX: 2,
            paddingY: 1,
            width: overlayWidth,
          }}
        >
          <box style={{ marginBottom: 1 }}>
            <text style={{ attributes: TextAttributes.BOLD, fg: theme.colors.error }}>
              Update Failed
            </text>
          </box>
          <box style={{ marginBottom: 1 }}>
            <text style={{ fg: theme.colors.error }}>{installError}</text>
          </box>
          <box style={{ marginBottom: 1, flexDirection: "column" }}>
            <text style={{ attributes: TextAttributes.DIM }}>Try running manually:</text>
            <box style={{ marginTop: 0 }}>
              <text style={{ attributes: TextAttributes.BOLD, fg: theme.colors.info }}>
                {`  ${manualCommand}`}
              </text>
            </box>
          </box>
          <box style={{ justifyContent: "center", marginTop: 1 }}>
            <text
              style={{
                attributes: TextAttributes.BOLD,
                bg: theme.components.options.focusedBg,
                fg: theme.colors.focused,
              }}
            >
              {" Close "}
            </text>
          </box>
          <box style={{ justifyContent: "center", marginTop: 1 }}>
            <text style={{ attributes: TextAttributes.DIM }}>Enter or Esc to close</text>
          </box>
        </box>
      </box>
    );
  }

  // \u2500\u2500 Default state: update prompt with buttons \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  return (
    <box
      style={{
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
      }}
    >
      <box
        style={{
          flexDirection: "column",
          borderStyle: "rounded",
          borderColor: theme.borders.primary,
          paddingX: 2,
          paddingY: 1,
          width: overlayWidth,
        }}
      >
        {/* Title */}
        <box style={{ justifyContent: "center", marginBottom: 1 }}>
          <text style={{ attributes: TextAttributes.BOLD, fg: theme.colors.primary }}>
            Update Available
          </text>
        </box>

        {/* Version info */}
        <box style={{ justifyContent: "center", marginBottom: 1 }}>
          <box style={{ flexDirection: "row" }}>
            <text style={{ attributes: TextAttributes.DIM }}>{"Current: "}</text>
            <text>{currentVersion}</text>
            <text style={{ attributes: TextAttributes.DIM }}>{" \u2192 "}</text>
            <text style={{ attributes: TextAttributes.DIM }}>{"Latest: "}</text>
            <text style={{ attributes: TextAttributes.BOLD, fg: typeColor }}>{latestVersion}</text>
            <text>{" "}</text>
            <text style={{ bg: typeColor, fg: "#000000", attributes: TextAttributes.BOLD }}>{` ${updateType.toUpperCase()} `}</text>
          </box>
        </box>

        {/* Breaking change warning for major versions */}
        {updateType === "major" && (
          <box
            style={{
              borderStyle: "rounded",
              borderColor: theme.borders.warning,
              paddingX: 1,
              marginBottom: 1,
              width: innerWidth,
            }}
          >
            <text style={{ fg: theme.colors.warning, attributes: TextAttributes.BOLD }}>
              \u26a0 Breaking changes may be included
            </text>
          </box>
        )}

        {/* Changelog */}
        <box style={{ marginBottom: 1 }}>
          {changelog ? (
            <box
              style={{
                borderStyle: "rounded",
                borderColor: theme.borders.neutral,
                flexDirection: "column",
                paddingX: 1,
                paddingY: 1,
                width: innerWidth,
              }}
            >
              <scrollbox style={{ maxHeight: 12 }}>
                <markdown content={changelog} syntaxStyle={syntaxStyle} />
              </scrollbox>
            </box>
          ) : (
            <box
              style={{
                borderStyle: "rounded",
                borderColor: theme.borders.neutral,
                paddingX: 1,
                paddingY: 1,
                width: innerWidth,
              }}
            >
              <text style={{ attributes: TextAttributes.DIM }}>
                {`View changelog: ${changelogUrl}`}
              </text>
            </box>
          )}
        </box>

        {/* Action buttons */}
        <box style={{ flexDirection: "column", alignItems: "center", gap: 1 }}>
          {buttonLabels.map((label, index) => {
            const isFocused = index === focusedButton;
            return (
              <box key={label} onMouseDown={() => { actions[index](); }}>
                <text
                  style={{
                    attributes: isFocused ? TextAttributes.BOLD : TextAttributes.NONE,
                    bg: isFocused
                      ? theme.components.options.focusedBg
                      : undefined,
                    fg: isFocused ? theme.colors.focused : theme.colors.text,
                  }}
                >
                  {isFocused ? " ▸ " : " "}
                  {label}
                  {isFocused ? " " : " "}
                </text>
              </box>
            );
          })}
        </box>

        {/* Footer hint */}
        <box style={{ justifyContent: "center", marginTop: 1 }}>
          <text style={{ attributes: TextAttributes.DIM }}>
            ↑↓/Tab navigate · Enter select · Esc dismiss · click button
          </text>
        </box>
      </box>
    </box>
  );
};