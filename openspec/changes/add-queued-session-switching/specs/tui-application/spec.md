## ADDED Requirements

### Requirement: Session Switching Navigation

The system SHALL allow the user to switch between queued sessions using keyboard shortcuts.

#### Scenario: Next session shortcut (cyclic)

- **WHEN** the user is answering questions
- **AND** there are 2 or more sessions in the queue
- **AND** the user presses `Ctrl+]`
- **THEN** the system SHALL switch the active session to the next session in the queue
- **AND** navigation SHALL wrap cyclically (last session switches to first session)

#### Scenario: Previous session shortcut (cyclic)

- **WHEN** the user is answering questions
- **AND** there are 2 or more sessions in the queue
- **AND** the user presses `Ctrl+[`
- **THEN** the system SHALL switch the active session to the previous session in the queue
- **AND** navigation SHALL wrap cyclically (first session switches to last session)

#### Scenario: Direct jump by index

- **WHEN** the user is answering questions
- **AND** there are 2 or more sessions in the queue
- **AND** the user presses a number key from `1` to `9`
- **THEN** the system SHALL switch the active session to the session at that 1-based index in the queue
- **AND** if no session exists at that index, the system SHALL take no action (no-op)

#### Scenario: No-op when only one session exists

- **WHEN** there is only 1 session in the queue
- **THEN** session switching keyboard shortcuts (`Ctrl+]`, `Ctrl+[`, `1-9`) SHALL take no action (no-op)

#### Scenario: Shortcuts disabled outside question answering

- **WHEN** the user is NOT answering questions (for example, on the review screen or in the rejection dialog)
- **THEN** session switching keyboard shortcuts (`Ctrl+]`, `Ctrl+[`, `1-9`) SHALL be disabled
- **AND** the system SHALL NOT switch sessions in response to those keys

---

### Requirement: Session State Preservation

The system SHALL preserve per-session UI state across session switching.

#### Scenario: Save UI state on switch-away

- **WHEN** the user switches away from the active session
- **THEN** the system SHALL save the active session's UI state keyed by `sessionId`
- **AND** the saved state SHALL include:
  - `currentQuestionIndex`
  - selected options
  - custom text drafts
  - elaborate marks
  - focus context
  - focused option index

#### Scenario: Restore UI state on switch-back

- **WHEN** the user switches to a session with saved UI state
- **THEN** the system SHALL restore that session's saved UI state exactly as the user left it

#### Scenario: Cleanup stored state on completion

- **WHEN** a session is completed
- **THEN** the system SHALL remove any stored UI state for that session

---

### Requirement: Session Dots Display

The system SHALL display a compact session indicator bar below the footer.

#### Scenario: Visibility based on queue size

- **WHEN** there are 2 or more sessions in the queue
- **THEN** the system SHALL display the session indicator bar below the footer
- **WHEN** there is only 1 session in the queue
- **THEN** the system SHALL hide the session indicator bar

#### Scenario: Dot style and numbering

- **WHEN** the session indicator bar is displayed
- **THEN** the system SHALL render numbered dots for each queued session
- **AND** the active session SHALL be rendered as a filled dot (`●`)
- **AND** inactive sessions SHALL be rendered as hollow dots (`○`)

#### Scenario: Dot color coding

- **WHEN** the session indicator bar is displayed
- **THEN** dots SHALL be color-coded by per-session state:
  - green = has answers
  - yellow = in progress
  - white = untouched
- **AND** the active session's dot SHALL use a filled dot with the theme primary color

---

### Requirement: Session Picker Overlay

The system SHALL provide a modal overlay for selecting sessions.

#### Scenario: Open overlay picker

- **WHEN** the user is answering questions
- **AND** the user presses `Ctrl+S`
- **THEN** the system SHALL open the session picker overlay

#### Scenario: Overlay contents

- **WHEN** the session picker overlay is open
- **THEN** the system SHALL show a list of all queued sessions
- **AND** each row SHALL include:
  - session number
  - first question title
  - working directory
  - progress as answered/total
  - age
