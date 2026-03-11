# cli-interface Specification

## Purpose
TBD - created by archiving change add-auq-configuration. Update Purpose after archive.
## Requirements
### Requirement: Configuration File Loading

The system SHALL load configuration from JSON files including new stale detection settings.

#### Scenario: Stale detection configuration

- **WHEN** a `.auqrc.json` file contains `staleThreshold`, `notifyOnStale`, or `staleAction`
- **THEN** these values SHALL be loaded and validated
- **AND** invalid values SHALL trigger warnings with fallback to defaults

#### Scenario: Extended config schema validation

- **WHEN** a config file contains invalid stale detection settings
- **THEN** the system SHALL display a specific warning message
- **AND** continue with default values for the invalid settings

#### Scenario: Config precedence with new options

- **WHEN** both local and global config files contain stale detection settings
- **THEN** local settings SHALL override global settings
- **AND** all stale detection parameters SHALL follow the same precedence rules

### Requirement: Configurable Question Limits

The system SHALL respect configured limits for questions and options.

#### Scenario: Custom Max Options

- **WHEN** config specifies `maxOptions: 6`
- **THEN** the Zod schema SHALL validate options arrays with max 6 items
- **AND** AI requests exceeding this limit SHALL fail validation

#### Scenario: Custom Max Questions

- **WHEN** config specifies `maxQuestions: 6`
- **THEN** the Zod schema SHALL validate questions arrays with max 6 items

#### Scenario: Recommended Counts

- **WHEN** config specifies `recommendedOptions` or `recommendedQuestions`
- **THEN** these values SHALL be included in tool description for AI guidance

---

### Requirement: Language Configuration

The system SHALL support language settings for TUI localization.

#### Scenario: Auto Language Detection

- **WHEN** config specifies `language: "auto"` or omits language setting
- **THEN** the system SHALL detect language from:
  1. LANG environment variable
  2. System locale via Intl API
  3. Fallback to English

#### Scenario: Explicit Language Setting

- **WHEN** config specifies `language: "ko"` (or other valid language code)
- **THEN** the TUI SHALL display all text in the specified language

#### Scenario: Unsupported Language Fallback

- **WHEN** config specifies an unsupported language code
- **THEN** the system SHALL fall back to English
- **AND** display a warning about unsupported language

### Requirement: CLI Answer Command

The existing CLI answer command SHALL remain unchanged, but the documentation SHALL clarify interaction with read tracking.

#### Scenario: CLI answer does not mark as read

- **WHEN** answers are submitted via `auq answer` CLI command
- **THEN** the session SHALL NOT be automatically marked as read
- **AND** `lastReadAt` SHALL remain unchanged
- **AND** the session SHALL appear in --unread lists until fetched via MCP or fetch-answers

### Requirement: CLI Sessions List Command

The system SHALL provide a CLI command to list and manage sessions.

#### Scenario: List pending sessions (default)

- **WHEN** user runs `auq sessions list`
- **THEN** only pending sessions SHALL be displayed
- **AND** output SHALL include: sessionId, status, age, question count

#### Scenario: List with --pending flag

- **WHEN** user runs `auq sessions list --pending`
- **THEN** only pending sessions SHALL be displayed
- **AND** this SHALL be equivalent to the default behavior

#### Scenario: List with --stale flag

- **WHEN** user runs `auq sessions list --stale`
- **THEN** only stale sessions SHALL be displayed
- **AND** each entry SHALL include stale indicator

#### Scenario: List with --all flag

- **WHEN** user runs `auq sessions list --all`
- **THEN** all sessions SHALL be displayed regardless of status
- **AND** each entry SHALL include its current status

#### Scenario: Sessions list sorted by creation time

- **WHEN** sessions are listed
- **THEN** they SHALL be sorted by creation time (newest first)
- **AND** the age SHALL be displayed in human-readable format

#### Scenario: Sessions list JSON output

- **WHEN** user runs `auq sessions list` with --json flag
- **THEN** output SHALL be valid JSON array
- **AND** each element SHALL include: sessionId, status, createdAt, age, stale, questionCount

---

### Requirement: CLI Sessions Dismiss Command

The system SHALL provide a CLI command to dismiss/archive sessions.

#### Scenario: Dismiss stale session

- **WHEN** user runs `auq sessions dismiss <sessionId>`
- **AND** the session is stale
- **THEN** the session SHALL be archived to `~/.local/share/auq/archive/{sessionId}/`
- **AND** the session SHALL be removed from the active sessions directory

#### Scenario: Dismiss non-stale session requires force

