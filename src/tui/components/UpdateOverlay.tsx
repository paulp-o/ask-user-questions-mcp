import { Box, Text, useInput, useStdout } from "ink";
import React, { useState } from "react";
import Markdown from "ink-markdown-es";
import { lexer } from "marked";

import { useTheme } from "../ThemeContext.js";
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
 * UpdateOverlay — fullscreen modal for minor/major update prompts.
 *
 * Displays version information, changelog (rendered as Markdown), and
 * action buttons. Major updates show a breaking-change warning badge.
 *
 * Navigation:
 *   Tab / →  : next button
 *   Shift+Tab / ← : previous button
 *   Enter    : trigger focused action
 *   Esc      : same as "Remind me later"
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
  const { theme } = useTheme();
  const { stdout } = useStdout();
  const termWidth = stdout?.columns ?? 80;

  const [focusedButton, setFocusedButton] = useState(0);

  // ── Actions bound to button indices ──────────────────────────────
  const actions = [onInstall, onSkipVersion, onRemindLater];
  const buttonLabels = ["Yes, update", "Skip this version", "Remind me later"];
  const buttonCount = buttonLabels.length;

  // ── Keyboard handling (only active when overlay is open) ────────
  useInput(
    (input, key) => {
      // Installing or error state — only Esc closes
      if (isInstalling) return;

      if (installError) {
        if (key.return || key.escape) {
          onRemindLater();
        }
        return;
      }

      // Tab / Right arrow: next button
      if (key.tab && !key.shift) {
        setFocusedButton((prev) => (prev + 1) % buttonCount);
        return;
      }
      if (key.rightArrow) {
        setFocusedButton((prev) => (prev + 1) % buttonCount);
        return;
      }

      // Shift+Tab / Left arrow: previous button
      if (key.tab && key.shift) {
        setFocusedButton((prev) => (prev - 1 + buttonCount) % buttonCount);
        return;
      }
      if (key.leftArrow) {
        setFocusedButton((prev) => (prev - 1 + buttonCount) % buttonCount);
        return;
      }

      // Enter: trigger focused button
      if (key.return) {
        actions[focusedButton]();
        return;
      }

      // Escape: remind me later
      if (key.escape) {
        onRemindLater();
        return;
      }
    },
    { isActive: isOpen },
  );

  // ── Render nothing when closed ──────────────────────────────────
  if (!isOpen) return null;

  // ── Color mapping for update type badges ────────────────────────
  const typeColorMap: Record<string, string> = {
    patch: theme.colors.success,
    minor: theme.colors.warning,
    major: theme.colors.error,
  };
  const typeColor = typeColorMap[updateType] ?? theme.colors.info;

  const overlayWidth = Math.min(64, termWidth - 4);
  const innerWidth = overlayWidth - 6; // account for border + paddingX

  // ── Package manager info for error display ──────────────────────
  const packageManager = detectPackageManager();
  const manualCommand = getManualCommand(packageManager);

  // ── Markdown styles matching MarkdownPrompt ─────────────────────
  const markdownStyles = {
    code: {
      backgroundColor: theme.components.markdown.codeBlockBg,
      color: theme.components.markdown.codeBlockText,
      borderColor: theme.components.markdown.codeBlockBorder,
      borderStyle: "round" as const,
      paddingX: 1,
    },
    codespan: {
      backgroundColor: theme.components.markdown.codeBlockBg,
      color: theme.components.markdown.codeBlockText,
    },
  };

  // ── Render changelog section ────────────────────────────────────
  const renderChangelog = () => {
    if (changelog) {
      // Determine if changelog has block elements (like MarkdownPrompt)
      let hasBlockElements = false;
      try {
        const tokens = lexer(changelog);
        hasBlockElements = tokens.some((token) =>
          ["code", "list", "blockquote", "heading", "hr", "table"].includes(
            token.type,
          ),
        );
      } catch {
        // fall through, treat as inline
      }

      const renderers = {
        link: (linkText: string, href: string) => (
          <Text>
            {linkText} ({href})
          </Text>
        ),
        ...(!hasBlockElements
          ? {
              paragraph: (content: React.ReactNode) => (
                <Text>{content}</Text>
              ),
            }
          : {}),
      };

      return (
        <Box
          borderStyle="round"
          borderColor={theme.borders.neutral}
          flexDirection="column"
          paddingX={1}
          paddingY={1}
          width={innerWidth}
        >
          <Markdown
            styles={markdownStyles}
            renderers={renderers}
            highlight={true}
          >
            {changelog}
          </Markdown>
        </Box>
      );
    }

    // No changelog — show fallback link
    return (
      <Box
        borderStyle="round"
        borderColor={theme.borders.neutral}
        paddingX={1}
        paddingY={1}
        width={innerWidth}
      >
        <Text dimColor>
          View changelog: {changelogUrl}
        </Text>
      </Box>
    );
  };

  // ── Installing state ────────────────────────────────────────────
  if (isInstalling) {
    return (
      <Box flexDirection="column" alignItems="center" justifyContent="center">
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor={theme.borders.primary}
          paddingX={2}
          paddingY={1}
          width={overlayWidth}
          alignItems="center"
        >
          <Box marginBottom={1}>
            <Text bold color={theme.colors.primary}>
              Installing Update
            </Text>
          </Box>
          <Box marginBottom={1}>
            <Text>
              <Text color={theme.colors.info}>⠋ </Text>
              Installing v{latestVersion}…
            </Text>
          </Box>
          <Box>
            <Text dimColor>
              Running: {manualCommand}
            </Text>
          </Box>
        </Box>
      </Box>
    );
  }

  // ── Error state ─────────────────────────────────────────────────
  if (installError) {
    return (
      <Box flexDirection="column" alignItems="center" justifyContent="center">
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor={theme.borders.error}
          paddingX={2}
          paddingY={1}
          width={overlayWidth}
        >
          <Box marginBottom={1}>
            <Text bold color={theme.colors.error}>
              Update Failed
            </Text>
          </Box>
          <Box marginBottom={1}>
            <Text color={theme.colors.error}>{installError}</Text>
          </Box>
          <Box marginBottom={1} flexDirection="column">
            <Text dimColor>Try running manually:</Text>
            <Box marginTop={0}>
              <Text bold color={theme.colors.info}>
                {"  "}{manualCommand}
              </Text>
            </Box>
          </Box>
          <Box justifyContent="center" marginTop={1}>
            <Text
              bold
              backgroundColor={theme.components.options.focusedBg}
              color={theme.colors.focused}
            >
              {" Close "}
            </Text>
          </Box>
          <Box justifyContent="center" marginTop={1}>
            <Text dimColor>Enter or Esc to close</Text>
          </Box>
        </Box>
      </Box>
    );
  }

  // ── Default state: update prompt with buttons ───────────────────
  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center">
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={theme.borders.primary}
        paddingX={2}
        paddingY={1}
        width={overlayWidth}
      >
        {/* Title */}
        <Box justifyContent="center" marginBottom={1}>
          <Text bold color={theme.colors.primary}>
            Update Available
          </Text>
        </Box>

        {/* Version info */}
        <Box justifyContent="center" marginBottom={1}>
          <Text>
            <Text dimColor>Current: </Text>
            <Text>{currentVersion}</Text>
            <Text dimColor> → </Text>
            <Text dimColor>Latest: </Text>
            <Text bold color={typeColor}>
              {latestVersion}
            </Text>
            <Text> </Text>
            <Text backgroundColor={typeColor} color="#000000" bold>
              {" "}{updateType.toUpperCase()}{" "}
            </Text>
          </Text>
        </Box>

        {/* Breaking change warning for major versions */}
        {updateType === "major" && (
          <Box
            borderStyle="round"
            borderColor={theme.borders.warning}
            paddingX={1}
            marginBottom={1}
            width={innerWidth}
          >
            <Text color={theme.colors.warning} bold>
              ⚠ Breaking changes may be included
            </Text>
          </Box>
        )}

        {/* Changelog */}
        <Box marginBottom={1}>
          {renderChangelog()}
        </Box>

        {/* Action buttons */}
        <Box justifyContent="center" gap={1}>
          {buttonLabels.map((label, index) => {
            const isFocused = index === focusedButton;
            return (
              <Box key={label}>
                <Text
                  bold={isFocused}
                  backgroundColor={
                    isFocused
                      ? theme.components.options.focusedBg
                      : undefined
                  }
                  color={
                    isFocused ? theme.colors.focused : theme.colors.text
                  }
                >
                  {isFocused ? " ▸ " : " "}
                  {label}
                  {isFocused ? " " : " "}
                </Text>
              </Box>
            );
          })}
        </Box>

        {/* Footer hint */}
        <Box justifyContent="center" marginTop={1}>
          <Text dimColor>
            ←→/Tab navigate · Enter select · Esc dismiss
          </Text>
        </Box>
      </Box>
    </Box>
  );
};
