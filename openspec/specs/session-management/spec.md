# session-management Specification

## Purpose
TBD - created by archiving change add-auq-configuration. Update Purpose after archive.
## Requirements
### Requirement: Session Configuration

The system SHALL use configurable values for session parameters including stale detection settings.

#### Scenario: Stale Threshold from Config

- **WHEN** config specifies `staleThreshold: 7200000` (2 hours)
- **THEN** the TUI SHALL use this value to determine stale sessions
- **AND** sessions older than this threshold SHALL be flagged as stale

#### Scenario: Notify On Stale from Config

- **WHEN** config specifies `notifyOnStale: true` (default)
- **THEN** the TUI SHALL display toast notifications for stale sessions
- **AND** when `notifyOnStale: false`, no notifications SHALL be shown

#### Scenario: Stale Action from Config

- **WHEN** config specifies `staleAction: "warn"` (default)
- **THEN** stale sessions SHALL show warnings but remain answerable
- **AND** when `staleAction: "remove"`, stale sessions SHALL be hidden
- **AND** when `staleAction: "archive"`, stale sessions SHALL be archived automatically

#### Scenario: Extended Configuration Defaults

- **WHEN** no config file exists or settings are unspecified
- **THEN** the system SHALL use built-in defaults:
  - maxOptions: 4
  - maxQuestions: 4
  - sessionTimeout: 0 (infinite)
  - retentionPeriod: 604800000 (7 days)
  - staleThreshold: 7200000 (2 hours)
  - notifyOnStale: true
  - staleAction: "warn"

### Requirement: AbortSignal Support for Session Lifecycle

The SessionManager SHALL accept an optional AbortSignal parameter to enable cancellation of long-running operations.

#### Scenario: Signal passed to startSession

- **WHEN** SessionManager.startSession() is called with an AbortSignal
- **THEN** the signal SHALL be associated with the session
- **AND** the signal SHALL be checked during waitForAnswers polling

#### Scenario: Signal abort during waitForAnswers

- **WHEN** the AbortSignal is aborted during waitForAnswers execution
- **THEN** waitForAnswers SHALL stop polling immediately
- **AND** the session status SHALL be updated to "abandoned"
- **AND** an error indicating cancellation SHALL be thrown

#### Scenario: Signal not provided (backward compatibility)

- **WHEN** SessionManager.startSession() is called without an AbortSignal
- **THEN** the session SHALL proceed normally without cancellation support
- **AND** waitForAnswers SHALL poll indefinitely (as before)

---

### Requirement: AI Disconnect Detection

The system SHALL detect when the AI client disconnects and mark associated sessions as abandoned.

#### Scenario: FastMCP disconnect event received

- **WHEN** the FastMCP server detects a client disconnect
- **THEN** all active AbortControllers for that client SHALL be aborted
- **AND** associated sessions SHALL be marked as "abandoned"

#### Scenario: Session marked abandoned on disconnect

- **WHEN** a session is active and the AI disconnects
- **THEN** the session's status.json SHALL be updated to "abandoned"
- **AND** the session SHALL remain in the filesystem for user reference

#### Scenario: Graceful handling without AbortSignal

- **WHEN** FastMCP does not provide disconnect events
- **THEN** sessions SHALL rely on stale detection (age-based) as fallback
- **AND** no errors SHALL be thrown to the user

