## Context

This change introduces non-blocking question mode to AUQ, allowing AI agents to submit questions asynchronously and fetch answers later. This is a cross-cutting change affecting MCP server, CLI, session management, and documentation.

Key constraints:

- Must maintain backward compatibility (blocking is default)
- Must work with existing 3-file session storage structure
- Must integrate with existing stale/abandoned session detection
- Must support both MCP tool and CLI interfaces

## Goals / Non-Goals

**Goals:**

- Enable asynchronous question-answer workflows
- Provide clear session identification in responses
- Track read status for answer retrieval
- Support both blocking and non-blocking fetch operations
- Maintain existing UX for synchronous workflows

**Non-Goals:**

- Changing session storage structure (keep 3 files)
- Adding per-question read tracking (session-level only)
- Creating history browsing capabilities (separate change)
- Modifying TUI behavior
- Adding question-level filtering in fetch operations

## Decisions

### Decision: Session-level read tracking (not per-question)

**Rationale**: Simpler implementation, matches typical use case where AI fetches all answers at once. Per-question granularity adds complexity without clear benefit.

### Decision: lastReadAt in answers.json

**Rationale**: answers.json is the natural place for read tracking since it represents the completion of the question-answer cycle. Status.json tracks session state, request.json tracks input - answers.json tracks output and now consumption.

### Decision: Metadata header format `[Session: {id} | Questions: {count}]`

**Rationale**: Concise, machine-parseable format that provides essential context without cluttering the response. Short ID (first 8 chars) balances readability with uniqueness.

### Decision: Simple get_answered_questions schema (session_id + blocking only)

**Rationale**: User explicitly requested simplicity. No filtering, no question_ids, no mark_as_read parameters. Keeps the API clean and focused.

### Decision: fetch-answers CLI with --unread flag

**Rationale**: Provides convenient way to discover unread sessions without needing to know session IDs upfront. Common workflow: check what's available, then fetch specific sessions.

### Decision: Option descriptions in formatted output

**Rationale**: User requested that formatted text responses include option descriptions for better context. This applies to both blocking and non-blocking modes.

## Risks / Trade-offs

**Risk**: Users may forget to fetch answers in non-blocking mode

- **Mitigation**: Skill documentation emphasizes workflow; unread sessions are discoverable via `--unread` flag

**Risk**: Session ID confusion (full vs short)

- **Mitigation**: Always display short ID (first 8 chars) in user-facing messages; accept both full and short IDs in CLI

**Risk**: Breaking existing integrations that parse response text

- **Mitigation**: Metadata header is prepended, not replacing existing format; existing text patterns remain intact

## Migration Plan

No migration needed - this is an additive, backward-compatible change.

Existing code continues to work unchanged:

- `nonBlocking` defaults to `false`
- Response format additions are prepended, not replacing
- New tools don't affect existing functionality

## Open Questions

None - all design decisions confirmed with user.
