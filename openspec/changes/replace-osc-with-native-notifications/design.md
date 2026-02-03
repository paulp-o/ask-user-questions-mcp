# Design: OS-Native Notifications

## Context

The current OSC-based notification system was designed to work within terminal emulators using escape sequences. However, this approach has significant limitations:

1. Only ~5 terminals support OSC notifications (iTerm2, kitty, WezTerm, Windows Terminal, Hyper)
2. Popular terminals like Alacritty, Terminal.app, and GNOME Terminal silently ignore OSC sequences
3. Users in unsupported terminals receive no notification when questions arrive

The `node-notifier` package provides cross-platform native notification support:

- macOS: Uses `terminal-notifier` binary (bundled)
- Windows: Uses `snoretoast.exe` binary (bundled)
- Linux: Uses `notify-send` (system dependency)

## Goals / Non-Goals

**Goals:**

- Provide reliable desktop notifications on macOS, Windows, and Linux
- Maintain backward compatibility with existing configuration schema
- Keep progress bar functionality for terminals that support it
- Zero configuration required for macOS and Windows users

**Non-Goals:**

- Interactive notifications (action buttons, reply fields)
- Custom notification sounds (use system defaults)
- Notification persistence/history management
- Supporting WSL (Windows Subsystem for Linux) - may work but not tested

## Decisions

### Decision 1: Use node-notifier over direct system calls

**Chosen**: `node-notifier` npm package

**Alternatives considered**:

1. Direct AppleScript/PowerShell/notify-send calls
   - Pros: Zero dependencies, smaller bundle
   - Cons: More code to maintain, edge cases not handled
2. Platform-specific packages (node-mac-notifier, etc.)
   - Pros: Better native integration
   - Cons: Multiple dependencies, more complex build

**Rationale**: node-notifier handles cross-platform edge cases, has 12M+ weekly downloads, and provides a single unified API. The bundled binaries (~2MB) are acceptable given the reliability benefits.

### Decision 2: Keep OSC progress bar, remove OSC notifications

**Chosen**: Hybrid approach - native notifications + OSC progress bar

**Rationale**: Progress bars in dock icons (iTerm2, WezTerm) provide useful visual feedback during question answering that native notifications cannot replicate. Since progress bar code is separate from notification code, we can keep it without complication.

### Decision 3: Silent failure with one-time warning

**Chosen**: Log warning once on Linux if notify-send is missing, continue without notifications

**Alternatives considered**:

1. Throw error and prevent app startup
2. Show warning in TUI on every session
3. Auto-disable notifications permanently

**Rationale**: Missing notifications shouldn't prevent the app from functioning. A one-time startup warning informs the user without being intrusive.

### Decision 4: Use simple app ID for Windows

**Chosen**: `appID: 'com.auq.mcp'`

**Rationale**: Windows requires an AppUserModelID for notifications to persist in Action Center. A simple, consistent ID works for most cases without requiring AUMID registration.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   tui-app.tsx                       │
│  - Startup: checkLinuxDependencies()                │
│  - Creates NotificationBatcher with config          │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│                    batch.ts                         │
│  - Queues notifications (500ms debounce)            │
│  - Calls sendNotification() with batched count      │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│                    notify.ts                        │
│  - sendNotification() → calls native.ts             │
│  - formatNotificationMessage() (unchanged)          │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│                    native.ts (NEW)                  │
│  - sendNativeNotification()                         │
│  - checkLinuxDependencies()                         │
│  - Uses node-notifier under the hood                │
└─────────────────────────────────────────────────────┘
```

**Preserved from existing implementation:**

```
┌─────────────────────────────────────────────────────┐
│                   progress.ts                       │
│  - showProgress() / clearProgress()                 │
│  - Uses detect.ts for terminal detection            │
│  - Calls osc.ts for OSC 9;4 sequences               │
└─────────────────────────────────────────────────────┘
```

## Risks / Trade-offs

| Risk                                    | Impact                                      | Mitigation                                               |
| --------------------------------------- | ------------------------------------------- | -------------------------------------------------------- |
| node-notifier bundles unsigned binaries | May trigger Gatekeeper/SmartScreen warnings | Document workaround; binaries are well-established       |
| node-notifier is stale (3+ years)       | Potential compatibility issues              | Monitor for issues; fallback plan is direct system calls |
| Linux requires notify-send              | Users without it get no notifications       | Startup warning with install instructions                |
| Package size increases ~2MB             | Larger npm install                          | Acceptable tradeoff for reliability                      |

## Migration Plan

1. **Phase 1**: Add node-notifier, create native.ts wrapper
2. **Phase 2**: Update notify.ts to use native.ts
3. **Phase 3**: Remove OSC notification code from osc.ts
4. **Phase 4**: Update tests and documentation
5. **Phase 5**: Manual testing on all platforms

**Rollback**: If issues arise, revert to previous OSC-based implementation (code preserved in git history).

## Open Questions

None - all questions resolved during spec discussion.
