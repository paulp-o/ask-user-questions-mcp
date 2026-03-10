## 1. MCP Server - AbortSignal & Disconnect Handling

- [x] 1.1 Create Map<requestId, AbortController> in server.ts to track active sessions
- [x] 1.2 Modify SessionManager.startSession() to accept optional AbortSignal parameter
- [x] 1.3 Modify waitForAnswers() to check signal.aborted in polling loop
- [x] 1.4 Add FastMCP disconnect event handler in server.ts
- [x] 1.5 Implement disconnect handler to abort all controllers for disconnected request
- [x] 1.6 Add SessionManager.updateSessionStatus() call to mark sessions as "abandoned" on disconnect
- [x] 1.7 Add error handling for signal propagation failures
- [x] 1.8 Write unit tests for disconnect handling
- [x] 1.9 Write unit tests for AbortSignal integration

## 2. Session Manager - Abandoned Status Support

- [x] 2.1 Ensure SessionManager handles "abandoned" status correctly in all methods
- [x] 2.2 Update getPendingSessions() to optionally include abandoned sessions (with flag)
- [x] 2.3 Add isAbandoned(sessionId) helper method
- [x] 2.4 Write unit tests for abandoned status transitions

## 3. TUI Session Watcher - Stale Detection

- [x] 3.1 Add staleThreshold config loading (default 7200000ms)
- [x] 3.2 Implement isStale(session) calculation: (now - requestTimestamp) > staleThreshold
- [x] 3.3 Track lastInteraction timestamp per session
- [x] 3.4 Implement interaction detection (navigation, focus, input)
- [x] 3.5 Implement grace time: if interacted recently, session not stale
- [x] 3.6 Add getStaleSessions() method
- [x] 3.7 Update getPendingSessions() to return stale flag per session
- [x] 3.8 Write unit tests for stale detection logic
- [x] 3.9 Write unit tests for grace time calculation

## 4. TUI Session Picker - Stale Visual Indicators

- [x] 4.1 Add ⚠ warning icon for stale sessions in SessionPicker
- [x] 4.2 Apply warning/yellow color to stale session entries
- [x] 4.3 Add "may be orphaned" subtitle text for stale sessions
- [x] 4.4 Highlight session age in yellow for stale sessions
- [x] 4.5 Ensure stale sessions remain selectable/answerable
- [x] 4.6 Update tests for SessionPicker stale rendering

## 5. TUI Session Dots - Abandoned State

- [x] 5.1 Add distinct visual indicator for abandoned sessions (different from stale)
- [x] 5.2 Use red/danger color for abandoned state
- [x] 5.3 Add tooltip/hover text explaining "AI disconnected"
- [x] 5.4 Update tests for SessionDots abandoned rendering

## 6. TUI Toast Notifications - Stale Detection

- [x] 6.1 Add notifyOnStale config loading (default true)
- [x] 6.2 Implement stale detection trigger in useSessionManager hook
- [x] 6.3 Show Toast notification on first stale detection per session
- [x] 6.4 Toast message: "Session {id} may be orphaned (created X hours ago)"
- [x] 6.5 Ensure toast shows only once per session (track shown set)
- [x] 6.6 Write unit tests for toast triggering logic

## 7. TUI Confirmation Dialog - Abandoned Sessions

- [x] 7.1 Detect abandoned status when navigating to question
- [x] 7.2 Show confirmation dialog: "AI가 disconnect되었습니다. 그래도 답변하시겠습니까?"
- [x] 7.3 Dialog options: "답변하기" (continue) / "취소" (cancel)
- [x] 7.4 If cancelled, return to session list
- [x] 7.5 Track user choice to not show again (per-session)
- [x] 7.6 Update StepperView state machine for confirmation
- [x] 7.7 Write tests for confirmation dialog flow

## 8. CLI - Answer Command

- [x] 8.1 Create `src/cli/commands/answer.ts`
- [x] 8.2 Implement `auq answer <sessionId> --answers '{"0": {...}}'`
- [x] 8.3 Validate answers JSON format
- [x] 8.4 Write answers.json to session directory
- [x] 8.5 Update status.json to "completed"
- [x] 8.6 Handle abandoned sessions: warning + require --force flag
- [x] 8.7 Implement `auq answer <sessionId> --reject --reason "..."`
- [x] 8.8 Write status.json as "rejected" with reason
- [x] 8.9 Add human-readable output (default)
- [x] 8.10 Add --json flag for machine-readable output
- [x] 8.11 Write integration tests for answer command

## 9. CLI - Sessions List Command

- [x] 9.1 Create `src/cli/commands/sessions.ts`
- [x] 9.2 Implement `auq sessions list` (pending only, default)
- [x] 9.3 Add --pending flag (explicit)
- [x] 9.4 Add --stale flag (show only stale sessions)
- [x] 9.5 Add --all flag (show all sessions)
- [x] 9.6 Display: sessionId, status, age, stale indicator, question count
- [x] 9.7 Sort by creation time (newest first)
- [x] 9.8 Add --json flag
- [x] 9.9 Write integration tests for sessions list

## 10. CLI - Sessions Dismiss Command

- [x] 10.1 Implement `auq sessions dismiss <sessionId>`
- [x] 10.2 Archive session to `~/.local/share/auq/archive/{sessionId}/`
- [x] 10.3 Remove from active sessions directory
- [x] 10.4 Require confirmation for non-stale sessions (--force to skip)
- [x] 10.5 Add --json flag
- [x] 10.6 Write integration tests for dismiss command

## 11. CLI - Config Get Command

- [x] 11.1 Create `src/cli/commands/config.ts`
- [x] 11.2 Implement `auq config get` (show all config)
- [x] 11.3 Implement `auq config get <key>` (show specific key)
- [x] 11.4 Load from .auqrc.json (local then global)
- [x] 11.5 Merge with defaults for display
- [x] 11.6 Add --json flag
- [x] 11.7 Write integration tests for config get

## 12. CLI - Config Set Command

- [x] 12.1 Implement `auq config set <key> <value>`
- [x] 12.2 Write to local .auqrc.json (create if not exists)
- [x] 12.3 Validate key is allowed configuration key
- [x] 12.4 Validate value type matches schema
- [x] 12.5 Add --global flag to write to ~/.config/auq/.auqrc.json
- [x] 12.6 Add --json flag
- [x] 12.7 Write integration tests for config set

## 13. Configuration - New Options

- [x] 13.1 Add staleThreshold to config schema (number, default 7200000)
- [x] 13.2 Add notifyOnStale to config schema (boolean, default true)
- [x] 13.3 Add staleAction to config schema (enum: "warn" | "remove" | "archive", default "warn")
- [x] 13.4 Update config validation in loadConfig()
- [x] 13.5 Update .auqrc.json schema documentation
- [x] 13.6 Write tests for new config options

## 14. Documentation

- [x] 14.1 Update README.md with CLI commands documentation
- [x] 14.2 Document stale detection behavior
- [x] 14.3 Document abandoned session handling
- [x] 14.4 Add configuration reference for new options
- [x] 14.5 Update CHANGELOG.md

## 15. Validation & Testing

- [x] 15.1 Run `bunx openspec validate add-orphan-session-handling --strict`
- [x] 15.2 Run full test suite
- [x] 15.3 Manual testing: Create session, disconnect AI, verify abandoned status
- [x] 15.4 Manual testing: Wait 2h (or set low threshold), verify stale detection
- [x] 15.5 Manual testing: CLI answer command end-to-end
- [x] 15.6 Manual testing: CLI sessions list with filters
