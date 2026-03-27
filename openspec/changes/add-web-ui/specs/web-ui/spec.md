# web-ui Specification

## Purpose

Browser-based UI for AUQ with 100% feature parity with the TUI. Built with Svelte 5 + shadcn-svelte, served as a static SPA from the local Hono web server. Communicates exclusively via WebSocket.

## ADDED Requirements

### Requirement: Session Queue Display

The web UI SHALL display all pending sessions in a sidebar.

#### Scenario: Sidebar session list

- **WHEN** pending sessions exist
- **THEN** the sidebar SHALL display sessions sorted by creation timestamp (FIFO, oldest first)
- **AND** each entry SHALL show: question count, working directory (truncated), creation time (relative)
- **AND** the active session SHALL be visually highlighted
- **AND** clicking a session SHALL switch to it

#### Scenario: Stale session indicator

- **WHEN** a session exceeds the configured staleThreshold and the last interaction was >30 minutes ago
- **THEN** the sidebar entry SHALL show a stale badge/indicator

#### Scenario: Abandoned session indicator

- **WHEN** a session has status "abandoned"
- **THEN** the sidebar entry SHALL show an abandoned badge
- **AND** selecting it SHALL show a confirmation: "This session was abandoned. Answer anyway?"

#### Scenario: Session answered elsewhere

- **WHEN** a session is completed by another client (TUI or another browser tab)
- **THEN** the sidebar SHALL update the session status immediately
- **AND** show a toast: "Session was answered in another client"
- **AND** remove the session from the pending list

---

### Requirement: Question Stepper View

The web UI SHALL display questions one at a time with navigation.

#### Scenario: Single question display

- **WHEN** a session is active in stepper mode
- **THEN** the current question SHALL be displayed with:
  - Question prompt (markdown rendered)
  - Progress indicator ("Question 1 of 3")
  - Options list (radio for single-select, checkbox for multi-select)
  - Custom text input ("Other" option with auto-growing textarea)
  - Elaborate button
  - Navigation: Back / Next buttons + keyboard shortcuts

#### Scenario: Navigation

- **WHEN** user answers a question
- **THEN** pressing Enter or clicking Next SHALL advance to the next question
- **AND** pressing Shift+Tab or clicking Back SHALL return to the previous question
- **AND** after the last question, SHALL show the review screen

#### Scenario: Recommended option highlighting

- **WHEN** an option label contains "(Recommended)" or "(추천)" (case-insensitive)
- **THEN** it SHALL be visually highlighted with a distinct badge/color
- **AND** for single-select: pre-selected by default
- **AND** for multi-select: pre-toggled by default

---

### Requirement: All-At-Once Form View

The web UI SHALL offer an alternative view showing all questions at once.

#### Scenario: Form view display

- **WHEN** user toggles to form view via the header button
- **THEN** all questions SHALL be displayed in a scrollable form
- **AND** each question SHALL be a card with its own options list and custom input
- **AND** a Submit button SHALL appear at the bottom

#### Scenario: Mode toggle

- **WHEN** user clicks the mode toggle button in the header
- **THEN** the view SHALL switch between stepper and form mode
- **AND** answer state SHALL be preserved across mode switches
- **AND** the user's preferred mode SHALL persist in the session (not config)

---

### Requirement: Answer Review

The web UI SHALL show a review screen before submission.

#### Scenario: Review card

- **WHEN** user completes all questions (stepper) or clicks Submit (form)
- **THEN** a full-page summary card SHALL display all Q&A pairs
- **AND** each pair SHALL show: question prompt, selected answer(s), custom text, elaborate marks
- **AND** each pair SHALL have an "Edit" button to jump back to that question
- **AND** a "Submit" button at the bottom SHALL send answers via WebSocket
- **AND** a "Back" button SHALL return to editing

#### Scenario: Optimistic submit

- **WHEN** user clicks Submit
- **THEN** the UI SHALL immediately show a success state
- **AND** send `session:answer` via WebSocket
- **AND** on `session:answer:result` with `success: false`, rollback and show error toast

---

### Requirement: Session Rejection

The web UI SHALL support rejecting sessions with optional reason.

#### Scenario: Rejection flow

- **WHEN** user presses Esc or clicks the Reject button
- **THEN** a modal dialog SHALL appear with:
  - Step 1: Confirmation ("Reject & inform AI" / "Cancel")
  - Step 2: Optional reason textarea
- **AND** submitting SHALL send `session:reject` via WebSocket

---

### Requirement: Elaborate Request

The web UI SHALL allow users to request elaboration on questions.

#### Scenario: Elaborate button

