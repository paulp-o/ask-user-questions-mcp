## Context

AUQ uses a file-based IPC architecture between AI (MCP server) and TUI. The current state machine has these statuses: `pending`, `in-progress`, `completed`, `rejected`, `timed_out`, `abandoned`.

The orphan problem occurs when:

1. AI creates a session via `ask_user_questions`
2. TUI displays the questions
3. AI disconnects, cancels, or the session times out
4. User answers the questions
5. Answers are written but never consumed
6. Session remains in TUI for 7 days (retentionPeriod)

## Goals

1. **Detect stale sessions**: Identify sessions that may be orphaned based on age
2. **Handle AI disconnect**: Properly mark sessions as abandoned when AI disconnects
3. **Enable CLI management**: Allow headless operation for answering and managing sessions
4. **Preserve UX**: Keep sessions answerable even if stale/abandoned, with clear warnings
5. **Graceful degradation**: Continue working even if FastMCP doesn't support AbortSignal

## Non-Goals

1. **Real-time sync**: Don't require constant heartbeat/ping between AI and TUI
2. **Automatic cleanup**: Don't auto-remove stale sessions (user choice preserved)
3. **Network protocol changes**: Keep file-based IPC architecture
4. **Complex state machine**: Don't add new status values

## Decisions

### Decision 1: Keep sessionTimeout=0 (infinite) default

- **Rationale**: AI should not arbitrarily timeout sessions. User may take hours to answer.
- **Stale detection** replaces timeout as UX indicator
- **Alternative considered**: Change default to 2 hours — rejected as too restrictive

### Decision 2: FastMCP disconnect event + manual AbortController

- **Rationale**: FastMCP v3.31 doesn't expose AbortSignal to tool handlers. Use disconnect event as workaround.
- **Implementation**: Track requestId → AbortController in server.ts. On disconnect, abort all controllers for that request.
- **Alternative considered**: Patch FastMCP — rejected as maintenance burden

### Decision 3: Reuse "abandoned" status for AI disconnect

- **Rationale**: Status already exists and has right semantics
- **No new status**: Avoid changing status.json schema
- **Alternative considered**: New "disconnected" status — rejected as unnecessary

### Decision 4: Stale is computed flag, not persisted status

- **Rationale**: TUI can recalculate anytime. No need for atomic updates to status.json
- **Implementation**: `isStale = (now - requestTimestamp) > staleThreshold`
- **Alternative considered**: Write "stale" to status.json — rejected as adds write contention

### Decision 5: Abandoned sessions remain answerable with confirmation

- **Rationale**: User might still want to provide answers for their own records, even if AI won't receive them
- **Implementation**: Confirmation dialog in TUI, --force flag in CLI
- **Alternative considered**: Block abandoned sessions entirely — rejected as too restrictive

### Decision 6: CLI uses JSON for structured I/O

- **Rationale**: AI can consume CLI output programmatically
- **Default output**: Human-readable text
- **--json flag**: Machine-readable JSON

### Decision 7: staleThreshold default = 2h (7200000ms)

- **Rationale**: Long enough for normal use, short enough to catch orphans reasonably fast
- **User customizable**: Via .auqrc.json or `auq config set`

### Decision 8: Interaction resets stale check for that session

- **Rationale**: Prevents timeout while user is actively answering
- **Implementation**: Track "lastInteraction" timestamp in session-watcher
- **Alternative considered**: Extend staleThreshold globally — rejected as too broad

## Risks / Trade-offs

| Risk                                           | Mitigation                                                        |
| ---------------------------------------------- | ----------------------------------------------------------------- |
| FastMCP disconnect event may not fire reliably | Graceful fallback: sessions eventually become stale via age check |
| StaleThreshold too aggressive                  | User configurable; default 2h is conservative                     |
| CLI answers to abandoned sessions lost forever | Warning message clearly states "AI will not receive this"         |
| TUI performance with many stale sessions       | Pagination/limiting in SessionPicker already exists               |
| Grace time logic complexity                    | Simple timestamp comparison, no background timers                 |

## Migration Plan

1. **New config options** have defaults, no migration needed
2. **Existing sessions** will show stale indicators immediately if age > 2h
3. **No breaking changes** to file format or API
4. **Rollback**: Revert code, delete stale config keys from .auqrc.json

## Open Questions

None resolved during design phase.
