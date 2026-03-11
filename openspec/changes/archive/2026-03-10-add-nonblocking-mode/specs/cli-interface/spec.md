## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: CLI Answer Command

The existing CLI answer command SHALL remain unchanged, but the documentation SHALL clarify interaction with read tracking.

#### Scenario: CLI answer does not mark as read

- **WHEN** answers are submitted via `auq answer` CLI command
- **THEN** the session SHALL NOT be automatically marked as read
- **AND** `lastReadAt` SHALL remain unchanged
- **AND** the session SHALL appear in --unread lists until fetched via MCP or fetch-answers
