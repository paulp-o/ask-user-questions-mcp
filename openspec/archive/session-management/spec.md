# Session Management Capability

Provides file-based session lifecycle management for coordinating between MCP server/CLI and TUI applications.

## Overview

The session management system enables asynchronous communication between AI tool calls and the user-facing TUI through a file-based IPC mechanism. It ensures data integrity through atomic operations and supports concurrent access from multiple processes.

**Key Files:**

- `src/session/SessionManager.ts` - Core session orchestration
- `src/session/types.ts` - TypeScript interfaces
- `src/session/atomic-operations.ts` - File safety primitives
- `src/session/file-watcher.ts` - FS event handling
- `src/session/ResponseFormatter.ts` - AI response formatting
- `src/session/utils.ts` - Helper functions

---

## Requirements

### Requirement: Session Creation

The system SHALL create sessions with unique identifiers and proper file structure.

#### Scenario: New Session

- **WHEN** a new session is created with questions
- **THEN** the system SHALL:
  1. Generate a UUID v4 session ID
  2. Create a session directory with the ID as name
  3. Write `request.json` with questions and metadata
  4. Write `status.json` with initial "pending" status
  5. Return the session ID

#### Scenario: Session Directory Permissions

- **WHEN** session files are created
- **THEN** they SHALL have 0o600 permissions (owner read/write only)

#### Scenario: Empty Questions Rejected

- **WHEN** createSession is called with empty questions array
- **THEN** the system SHALL throw: "At least one question is required to create a session"

---

### Requirement: Session Lifecycle States

The system SHALL manage sessions through a defined state machine.

#### Scenario: Pending State

- **WHEN** a session is created
- **THEN** status SHALL be "pending"

#### Scenario: Completed State

- **WHEN** user submits valid answers
- **THEN** status SHALL transition to "completed"

#### Scenario: Rejected State

- **WHEN** user rejects the question set
- **THEN** status SHALL transition to "rejected"
- **AND** rejectionReason SHALL be recorded if provided

#### Scenario: Timed Out State

- **WHEN** session exceeds the configured timeout
- **THEN** status SHALL transition to "timed_out"

#### Scenario: Abandoned State

- **WHEN** validation fails or JSON parsing errors occur
- **THEN** status SHALL transition to "abandoned"

---

### Requirement: Session File Format

The system SHALL store session data in well-defined JSON file formats.

#### Scenario: Request File (request.json)

- **WHEN** a session is created
- **THEN** request.json SHALL contain:
  - `sessionId`: UUID v4 string
  - `questions`: Array of Question objects
  - `status`: Current status string
  - `timestamp`: ISO 8601 timestamp
  - `callId`: Optional MCP call identifier

#### Scenario: Status File (status.json)

- **WHEN** a session is created
- **THEN** status.json SHALL contain:
  - `sessionId`: UUID v4 string
  - `status`: Current lifecycle status
  - `createdAt`: ISO 8601 timestamp
  - `lastModified`: ISO 8601 timestamp
  - `totalQuestions`: Number of questions
  - `callId`: Optional MCP call identifier
  - `rejectionReason`: Optional rejection reason (null if not rejected)

#### Scenario: Answers File (answers.json)

- **WHEN** user submits answers
- **THEN** answers.json SHALL contain:
  - `sessionId`: UUID v4 string
  - `answers`: Array of UserAnswer objects
  - `timestamp`: ISO 8601 timestamp
  - `callId`: Optional MCP call identifier

---

### Requirement: Atomic File Operations

The system SHALL use atomic operations for all file writes to prevent corruption.

#### Scenario: Atomic Write

- **WHEN** writing session data
- **THEN** the system SHALL:
  1. Write to a temporary file first
  2. Verify the written content
  3. Atomic rename to target path
  4. Set correct file permissions

#### Scenario: File Locking

- **WHEN** multiple processes access the same file
- **THEN** the system SHALL use PID-based lock files
- **AND** detect and clean up stale locks

#### Scenario: Write Failure Recovery

- **WHEN** a write operation fails
- **THEN** the system SHALL:
  - Clean up temporary files
  - Throw AtomicWriteError with details

#### Scenario: Atomic Read with Retry

- **WHEN** reading session files
- **THEN** the system SHALL retry up to 3 times with exponential backoff

---

### Requirement: Answer Submission

The system SHALL validate and persist user answers.

