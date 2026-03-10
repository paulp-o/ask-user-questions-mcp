# Change: Add Orphan Session Handling

## Why

Currently, when AI creates questions via AUQ and then disconnects, cancels, or times out, the questions remain visible in the TUI indefinitely. Users can answer these "orphan" questions, but the answers are never received by anyone. This creates a confusing UX where stale/orphan questions accumulate in the TUI with no indication that they may no longer be relevant.

This change introduces:

1. **Stale detection**: Visual indicators for sessions that may be orphaned
2. **Abort signal handling**: Proper cleanup when AI disconnects
3. **CLI management**: Headless commands to list, answer, and manage sessions
4. **Grace period**: Extended time for sessions with user interaction

## What Changes

### 1. TUI Stale Detection

- Session-watcher calculates age-based stale flag (staleThreshold configurable, default 2 hours)
- Stale = session age > staleThreshold (computed client-side only)
- SessionPicker shows ⚠ icon, warning color, "may be orphaned" text
- Toast notification on first stale detection
- Stale sessions remain answerable (not auto-removed)

### 2. AbortSignal / AI Disconnect Detection

- FastMCP disconnect event triggers AbortController abort
- server.ts tracks active sessions with Map<requestId, AbortController>
- On disconnect: update status.json to "abandoned" via SessionManager
- SessionManager.startSession() accepts optional AbortSignal parameter
- waitForAnswers() checks signal.aborted in polling loop
- Abandoned sessions remain answerable with warning

### 3. CLI Commands (NEW)

- `auq answer <sessionId> --answers '{...}'` — Answer a session via CLI
- `auq answer <sessionId> --reject --reason "..."` — Reject a session via CLI
- `auq sessions list [--pending|--stale|--all]` — List sessions with status
- `auq sessions dismiss <sessionId>` — Remove/archive a stale session
- `auq config get [key]` — Read config value
- `auq config set <key> <value>` — Set config value
- All commands output JSON with --json flag

### 4. Configuration (staleThreshold + notifyOnStale + staleAction)

- staleThreshold: number (ms), default 7200000 (2 hours)
- notifyOnStale: boolean, default true
- staleAction: "warn" | "remove" | "archive", default "warn"
- Configurable via .auqrc.json and `auq config set`

### 5. Abandoned Session Answering

- Abandoned sessions remain in TUI (unlike current filtering behavior)
- Confirmation dialog when answering abandoned session
- CLI `auq answer` on abandoned session: warning + --force flag
- TUI shows abandoned sessions with distinct visual indicator

### 6. Interaction Grace Time

- When user interacts with a stale session (navigates to it), extend grace period
- Reset stale flag temporarily to allow completion
- Prevents timeout mid-answer

## Impact

- **Affected specs**: session-management, tui-application, cli-interface
- **Affected code**:
  - `src/mcp-server/server.ts` - AbortController tracking, disconnect handling
  - `src/mcp-server/session-manager.ts` - startSession signal parameter, abandoned status
  - `src/tui/session-watcher.ts` - stale calculation, grace time tracking
  - `src/tui/components/SessionPicker.tsx` - stale visual indicators
  - `src/tui/components/SessionDots.tsx` - abandoned state
  - `src/tui/hooks/useSessionManager.ts` - stale toast notifications
  - `src/tui/components/StepperView/` - abandoned confirmation dialog
  - `src/cli/commands/` - new CLI commands
  - `.auqrc.json` schema - new configuration options

## Breaking Changes

None. All changes are additive or change behavior in backward-compatible ways:

- New config options have defaults
- New CLI commands don't affect existing behavior
- Stale detection is advisory, not blocking