- **AND** an example row SHALL follow this format:
  - `1. Auth Choice — ~/myproject  [2/4 answered]  2m ago`

#### Scenario: Overlay keyboard navigation

- **WHEN** the session picker overlay is open
- **THEN** `↑` and `↓` keys SHALL move the highlighted row
- **AND** `Enter` SHALL switch to the highlighted session and close the overlay
- **AND** `Esc` SHALL close the overlay without switching sessions

#### Scenario: Active session highlight

- **WHEN** the session picker overlay is open
- **THEN** the active session SHALL be highlighted in the list

#### Scenario: Input lock while overlay is open

- **WHEN** the session picker overlay is open
- **THEN** all other keyboard input SHALL be disabled

---

### Requirement: Session Timeout While Paused

The system SHALL handle timeouts for paused (non-active) sessions.

#### Scenario: Remove timed-out paused session

- **WHEN** a paused session times out
- **THEN** the system SHALL remove that session from the queue silently

#### Scenario: Timeout notification

- **WHEN** a paused session times out
- **THEN** the system SHALL show a brief toast notification: `Session '{title}' timed out`

#### Scenario: Active index adjustment on removal

- **WHEN** a timed-out paused session is removed
- **THEN** the system SHALL adjust the active session index if needed to avoid off-by-one errors

---

### Requirement: New Session Arrival During Active Session

The system SHALL handle new sessions arriving without disrupting the user.

#### Scenario: Append without auto-switching

- **WHEN** a new session arrives while another session is active
- **THEN** the system SHALL append the new session to the end of the queue (FIFO order preserved)
- **AND** the system SHALL NOT auto-switch to the new session

#### Scenario: UI updates for new arrival

- **WHEN** a new session is appended to the queue
- **THEN** the system SHALL update the session dots display
- **AND** the system SHALL update the header queue count

---

### Requirement: Session Queue Model

The system SHALL maintain sessions in FIFO order without reordering.

#### Scenario: Display and ordering

- **WHEN** sessions are displayed or listed
- **THEN** they SHALL appear in arrival order (oldest first)
- **AND** the system SHALL NOT provide reordering controls

#### Scenario: Removal on completion or rejection

- **WHEN** a session is completed or rejected
- **THEN** the system SHALL remove that session from the queue

#### Scenario: Active index adjustment after removal

- **WHEN** a session is removed from the queue
- **AND** the removed session was before the active session in the queue
- **THEN** the system SHALL decrement the active session index by 1

#### Scenario: Queue empty after removal

- **WHEN** the queue becomes empty after a session is removed
- **THEN** the system SHALL return to the WAITING state

#### Scenario: Queue non-empty after removal

- **WHEN** the queue remains non-empty after a session is removed
- **THEN** the system SHALL switch to the nearest valid session index

## MODIFIED Requirements

### Requirement: Footer Keybindings

The system SHALL display context-aware keyboard shortcuts.

#### Scenario: Option Focus Context

- **WHEN** an option is focused
- **THEN** footer SHALL show: `↑↓ Options` | `←→ Questions` | `Enter Select` (or `Space Toggle` for multi-select) | `E Elaborate` | `R Recommended` | `Ctrl+R Quick Submit` | `Esc Reject`

#### Scenario: Custom Input Focus Context

- **WHEN** custom input is focused
- **THEN** footer SHALL show: `↑↓ Options` | `Tab Next` | `Enter Newline` | `Esc Reject`

#### Scenario: Recommended Key Visibility

- **WHEN** current question has recommended options
- **THEN** footer SHALL show `R Recommended` keybinding
- **WHEN** any question in the session has recommended options
- **THEN** footer SHALL show `Ctrl+R Quick Submit` keybinding

#### Scenario: Session switching key visibility

- **WHEN** the user is answering questions
- **AND** there are 2 or more sessions in the queue
- **THEN** the footer SHALL additionally show: `Ctrl+]/[ Sessions` | `1-9 Jump` | `Ctrl+S List`
- **WHEN** there is only 1 session in the queue
- **THEN** the footer SHALL NOT show session switching keybindings
