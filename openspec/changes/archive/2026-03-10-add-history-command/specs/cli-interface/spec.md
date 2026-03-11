## ADDED Requirements

### Requirement: CLI History List Command

The system SHALL provide a CLI command to list and browse historical sessions.

#### Scenario: List all sessions (default view)

- **WHEN** user runs `auq history`
- **THEN** all non-abandoned sessions SHALL be displayed in a table
- **AND** columns SHALL include: ID (truncated), Status, Time, Read, Questions, Preview
- **AND** sessions SHALL be sorted by creation time (newest first)

#### Scenario: List with abandoned sessions hidden

- **WHEN** abandoned sessions exist in the system
- **AND** user runs `auq history` without `--all` flag
- **THEN** abandoned sessions SHALL be hidden from output
- **AND** a hint message SHALL be displayed: "N sessions shown (M abandoned hidden, use --all)"

#### Scenario: List with --all flag

- **WHEN** user runs `auq history --all`
- **THEN** all sessions SHALL be displayed including abandoned ones
- **AND** no hidden session hint SHALL be shown

#### Scenario: List with JSON output

- **WHEN** user runs `auq history --json`
- **THEN** output SHALL be a valid JSON array
- **AND** each element SHALL include: sessionId, status, createdAt, lastReadAt, questionCount, answeredCount, preview

#### Scenario: List with --limit flag

- **WHEN** user runs `auq history --limit 10`
- **THEN** at most 10 sessions SHALL be displayed
- **AND** default limit SHALL be 20 when not specified

#### Scenario: List with --unread filter

- **WHEN** user runs `auq history --unread`
- **THEN** only sessions where lastReadAt is null SHALL be displayed
- **AND** read sessions SHALL be excluded from output

#### Scenario: List with --session filter

- **WHEN** user runs `auq history --session <sessionId>`
- **THEN** only the session matching the specified ID SHALL be displayed
- **AND** if no match exists, an error message SHALL be shown

#### Scenario: List with --search filter

- **WHEN** user runs `auq history --search "database"`
- **THEN** only sessions containing the search term in question prompts OR answer text SHALL be displayed
- **AND** search SHALL be case-insensitive

#### Scenario: List with multiple filters

- **WHEN** user runs `auq history --unread --limit 5 --search "auth"`
- **THEN** all filters SHALL be applied in combination
- **AND** only matching sessions SHALL be displayed

---

### Requirement: CLI History Show Command

The system SHALL provide a CLI command to display detailed session information.

#### Scenario: Show session details

- **WHEN** user runs `auq history show <sessionId>`
- **THEN** the following metadata SHALL be displayed:
  - Session ID (full UUID)
  - Status with indicator (✓ completed, ✗ rejected, ⏳ pending, etc.)
  - Creation time in human-readable format with relative time
  - Read status with timestamp if read
  - Question count (e.g., "3/3 answered")

#### Scenario: Show all questions with options

- **WHEN** user runs `auq history show <sessionId>`
- **THEN** all questions SHALL be listed with sequential numbering
- **AND** each question SHALL display its prompt text
- **AND** all options SHALL be listed below each question
- **AND** selected options SHALL be prefixed with `(selected)`
- **AND** unselected options SHALL have no prefix
- **AND** option descriptions SHALL always be included after the label

#### Scenario: Show multi-select answers

- **WHEN** a question has multiple selected options
- **THEN** each selected option SHALL be marked with `(selected)`
- **AND** the order SHALL match the original question options

#### Scenario: Show custom text answers

- **WHEN** a user answered with "Other" custom text
- **THEN** the output SHALL display: `(selected) Other: 'custom text'`
- **AND** the custom text SHALL be quoted

#### Scenario: Show with JSON output

- **WHEN** user runs `auq history show <sessionId> --json`
- **THEN** output SHALL be valid JSON
- **AND** JSON SHALL include complete session data: metadata, all questions, all options, selected flags, custom answers

#### Scenario: Show non-existent session

- **WHEN** user runs `auq history show <invalidId>`
- **THEN** an error message SHALL be displayed: "Session not found: <invalidId>"
- **AND** exit code SHALL be non-zero

#### Scenario: Show abandoned session

- **WHEN** user runs `auq history show <abandonedSessionId>`
- **THEN** the session SHALL be displayed with status "abandoned"
- **AND** available information SHALL be shown (questions may not have answers)

---

### Requirement: History Output Formatting

The system SHALL format history output for human readability with optional machine-readable JSON.

#### Scenario: Table format with colors

- **WHEN** user runs `auq history` without `--json`
- **THEN** output SHALL use table format with column alignment
- **AND** status indicators SHALL use colors: green for completed, red for rejected, yellow for pending
- **AND** read indicators SHALL use checkmark (✓) for read, dash (─) for unread
- **AND** preview text SHALL be truncated with ellipsis if too long

#### Scenario: Relative time formatting

- **WHEN** displaying session time
- **THEN** relative time SHALL be shown (e.g., "2m ago", "1h ago", "3d ago")
- **AND** absolute timestamp SHALL be shown in parentheses for detail view

#### Scenario: Option description formatting

- **WHEN** displaying options in `history show`
- **THEN** format SHALL be: `Label — Description`
- **AND** the em-dash (—) SHALL separate label from description

---

### Requirement: History Command Skills Documentation

The system SHALL document history commands in the ask-user-questions skill.

#### Scenario: Skill documents history list command

- **WHEN** reading `skills/ask-user-questions/SKILL.md`
- **THEN** the document SHALL include a "History" section
- **AND** it SHALL document: `auq history` for listing sessions
- **AND** it SHALL list all filter options: `--all`, `--json`, `--limit`, `--unread`, `--session`, `--search`

#### Scenario: Skill documents history show command

- **WHEN** reading `skills/ask-user-questions/SKILL.md`
- **THEN** the document SHALL document: `auq history show <id>` for viewing details
- **AND** it SHALL explain that all options (selected + unselected) are shown
- **AND** it SHALL document the `--json` flag for programmatic access