- **WHEN** user attempts to dismiss a non-stale session
- **THEN** a confirmation prompt SHALL be displayed
- **AND** when --force is provided, the dismiss SHALL proceed without prompt
- **AND** when --force is not provided and user declines, the command SHALL exit

#### Scenario: Dismiss command JSON output

- **WHEN** user runs `auq sessions dismiss` with --json flag
- **THEN** output SHALL be valid JSON
- **AND** the JSON SHALL include: success boolean, sessionId, archivedTo path

---

### Requirement: CLI Config Get Command

The system SHALL provide a CLI command to read configuration values.

#### Scenario: Get all config values

- **WHEN** user runs `auq config get`
- **THEN** all configuration values SHALL be displayed
- **AND** local settings SHALL override global settings as applicable
- **AND** defaults SHALL be shown for unspecified values

#### Scenario: Get specific config value

- **WHEN** user runs `auq config get <key>` (e.g., `auq config get staleThreshold`)
- **THEN** only the specified key's value SHALL be displayed
- **AND** the effective value (after merging) SHALL be shown

#### Scenario: Config get with local and global files

- **WHEN** both local and global config files exist
- **THEN** local values SHALL take precedence
- **AND** global values SHALL be shown as fallback

#### Scenario: Config get JSON output

- **WHEN** user runs `auq config get` with --json flag
- **THEN** output SHALL be valid JSON object
- **AND** the JSON SHALL include all config keys and their effective values

---

### Requirement: CLI Config Set Command

The system SHALL provide a CLI command to write configuration values.

#### Scenario: Set config value locally

- **WHEN** user runs `auq config set <key> <value>` (e.g., `auq config set staleThreshold 3600000`)
- **THEN** the value SHALL be written to local `.auqrc.json`
- **AND** the file SHALL be created if it does not exist
- **AND** the value SHALL be validated against the schema

#### Scenario: Set config value globally

- **WHEN** user runs `auq config set <key> <value> --global`
- **THEN** the value SHALL be written to `~/.config/auq/.auqrc.json`
- **AND** the directory SHALL be created if it does not exist

#### Scenario: Set invalid config value

- **WHEN** user attempts to set an invalid value (wrong type or out of range)
- **THEN** an error message SHALL be displayed
- **AND** the exit code SHALL be non-zero
- **AND** the config file SHALL NOT be modified

#### Scenario: Set unknown config key

- **WHEN** user attempts to set an unknown configuration key
- **THEN** an error message SHALL list valid keys
- **AND** the exit code SHALL be non-zero

#### Scenario: Config set JSON output

- **WHEN** user runs `auq config set` with --json flag
- **THEN** output SHALL be valid JSON
- **AND** the JSON SHALL include: success boolean, key, value, file (local or global)

### Requirement: Update CLI Command

The system SHALL provide a CLI command to manually check for and install updates.

#### Scenario: Check and install updates interactively

- **WHEN** user runs `auq update`
- **THEN** the system SHALL:
  1. Query npm registry for the latest version of `auq-mcp-server`
  2. Compare with currently installed version
  3. If newer version exists, display version info (current → latest) and changelog
  4. Prompt user for confirmation to install
  5. On confirmation, auto-detect package manager and run install command
  6. Display progress during installation
  7. On success, display "Update complete, please restart auq" and exit
  8. On failure, display error message with copyable manual update command

#### Scenario: Skip confirmation with -y flag

- **WHEN** user runs `auq update -y`
- **THEN** the system SHALL skip confirmation prompt
- **AND** proceed directly to installation if update is available

#### Scenario: No update available

- **WHEN** user runs `auq update` and current version is already latest
- **THEN** the system SHALL display "Already up to date" message
- **AND** exit with code 0

#### Scenario: Update command with network error

- **WHEN** npm registry query fails (network error, timeout)
- **THEN** the system SHALL display "Unable to check for updates" message
- **AND** exit with non-zero code
- **AND** NOT attempt installation

---

### Requirement: CLI Update Notification

The system SHALL display update notifications for non-TUI CLI commands.

#### Scenario: One-line update notification

- **WHEN** user runs non-TUI commands like `auq ask`, `auq sessions`, `auq answer`, `auq config`
- **AND** a newer version is available
- **AND** update check is not disabled via config or environment
- **THEN** the system SHALL print a one-line message to stderr:
  - Format: "Update available: {current} → {latest}. Run `auq update` to upgrade."
- **AND** the message SHALL NOT block command execution
- **AND** the message SHALL NOT affect command output (stdout)

