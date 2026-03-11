## 1. Implementation

### 1.1 Create History Command Module

- [x] Create `src/cli/commands/history.ts` with list and show subcommands
- [x] Implement `listHistory()` function with filtering logic
- [x] Implement `showHistory()` function for detail view
- [x] Add session status type definitions (completed, rejected, pending, timed_out, abandoned)

### 1.2 CLI Integration

- [x] Add `history` command to `bin/auq.tsx` CLI router
- [x] Implement `history list` as default subcommand
- [x] Implement `history show <id>` subcommand
- [x] Add all filter flags: `--all`, `--json`, `--limit`, `--unread`, `--session`, `--search`

### 1.3 Output Formatting

- [x] Implement table formatter for human-readable output
- [x] Add color coding for status indicators
- [x] Implement relative time formatting (e.g., "2m ago")
- [x] Add abandoned session count hint when applicable
- [x] Implement JSON formatter for `--json` flag

### 1.4 Detail View Formatting

- [x] Format session metadata header
- [x] List all questions with numbering
- [x] Show all options with `(selected)` prefix for chosen options
- [x] Include option descriptions in output
- [x] Handle custom text answers ("Other" option)

### 1.5 Skills Documentation

- [x] Update `skills/ask-user-questions/SKILL.md`
- [x] Add `auq history` usage section
- [x] Add `auq history show <id>` usage section
- [x] Document all filter options

## 2. Testing

- [x] Create `src/cli/commands/__tests__/history.test.ts`
- [x] Test list command with various filter combinations
- [x] Test show command with different session types
- [x] Test JSON output format
- [x] Test table formatting edge cases
- [x] Test search functionality

## 3. Validation

- [x] Run `openspec validate add-history-command --strict`
- [x] Fix any validation issues
- [x] Verify all requirements have scenarios
- [x] Verify spec format compliance