#### Scenario: Valid Answers

- **WHEN** saveSessionAnswers is called with valid answers
- **THEN** the system SHALL:
  1. Verify session exists
  2. Write answers.json
  3. Update status to "completed"

#### Scenario: Session Not Found

- **WHEN** saveSessionAnswers is called for non-existent session
- **THEN** the system SHALL throw: "Session not found: {sessionId}"

---

### Requirement: Session Rejection

The system SHALL allow users to reject question sets with optional feedback.

#### Scenario: Rejection with Reason

- **WHEN** rejectSession is called with a reason
- **THEN** status SHALL be "rejected"
- **AND** rejectionReason SHALL contain the user's feedback

#### Scenario: Rejection without Reason

- **WHEN** rejectSession is called without a reason
- **THEN** status SHALL be "rejected"
- **AND** rejectionReason SHALL be null

---

### Requirement: Waiting for Answers

The system SHALL poll for answer submission with configurable timeout.

#### Scenario: Polling for Completion

- **WHEN** waitForAnswers is called
- **THEN** the system SHALL poll every 200ms for:
  - answers.json file creation
  - status change to "rejected"
  - timeout expiration

#### Scenario: CallId Verification

- **WHEN** expectedCallId is provided
- **THEN** the system SHALL verify the callId matches before resolving

#### Scenario: Rejection Detection

- **WHEN** status becomes "rejected" during wait
- **THEN** the system SHALL throw: "SESSION_REJECTED"

---

### Requirement: Session Cleanup

The system SHALL garbage collect old sessions based on retention period.

#### Scenario: Retention-Based Cleanup

- **WHEN** cleanupExpiredSessions is called
- **THEN** sessions older than retentionPeriod (default 7 days) SHALL be deleted

#### Scenario: Cleanup Failure Isolation

- **WHEN** cleanup of one session fails
- **THEN** the system SHALL continue cleaning other sessions
- **AND** log a warning

---

### Requirement: Response Formatting

The system SHALL format answers according to PRD specification.

#### Scenario: Single-Select Format

- **WHEN** formatting a single-select answer
- **THEN** output SHALL be: `→ {label} — {description}` or `→ {label}` if no description

#### Scenario: Multi-Select Format

- **WHEN** formatting a multi-select answer
- **THEN** each selection SHALL appear on its own line with `→` prefix

#### Scenario: Custom Text Format

- **WHEN** formatting a custom text answer
- **THEN** output SHALL be: `→ Other: '{escapedText}'`

#### Scenario: Empty Multi-Select

- **WHEN** a multi-select question has no selections and no custom text
- **THEN** output SHALL be: `→ (No selection)`

#### Scenario: Answer Validation

- **WHEN** formatting answers
- **THEN** the system SHALL validate:
  - Answer indices match question indices
  - Selected options exist in question options
  - Answers have either selectedOption, selectedOptions, or customText

---

### Requirement: Session Validation

The system SHALL validate session data integrity.

#### Scenario: Validate Session

- **WHEN** validateSession is called
- **THEN** the system SHALL check:
  - Session directory exists
  - Required files exist (request.json, status.json)
  - Session IDs match across files
  - Question counts match

#### Scenario: Invalid Session ID Format

- **WHEN** an invalid session ID format is used
- **THEN** the system SHALL reject the operation

---

## Technical Design

### Session State Machine

```
┌─────────┐
│ pending │────────────────────┐
└────┬────┘                    │
     │                         │
     ├─── user answers ───► completed
     │                         │
     ├─── user rejects ───► rejected
     │                         │
     ├─── timeout ────────► timed_out
     │                         │
     └─── error ──────────► abandoned
```

### File Structure

```
{sessionsDir}/
└── {sessionId}/          # UUID v4
    ├── request.json      # Questions and metadata
    ├── status.json       # Lifecycle status
    └── answers.json      # User responses (created on submit)
```

### Configuration

```typescript
interface SessionConfig {
  baseDir: string; // Session storage path
  maxSessions?: number; // Max concurrent sessions (default: 100)
  retentionPeriod?: number; // Cleanup threshold in ms (default: 7 days)
  sessionTimeout?: number; // Wait timeout in ms (default: 0 = infinite)
}
```

---

## Dependencies

- `uuid` - Session ID generation
- `fs/promises` - File operations
- Zod schemas from `src/shared/schemas.ts`