- **WHEN** viewing a question
- **THEN** an "Ask to elaborate" button SHALL appear below the options
- **AND** clicking it SHALL toggle a multi-line text input for elaboration guidance
- **AND** the elaboration mark SHALL be shown in the review screen

---

### Requirement: Quick Submit

The web UI SHALL support quick submission with recommended options.

#### Scenario: Quick submit button

- **WHEN** any question in the session has recommended options
- **THEN** a "Quick Submit (Recommended)" button SHALL be visible
- **AND** clicking it or pressing Ctrl+Enter SHALL:
  1. Auto-select recommended options for all unanswered questions
  2. Navigate to the review screen

---

### Requirement: Theme Support

The web UI SHALL support all 16 TUI themes.

#### Scenario: Theme switching

- **WHEN** user selects a theme from the header selector or presses Ctrl+T
- **THEN** the UI SHALL immediately switch to the selected theme
- **AND** all colors SHALL match the TUI theme's color palette
- **AND** the selected theme SHALL persist (saved to config)

#### Scenario: Default theme

- **WHEN** the web UI first loads and no theme is configured
- **THEN** the system SHALL detect the user's preferred color scheme via `prefers-color-scheme`
- **AND** map to the closest AUQ theme (dark → "dark" theme, light → "light" theme)

---

### Requirement: Keyboard Shortcuts

The web UI SHALL support keyboard shortcuts matching the TUI.

#### Scenario: Option navigation

- **WHEN** focus is on the options list
- **THEN** ↑/↓ SHALL navigate options
- **AND** Space SHALL toggle (multi) or select (single)
- **AND** Enter SHALL select and advance
- **AND** R SHALL select recommended option for current question
- **AND** E SHALL toggle elaborate input

#### Scenario: Question navigation

- **WHEN** focus is not in a text input
- **THEN** Tab/Shift+Tab SHALL advance/return to next/prev question
- **AND** ←/→ SHALL navigate between questions (stepper mode)

#### Scenario: Session navigation

