# Change: Add OSC 9/99 Notification Support

## Why

Users running AUQ in a terminal tab/window may miss new questions arriving while focused on other work. GitHub issue #3 requests OSC notification support. OSC 9 (iTerm2) and OSC 99 (kitty) are terminal escape sequences that trigger native desktop notifications, helping users notice when AI assistants have questions waiting. Additionally, OSC 9 supports progress bars in terminal dock icons, providing visual feedback during question answering.

## What Changes

- **OSC 9 Support (iTerm2)**: Send notifications when new questions arrive using `ESC]9;message BEL` format
- **OSC 99 Support (kitty)**: Send notifications using kitty's extensible `ESC]99;params BEL` format with Base64-encoded parameters
- **Auto-Detection**: Detect terminal type via `TERM_PROGRAM` environment variable and use appropriate protocol
- **Progress Bar**: Show question completion progress in terminal dock icon via OSC 9 progress sequences
- **Configuration**: Add `notifications.enabled` and `notifications.sound` settings to `.auqrc.json`
- **Batched Notifications**: Aggregate rapid session arrivals into single notification with count

## Impact

- Affected specs: `tui-application`
- Affected code:
  - `bin/tui-app.tsx` - Trigger notifications on new session detection
  - `src/tui/session-watcher.ts` - Hook for notification events
- **New files**:
  - `src/tui/notifications/osc.ts` - OSC escape sequence generators
  - `src/tui/notifications/notify.ts` - High-level notification API
  - `src/tui/notifications/progress.ts` - Progress bar control
  - `src/tui/notifications/types.ts` - TypeScript interfaces