#### Scenario: No notification in CI environments

- **WHEN** `CI=true` environment variable is set
- **THEN** the system SHALL NOT display update notifications
- **AND** SHALL NOT perform update checks

#### Scenario: No notification with NO_UPDATE_NOTIFIER

- **WHEN** `NO_UPDATE_NOTIFIER=1` environment variable is set
- **THEN** the system SHALL NOT display update notifications
- **AND** SHALL NOT perform update checks

#### Scenario: No notification in test environment

- **WHEN** `NODE_ENV=test` environment variable is set
- **THEN** the system SHALL NOT display update notifications
- **AND** SHALL NOT perform update checks

---

### Requirement: Update Configuration Option

The system SHALL support disabling automatic update checks via configuration.

#### Scenario: Disable update checks via config

- **WHEN** config specifies `updateCheck: false`
- **THEN** the system SHALL NOT perform automatic update checks
- **AND** SHALL NOT display update notifications in CLI
- **AND** SHALL NOT show update prompts in TUI
- **AND** the `auq update` command SHALL still work when invoked manually

#### Scenario: Default update check enabled

- **WHEN** no config file exists or `updateCheck` key is missing
- **THEN** the system SHALL default to `updateCheck: true`
- **AND** automatic update checks SHALL be enabled

#### Scenario: Config schema validation

- **WHEN** reading `updateCheck` configuration value
- **THEN** the system SHALL validate it as a boolean
- **AND** invalid values SHALL trigger a warning with fallback to default (true)

### Requirement: Non-blocking Question Mode

The system SHALL support a non-blocking mode for the `ask_user_questions` MCP tool, allowing AI agents to submit questions without waiting for answers.

#### Scenario: Non-blocking submission with immediate return

- **WHEN** the `ask_user_questions` tool is called with `nonBlocking: true`
- **THEN** the system SHALL create the session and return immediately
- **AND** the response SHALL include:

  ```
  [Session: a3f2e8b1 | Questions: 3 | Status: pending]

  Questions submitted successfully.
  Use get_answered_questions(session_id="a3f2e8b1") or `auq fetch-answers a3f2e8b1` to retrieve answers.
  ```

- **AND** the session SHALL remain in "pending" status

#### Scenario: Non-blocking parameter default value

- **WHEN** the `ask_user_questions` tool is called without `nonBlocking` parameter
- **THEN** the system SHALL default to `nonBlocking: false`
- **AND** the system SHALL wait for user answers before returning (existing behavior)

#### Scenario: Non-blocking with blocking set to false explicitly

- **WHEN** the `ask_user_questions` tool is called with `nonBlocking: false`
- **THEN** the system SHALL wait for user answers before returning (existing blocking behavior)

---

### Requirement: Blocking Response Metadata Header

The system SHALL prepend metadata to all blocking responses from `ask_user_questions`.

#### Scenario: Blocking response with session metadata

- **WHEN** the `ask_user_questions` tool completes with answers (blocking mode)
- **THEN** the response SHALL include metadata header before the answer content:

  ```
  [Session: a3f2e8b1 | Questions: 3]

  Here are the user's answers:

  1. Question prompt text
  → Option A — Option description text
  ```

- **AND** the session ID SHALL be the short form (first 8 characters)
- **AND** option descriptions SHALL be included in the formatted output

#### Scenario: Metadata header format consistency

- **WHEN** any blocking response is generated
- **THEN** the metadata header SHALL follow the format: `[Session: {shortId} | Questions: {count}]`
- **AND** the format SHALL be consistent across all response types (answers, rejection, timeout)

---

### Requirement: Get Answered Questions MCP Tool

The system SHALL provide a new MCP tool `get_answered_questions` for asynchronously fetching answers.

#### Scenario: Fetch answers for completed session

- **WHEN** `get_answered_questions` is called with `session_id` and the session is completed
- **THEN** the system SHALL return the formatted answers:

  ```
  [Session: a3f2e8b1 | Questions: 3]

  Here are the user's answers:

  1. Question prompt text
  → Option A — Option description text
  ```

- **AND** the session SHALL be marked as read (update `lastReadAt`)

#### Scenario: Fetch answers for pending session (non-blocking)

- **WHEN** `get_answered_questions` is called with `session_id` and `blocking: false`
- **AND** the session status is "pending"
- **THEN** the system SHALL return:

  ```
  [Session: a3f2e8b1 | Status: pending | Remaining: 4m 45s]

  No answers yet.
  ```

- **AND** the remaining time SHALL be calculated from session timeout if configured