- **WHEN** multiple sessions are queued
- **THEN** ] / [ SHALL switch to next/prev session

#### Scenario: Global shortcuts

- **WHEN** at any point during a session
- **THEN** Ctrl+Enter SHALL trigger quick submit
- **AND** Ctrl+T SHALL cycle theme
- **AND** Esc SHALL show rejection dialog
- **AND** ? SHALL show keyboard shortcut help overlay

#### Scenario: Text input context

- **WHEN** focus is in a textarea (custom input or elaborate)
- **THEN** Shift+Enter SHALL insert a newline
- **AND** Enter SHALL submit/advance
- **AND** navigation shortcuts (←→, Tab) SHALL NOT trigger question navigation

---

### Requirement: Browser Notifications

The web UI SHALL notify users of new sessions via browser notifications and audio.

#### Scenario: New session notification

- **WHEN** a new session arrives and the tab is not visible
- **THEN** the UI SHALL show a browser Notification: "AUQ: New Questions" with question count and working directory
- **AND** play a notification sound
- **AND** use the sessionId as notification tag for deduplication

#### Scenario: Permission request

- **WHEN** the first session arrives and Notification permission is not granted
- **THEN** the UI SHALL request permission (triggered by user gesture, not page load)

#### Scenario: Respect config

- **WHEN** config has `notifications.enabled: false`
- **THEN** no browser notifications SHALL be shown
- **WHEN** config has `notifications.sound: false`
- **THEN** no audio SHALL be played

---

### Requirement: Dynamic Tab Title & Favicon

The web UI SHALL dynamically update the browser tab title and favicon to reflect pending session count.

#### Scenario: Tab title

- **WHEN** pending sessions exist
- **THEN** document.title SHALL be `AUQ ({count} pending)`
- **WHEN** no pending sessions
- **THEN** document.title SHALL be `AUQ`

#### Scenario: Favicon badge

- **WHEN** pending sessions exist
- **THEN** the favicon SHALL show a numeric badge with the count
- **WHEN** no pending sessions
- **THEN** the favicon SHALL show the default AUQ icon

---

The web UI SHALL display update availability via a header badge.

### Requirement: Update Checker

The web UI SHALL display update availability via a header badge.

#### Scenario: Update available

- **WHEN** the server detects a newer version available
- **THEN** the header SHALL show an update badge
- **AND** clicking it SHALL show update details

---

### Requirement: Config Editor

The web UI SHALL provide a visual config editor.

#### Scenario: Config page layout

- **WHEN** user navigates to /#/config
- **THEN** the page SHALL display a scope toggle (Local / Global) at the top
- **AND** grouped form sections: Limits, Session, UI, Notifications, Stale Detection, Updates
- **AND** each field SHALL render the appropriate input type (number spinner, enum dropdown, boolean toggle, text input)

#### Scenario: Field validation

- **WHEN** user changes a field value
- **THEN** the value SHALL be validated against the Zod schema
- **AND** if invalid, an inline error message SHALL appear
- **AND** the field SHALL NOT be saved until valid

#### Scenario: Save on change

- **WHEN** user changes a valid field value
- **THEN** the change SHALL be sent via `config:set` WebSocket message
- **AND** a success indicator SHALL appear briefly

#### Scenario: Reset field

- **WHEN** user clicks the reset icon next to a field
- **THEN** the field SHALL revert to its default value
- **AND** send `config:reset` with the field key

#### Scenario: Reset all

- **WHEN** user clicks "Reset All" button
- **THEN** a confirmation dialog SHALL appear
- **AND** on confirm, send `config:reset` without key (resets entire config for scope)

#### Scenario: Export

- **WHEN** user clicks Export button
- **THEN** the current config SHALL be downloaded as `.auqrc.json`

#### Scenario: Import

- **WHEN** user clicks Import button
- **THEN** a file picker SHALL open for `.json` files
- **AND** the selected file SHALL be validated against the Zod schema
- **AND** if valid, sent via `config:import`
- **AND** if invalid, errors SHALL be displayed

---

### Requirement: Session History

The web UI SHALL provide paginated session history browsing.

#### Scenario: History table

- **WHEN** user navigates to /#/history
- **THEN** a table SHALL display with columns: Date, Status, Questions, Working Directory
- **AND** columns SHALL be sortable (click header to toggle asc/desc)
- **AND** 20 sessions per page with pagination controls

#### Scenario: Filters

- **WHEN** user selects a status filter (All, Completed, Rejected, Timed Out, Abandoned)
- **THEN** the table SHALL filter to matching sessions
- **WHEN** user types in the search input
- **THEN** the table SHALL filter to sessions where question prompts or option labels contain the search text

#### Scenario: Expandable detail

- **WHEN** user clicks a history table row
- **THEN** the row SHALL expand to show full Q&A detail for every question
- **AND** clicking again SHALL collapse it

---

### Requirement: Connection Resilience

The web UI SHALL handle WebSocket disconnections gracefully.

#### Scenario: Reconnect with banner

- **WHEN** WebSocket connection drops
- **THEN** a "Reconnecting..." banner SHALL appear at the top
- **AND** the client SHALL attempt reconnection with exponential backoff (1s → 2s → 4s → ... → 30s max)
- **AND** after 10 failed attempts, show "Connection lost" with manual retry button

#### Scenario: State recovery

- **WHEN** WebSocket reconnects
- **THEN** the server SHALL send `system:sync` with full session list + config
- **AND** the client SHALL replace local state with server state
- **AND** the banner SHALL disappear

---

### Requirement: Responsive Design

The web UI SHALL be responsive and mobile-friendly.

#### Scenario: Mobile layout

- **WHEN** viewport width is < 768px
- **THEN** the sidebar SHALL collapse to a hamburger menu
- **AND** the layout SHALL be single-column
- **AND** all touch targets SHALL be at least 44x44px

#### Scenario: Tablet layout

- **WHEN** viewport width is 768px-1024px
- **THEN** the sidebar SHALL be collapsible (toggle button)
- **AND** the main content SHALL fill available width

#### Scenario: Desktop layout

- **WHEN** viewport width is > 1024px
- **THEN** the sidebar SHALL be always visible
- **AND** the main content SHALL have a max-width for readability

---

### Requirement: Accessibility

The web UI SHALL meet WCAG AA basics.

#### Scenario: ARIA labels

- **WHEN** rendering interactive elements
- **THEN** all buttons, inputs, selects, and navigation elements SHALL have descriptive ARIA labels

#### Scenario: Keyboard navigation

- **WHEN** using keyboard only (no mouse)
- **THEN** all interactive elements SHALL be reachable via Tab
- **AND** all actions SHALL be triggerable via Enter or Space
- **AND** focus SHALL be visible (focus-visible styles)

#### Scenario: Color contrast

- **WHEN** displaying text on any theme
- **THEN** normal text SHALL have a contrast ratio of at least 4.5:1
- **AND** large text SHALL have a contrast ratio of at least 3:1

#### Scenario: Dynamic content

- **WHEN** dynamic content changes (new sessions, toasts, connection status)
- **THEN** aria-live regions SHALL announce changes to screen readers