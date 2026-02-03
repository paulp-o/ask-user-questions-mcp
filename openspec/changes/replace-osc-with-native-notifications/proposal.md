# Change: Replace OSC Terminal Notifications with OS-Native Notifications

## Why

The current OSC-based notification system only works in specific terminal emulators (iTerm2, kitty, WezTerm). Many users run AUQ in terminals that don't support OSC notifications (Alacritty, Terminal.app, GNOME Terminal), meaning they receive no notification when new questions arrive. OS-native notifications via `node-notifier` provide universal coverage across macOS, Windows, and Linux regardless of terminal choice.

## What Changes

- **BREAKING**: Remove OSC 9/99/777 notification sequences from `sendNotification()`
- Replace notification backend with `node-notifier` npm package
- Keep OSC progress bar functionality (OSC 9;4) for iTerm2/WezTerm users
- Add notification icon asset for branding
- Add Linux dependency detection (notify-send) with startup warning
- Update README to document platform requirements instead of terminal support table

## Impact

- **Affected specs**: `tui-application` (notifications capability)
- **Affected code**:
  - `src/tui/notifications/notify.ts` - Replace OSC with node-notifier
  - `src/tui/notifications/osc.ts` - Keep progress bar functions, remove notification functions
  - `src/tui/notifications/detect.ts` - Simplify (only needed for progress bar detection)
  - `src/tui/notifications/types.ts` - Simplify protocol types
  - `src/tui/notifications/__tests__/` - Update tests to mock node-notifier
  - `bin/tui-app.tsx` - Add Linux dependency check on startup
  - `package.json` - Add node-notifier dependency
  - `README.md` - Update notification documentation
- **New dependency**: `node-notifier` (~2MB, includes platform binaries)
- **New asset**: `src/tui/notifications/assets/icon.png` (user-provided)