#### Scenario: Fetch answers for rejected session

- **WHEN** `get_answered_questions` is called with `session_id` and the session is rejected
- **THEN** the system SHALL return:

  ```
  [Session: a3f2e8b1 | Status: rejected]

  User rejected this question set. Reason: "not applicable"
  ```

- **AND** if no reason was provided, the reason line SHALL be omitted

#### Scenario: Fetch with blocking wait until answered

- **WHEN** `get_answered_questions` is called with `session_id` and `blocking: true`
- **AND** the session status is "pending"
- **THEN** the system SHALL wait until the session is completed or rejected
- **AND** then return the formatted answers or rejection message
- **AND** the session SHALL be marked as read upon return

#### Scenario: Invalid session ID

- **WHEN** `get_answered_questions` is called with a non-existent `session_id`
- **THEN** the system SHALL return an error indicating session not found
- **AND** the error SHALL include the provided session ID for debugging

---

### Requirement: Fetch Answers CLI Command

The system SHALL provide a CLI command `auq fetch-answers` for retrieving answers.

#### Scenario: Fetch answers for specific session

- **WHEN** user runs `auq fetch-answers a3f2e8b1`
- **THEN** the system SHALL check the session status
- **AND** if completed, display formatted answers with metadata header
- **AND** if pending, display pending status with remaining time
- **AND** if rejected, display rejection reason

#### Scenario: Fetch with blocking flag

- **WHEN** user runs `auq fetch-answers a3f2e8b1 --blocking`
- **THEN** the system SHALL wait until the session is completed or rejected
- **AND** then display the results
- **AND** the command SHALL exit with code 0 on success

#### Scenario: Fetch with JSON output

- **WHEN** user runs `auq fetch-answers a3f2e8b1 --json`
- **THEN** the system SHALL output valid JSON
- **AND** the JSON SHALL include: `sessionId`, `status`, `answers` (if completed), `lastReadAt` (if previously read)

#### Scenario: List unread sessions

- **WHEN** user runs `auq fetch-answers --unread`
- **THEN** the system SHALL list all sessions with answers that have not been read
- **AND** each entry SHALL include: session ID, status, age, question count
- **AND** output SHALL be formatted as a table

#### Scenario: Default behavior without arguments

- **WHEN** user runs `auq fetch-answers` without session-id and without --unread
- **THEN** the system SHALL display all unread sessions (same as --unread)
- **AND** display a message if no unread sessions exist

#### Scenario: Fetch answers marks session as read

- **WHEN** `auq fetch-answers` retrieves answers for a completed session
- **THEN** the system SHALL update `lastReadAt` in answers.json
- **AND** subsequent --unread lists SHALL exclude this session

---

### Requirement: Session Read Tracking

The system SHALL track when answers have been fetched by AI agents.

#### Scenario: Mark session as read on MCP fetch

- **WHEN** `get_answered_questions` returns answers for a session
- **THEN** the system SHALL update `lastReadAt` in answers.json with current ISO timestamp
- **AND** this SHALL occur for both blocking and non-blocking fetch calls

#### Scenario: Mark session as read on CLI fetch

- **WHEN** `auq fetch-answers` returns answers for a session
- **THEN** the system SHALL update `lastReadAt` in answers.json with current ISO timestamp

#### Scenario: Unread session detection

- **WHEN** listing unread sessions
- **THEN** the system SHALL include sessions where:
  1. Status is "completed" AND
  2. `lastReadAt` is undefined or null
- **AND** the system SHALL exclude rejected, pending, or abandoned sessions

#### Scenario: Read timestamp persistence

- **WHEN** a session is marked as read
- **THEN** the `lastReadAt` timestamp SHALL persist in answers.json
- **AND** it SHALL survive TUI restarts and CLI invocations

---

### Requirement: Option Description in Formatted Output

The system SHALL include option descriptions in all formatted text responses.

#### Scenario: Answer with option description

- **WHEN** formatting an answer that selected an option with a description
- **THEN** the output SHALL include the description:
  ```
  → Option A — Description of what this option means
  ```
- **AND** the format SHALL be: `→ {label} — {description}`

#### Scenario: Answer without option description

- **WHEN** formatting an answer for an option without a description
- **THEN** the output SHALL show only the label:
  ```
  → Option A
  ```
- **AND** no em-dash SHALL be appended

#### Scenario: Custom input answer

- **WHEN** formatting a custom text input answer
- **THEN** the output SHALL show:
  ```
  → Other: 'custom text entered by user'
  ```

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

