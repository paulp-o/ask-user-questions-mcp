## ADDED Requirements

### Requirement: Non-blocking Session Creation

The SessionManager SHALL support creating sessions in non-blocking mode.

#### Scenario: Create session without waiting

- **WHEN** `SessionManager.startSession()` is called with `nonBlocking: true`
- **THEN** the session SHALL be created with status "pending"
- **AND** the method SHALL return immediately with session metadata
- **AND** the session SHALL be available for the TUI to display

#### Scenario: Non-blocking session available to TUI

- **WHEN** a non-blocking session is created
- **THEN** the TUI session watcher SHALL detect it normally
- **AND** the user SHALL be able to answer it through the TUI
- **AND** completion SHALL trigger normal answer file creation

---

### Requirement: Session Read Status Management

The system SHALL track and manage session read status.

#### Scenario: Mark session as read

- **WHEN** `SessionManager.markSessionAsRead(sessionId)` is called
- **THEN** the system SHALL update `answers.json` with `lastReadAt: <ISO timestamp>`
- **AND** the update SHALL use atomic file operations
- **AND** the method SHALL return the updated answers data

#### Scenario: Get unread sessions

- **WHEN** `SessionManager.getUnreadSessions()` is called
- **THEN** the system SHALL return all sessions where:
  1. Status is "completed" (answers.json exists)
  2. `lastReadAt` field is undefined or null
- **AND** the list SHALL be sorted by creation time (newest first)

#### Scenario: Get unread sessions excludes non-completed

- **WHEN** `SessionManager.getUnreadSessions()` is called
- **THEN** the system SHALL exclude sessions with status:
  - "pending" (not yet answered)
  - "rejected" (user rejected)
  - "abandoned" (AI disconnected)
  - "timed_out" (timeout expired)

#### Scenario: Idempotent read marking

- **WHEN** `markSessionAsRead()` is called multiple times for the same session
- **THEN** the `lastReadAt` timestamp SHALL be updated each time
- **AND** no error SHALL occur for repeated calls

---

### Requirement: Answers Data with Read Timestamp

The answers.json file SHALL support an optional `lastReadAt` field.

#### Scenario: Answers data includes lastReadAt

- **WHEN** answers.json is written after user submits answers
- **THEN** the file SHALL NOT include `lastReadAt` initially
- **AND** the field SHALL be added when first fetched by AI

#### Scenario: Read timestamp format

- **WHEN** `lastReadAt` is set
- **THEN** it SHALL be an ISO 8601 formatted timestamp
- **AND** it SHALL include timezone information (e.g., "2024-01-15T10:30:00.000Z")

#### Scenario: Backward compatibility for answers without lastReadAt

- **WHEN** reading answers.json files without `lastReadAt` field
- **THEN** the system SHALL treat them as unread
- **AND** the system SHALL NOT throw validation errors

---

### Requirement: Session ID Reference Format

The system SHALL support short session ID references in user-facing output.

#### Scenario: Short session ID format

- **WHEN** displaying a session ID to users
- **THEN** the system SHALL use the first 8 characters of the UUID
- **AND** the format SHALL be lowercase hexadecimal (e.g., "a3f2e8b1")

#### Scenario: Short ID collision handling

- **WHEN** displaying session IDs, collisions on first 8 chars are statistically negligible
- **THEN** the system SHALL use first 8 chars without additional disambiguation
- **AND** internal operations SHALL continue to use full UUID

---

### Requirement: Non-blocking Integration with Existing Lifecycle

Non-blocking sessions SHALL follow the same lifecycle rules as blocking sessions.

#### Scenario: Non-blocking session timeout

- **WHEN** a non-blocking session exceeds the configured timeout
- **THEN** it SHALL be marked as "timed_out"
- **AND** `get_answered_questions` SHALL return timeout status

#### Scenario: Non-blocking session stale detection

- **WHEN** a non-blocking session exceeds the stale threshold
- **THEN** it SHALL be flagged as stale
- **AND** the TUI SHALL display stale indicators

#### Scenario: Non-blocking session cleanup

- **WHEN** a non-blocking session exceeds the retention period
- **THEN** it SHALL be eligible for cleanup/archival
- **AND** existing cleanup rules SHALL apply unchanged

#### Scenario: Non-blocking session rejection

- **WHEN** a user rejects a non-blocking session via TUI
- **THEN** status SHALL be updated to "rejected"
- **AND** `get_answered_questions` SHALL return rejection status with reason

## MODIFIED Requirements

### Requirement: AbortSignal Support for Session Lifecycle

The SessionManager's AbortSignal support SHALL be extended for non-blocking fetch operations.

#### Scenario: Signal abort during blocking fetch

- **WHEN** `get_answered_questions` is called with `blocking: true` and an AbortSignal
- **AND** the signal is aborted during the wait
- **THEN** the fetch SHALL stop waiting immediately
- **AND** an error indicating cancellation SHALL be thrown
- **AND** the session SHALL NOT be marked as read

### Requirement: AI Disconnect Detection

AI disconnect detection SHALL work with non-blocking sessions.

#### Scenario: Non-blocking session marked abandoned on disconnect

- **WHEN** a non-blocking session is created
- **AND** the AI client disconnects before fetching answers
- **THEN** the session SHALL be marked as "abandoned"
- **AND** `get_answered_questions` SHALL return abandoned status
