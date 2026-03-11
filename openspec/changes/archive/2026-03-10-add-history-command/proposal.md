# Change: Add History Command for Session Browsing

## Why

Users and AI agents need a way to review past question-answer interactions. Currently, there's no built-in way to:

- Browse completed sessions and their answers
- Check which sessions have been read by AI agents
- Search through historical questions and responses

This creates friction when users want to reference previous decisions or when AI agents need to verify what was already discussed.

## What Changes

- **ADDED**: `auq history` command - List all sessions with filtering and search
  - Shows session ID, status, time, read status, and question preview
  - Hidden abandoned sessions by default (shown with `--all`)
  - Table output with colors for human readability
  - JSON output with `--json` flag
  - Filter options: `--all`, `--limit N`, `--unread`, `--session ID`, `--search TEXT`
  - Hint message when abandoned sessions are hidden

- **ADDED**: `auq history show <id>` command - Display detailed session information
  - Shows session metadata (ID, status, time, read status)
  - Lists ALL questions with ALL options (selected + unselected)
  - Selected options marked with `(selected)` prefix
  - Option descriptions always included
  - JSON output with `--json` flag

- **MODIFIED**: `skills/ask-user-questions/SKILL.md` - Document history commands
  - Add CLI usage examples for `auq history`
  - Add CLI usage examples for `auq history show <id>`
  - Document filter options

- **ADDED**: Unit tests for history command formatting and filtering

## Impact

- **Affected specs**: `cli-interface`
- **Affected code**:
  - `bin/auq.tsx` - Add history command routing
  - `src/cli/commands/history.ts` - New history command implementation
  - `skills/ask-user-questions/SKILL.md` - Documentation updates
  - `src/__tests__/cli/history.test.ts` - Unit tests
- **Dependencies**: Requires `add-nonblocking-mode` for `lastReadAt` field (used by `--unread` filter)
