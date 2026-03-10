## ADDED Requirements

### Requirement: Stale Session Detection

The system SHALL identify sessions that may be orphaned based on age and configurable thresholds.

#### Scenario: Calculate stale status from session age

- **WHEN** the session-watcher loads pending sessions
- **THEN** it SHALL calculate staleness as: `(now - requestTimestamp) > staleThreshold`
- **AND** the stale flag SHALL be included in session metadata

#### Scenario: Stale threshold from configuration

- **WHEN** the TUI initializes
- **THEN** it SHALL load `staleThreshold` from config (default: 7200000ms)
- **AND** this value SHALL be used for all stale calculations

#### Scenario: Interaction grace time

- **WHEN** user navigates to or interacts with a stale session
- **THEN** the session SHALL receive a grace period (additional 30 minutes)
- **AND** during grace period, the session SHALL NOT appear stale
- **AND** the grace period SHALL reset on each interaction

#### Scenario: Track last interaction timestamp

- **WHEN** user navigates between questions in a session
- **THEN** the session-watcher SHALL record the current timestamp
- **AND** this timestamp SHALL be used for grace time calculations

---

### Requirement: Stale Session Visual Indicators

The system SHALL provide clear visual cues for sessions that may be orphaned.

#### Scenario: SessionPicker stale icon

- **WHEN** displaying a stale session in SessionPicker
- **THEN** a ⚠ warning icon SHALL be shown before the session title
- **AND** the icon SHALL use warning/yellow color

#### Scenario: SessionPicker stale styling

- **WHEN** displaying a stale session in SessionPicker
- **THEN** the session title SHALL use warning/yellow color
- **AND** the session age SHALL be highlighted in yellow
- **AND** a subtitle "may be orphaned" SHALL be displayed

#### Scenario: Stale sessions remain selectable

- **WHEN** a session is marked as stale
- **THEN** it SHALL remain selectable in SessionPicker
- **AND** the user SHALL be able to navigate to and answer it

#### Scenario: SessionDots abandoned indicator

- **WHEN** displaying an abandoned session in SessionDots
- **THEN** a distinct visual indicator (red color) SHALL be used
- **AND** hover text SHALL explain "AI disconnected"

#### Scenario: SessionDots stale indicator

- **WHEN** displaying a stale (but not abandoned) session in SessionDots
- **THEN** a yellow/warning color SHALL be used
- **AND** hover text SHALL explain "May be orphaned"

---

### Requirement: Stale Notification Toast

The system SHALL notify users when a session becomes stale.

#### Scenario: Toast on first stale detection

- **WHEN** a session transitions to stale status (and notifyOnStale is true)
- **THEN** a toast notification SHALL be displayed
- **AND** the message SHALL be: "Session {id} may be orphaned (created X hours ago)"

#### Scenario: Toast shown once per session

- **WHEN** a stale session has already triggered a toast
- **THEN** subsequent checks SHALL NOT show another toast
- **AND** the shown status SHALL persist for the TUI session

#### Scenario: Disable stale notifications

- **WHEN** config specifies `notifyOnStale: false`
- **THEN** no toast notifications SHALL be shown for stale sessions
- **AND** visual indicators in SessionPicker SHALL still appear

---

### Requirement: Abandoned Session Confirmation

The system SHALL warn users when they attempt to answer an abandoned session.

#### Scenario: Confirmation dialog on abandoned session

- **WHEN** user navigates to an abandoned session
- **THEN** a confirmation dialog SHALL be displayed
- **AND** the message SHALL be: "AI가 disconnect되었습니다. 그래도 답변하시겠습니까?"

#### Scenario: Confirmation dialog options

- **WHEN** the confirmation dialog is displayed
- **THEN** two options SHALL be presented: "답변하기" (continue) and "취소" (cancel)
- **AND** selecting "취소" SHALL return to the session list
- **AND** selecting "답변하기" SHALL proceed to the question view

#### Scenario: Remember confirmation choice

- **WHEN** user confirms answering an abandoned session
- **THEN** the choice SHALL be remembered for this TUI session
- **AND** subsequent navigation to the same session SHALL NOT show the dialog again

#### Scenario: Abandoned session submission allowed

- **WHEN** user submits answers to an abandoned session
- **THEN** answers.json SHALL be written normally
- **AND** status SHALL be updated to "completed"
- **AND** a warning SHALL indicate "AI will not receive these answers"

## MODIFIED Requirements

### Requirement: Footer Keybindings

The system SHALL display context-aware keyboard shortcuts, including for stale session management.

#### Scenario: Stale session additional footer info

- **WHEN** viewing a stale or abandoned session
- **THEN** the footer MAY show additional context about the session state
- **AND** warning indicators SHALL be consistent with other stale UI elements
