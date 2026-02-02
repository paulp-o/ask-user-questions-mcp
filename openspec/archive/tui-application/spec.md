# TUI Application Capability

Provides the interactive terminal user interface for answering questions from AI assistants.

## Overview

The TUI (Terminal User Interface) is a React/Ink application that displays questions to users, collects their answers, and manages the question-answering workflow. It supports multi-agent workflows with FIFO queue processing and provides a clean, keyboard-navigable interface.

**Key Files:**

- `bin/tui-app.tsx` - Main TUI application
- `src/tui/components/*.tsx` - React/Ink components
- `src/tui/theme.ts` - Centralized theming
- `src/tui/session-watcher.ts` - Session detection

---

## Requirements

### Requirement: Application Lifecycle

The system SHALL manage the TUI application lifecycle properly.

#### Scenario: Application Startup

- **WHEN** the TUI launches
- **THEN** the system SHALL:
  1. Clear the terminal
  2. Ensure session directory exists
  3. Load pending sessions from disk
  4. Start watching for new sessions
  5. Display appropriate screen based on queue state

#### Scenario: Application Shutdown

- **WHEN** user exits the TUI (Ctrl+C)
- **THEN** the system SHALL:
  - Stop file watchers
  - Display goodbye message
  - Exit cleanly

---

### Requirement: Waiting State

The system SHALL display an appropriate screen when no questions are pending.

#### Scenario: Empty Queue Display

- **WHEN** no pending sessions exist
- **THEN** the TUI SHALL display:
  - Animated gradient "Waiting for AI to ask questions..." text
  - Elapsed time counter
  - Ctrl+C quit instruction

#### Scenario: Queue Status Display

- **WHEN** sessions are queued but not being processed
- **THEN** the TUI SHALL display the queue count

---

### Requirement: Session Queue Processing

The system SHALL process sessions in FIFO order.

#### Scenario: Auto-Transition to Processing

- **WHEN** a session enters the queue while in WAITING mode
- **THEN** the TUI SHALL automatically transition to PROCESSING mode

#### Scenario: New Session Detection

- **WHEN** a new session is created while TUI is running
- **THEN** the TUI SHALL:
  - Detect the new session via file watcher
  - Add it to the end of the queue (FIFO)
  - Not interrupt current session processing

#### Scenario: Duplicate Prevention

- **WHEN** a session ID already exists in the queue
- **THEN** the TUI SHALL not add a duplicate

---

### Requirement: Header Display

The system SHALL display a header with branding and status information.

#### Scenario: Header Content

- **WHEN** the TUI is displayed
- **THEN** the header SHALL show:
  - Gradient AUQ logo/branding
  - Package version
  - Pending queue count

#### Scenario: Queue Count Flash Effect

- **WHEN** the queue count changes
- **THEN** the header SHALL briefly flash the queue indicator

---

### Requirement: Question Navigation

The system SHALL provide intuitive navigation between questions.

#### Scenario: Tab Bar Display

- **WHEN** displaying questions
- **THEN** the tab bar SHALL show:
  - All question titles
  - Current question highlighted
  - Answered questions marked with checkmarks
  - Unanswered questions marked with circles

#### Scenario: Arrow Key Navigation

- **WHEN** user presses left/right arrow keys
- **THEN** the system SHALL navigate to previous/next question

#### Scenario: Question Type Indicator

- **WHEN** displaying a question
- **THEN** the system SHALL show "[Single Choice]" or "[Multiple Choice]"

#### Scenario: Elapsed Time Display

- **WHEN** processing a session
- **THEN** the system SHALL display elapsed time since session creation

---

### Requirement: Option Selection

The system SHALL provide option selection with keyboard navigation.

#### Scenario: Single-Select Mode

- **WHEN** a question has `multiSelect: false`
- **THEN** the system SHALL:
  - Display radio button indicators (● selected, ○ unselected)
  - Allow only one selection
  - Enter key selects and advances

#### Scenario: Multi-Select Mode

- **WHEN** a question has `multiSelect: true`
- **THEN** the system SHALL:
  - Display checkbox indicators ([✔] selected, [ ] unselected)
  - Allow multiple selections
  - Space key toggles selection
  - Tab/Enter advances to next question

#### Scenario: Option Navigation

- **WHEN** user presses up/down arrow keys
- **THEN** focus SHALL move between options

#### Scenario: Option Description Display

- **WHEN** an option has a description
- **THEN** the description SHALL be displayed below the label

---

### Requirement: Custom Input

The system SHALL allow custom text answers via "Other" option.

#### Scenario: Other Option Display

- **WHEN** displaying options
- **THEN** an "Other (custom answer)" option SHALL always be available

#### Scenario: Custom Input Activation

- **WHEN** user navigates to "Other" option
- **THEN** a multi-line text input SHALL appear

#### Scenario: Custom Input Behavior

- **WHEN** typing in custom input
- **THEN** the system SHALL support:
  - Multi-line input (Shift+Enter for newlines)
  - Enter to submit
  - Cursor positioning

#### Scenario: Custom Input with Multi-Select

- **WHEN** in multi-select mode with custom input
- **THEN** custom text SHALL coexist with option selections

---

### Requirement: Review Screen

The system SHALL display a summary for confirmation before submission.

#### Scenario: Review Display

- **WHEN** user completes all questions
- **THEN** the review screen SHALL show:
  - All questions with their prompts
  - Selected options for each question
  - Custom text answers
  - "No answer provided" for unanswered questions

#### Scenario: Review Actions

- **WHEN** on the review screen
- **THEN** user SHALL be able to:
  - Press Enter to submit
  - Press 'n' to go back and edit

---

### Requirement: Session Rejection

The system SHALL allow users to reject question sets.

#### Scenario: Rejection Trigger

- **WHEN** user presses Escape key
- **THEN** the system SHALL show a confirmation dialog

#### Scenario: Rejection Confirmation

- **WHEN** the confirmation dialog is shown
- **THEN** user SHALL be able to:
  - Press 'y' to reject and provide feedback
  - Press 'n' to cancel and continue answering

#### Scenario: Rejection Reason Input

- **WHEN** user chooses to reject
- **THEN** the system SHALL:
  - Show optional reason input
  - Allow Enter to submit with reason
  - Allow Esc to skip reason

---

### Requirement: Toast Notifications

The system SHALL display transient notifications for user feedback.

#### Scenario: Submission Success Toast

- **WHEN** answers are submitted successfully
- **THEN** a green success toast SHALL appear

#### Scenario: Rejection Toast

- **WHEN** a session is rejected
- **THEN** an info toast SHALL appear with rejection details

#### Scenario: Toast Auto-Dismiss

- **WHEN** a toast is displayed
- **THEN** it SHALL auto-dismiss after a timeout

---

### Requirement: Footer Keybindings

The system SHALL display context-aware keyboard shortcuts.

#### Scenario: Option Focus Context

- **WHEN** an option is focused
- **THEN** footer SHALL show: ↑↓ Options, ←→ Questions, Enter Select (or Space Toggle for multi-select), Esc Reject

#### Scenario: Custom Input Focus Context

- **WHEN** custom input is focused
- **THEN** footer SHALL show: ↑↓ Options, Tab Next, Enter Submit, Shift+Enter Newline, Esc Reject

#### Scenario: Review Screen Context

- **WHEN** on review screen
- **THEN** footer SHALL show: Enter Submit, n Back

---

### Requirement: Theming

The system SHALL use a centralized theming system.

#### Scenario: Theme Configuration

- **WHEN** displaying UI elements
- **THEN** colors SHALL be sourced from `theme.ts`
- **AND** include:
  - Header gradient theme
  - State colors (focused, selected, pending)
  - Component-specific color schemes

#### Scenario: Gradient Header

- **WHEN** displaying the header
- **THEN** the logo SHALL use the configured gradient theme (default: "vice")

---

## Technical Design

### Application State Machine

```
┌─────────┐                    ┌────────────┐
│ WAITING │──── queue > 0 ────►│ PROCESSING │
└────┬────┘                    └─────┬──────┘
     │                               │
     │◄──── queue empty ─────────────┘
     │                               │
     │◄──── session complete ────────┘
```

### Component Hierarchy

```
App
├── Header (logo, version, queue count)
├── Toast (notifications)
└── MainContent
    ├── WaitingScreen (when queue empty)
    └── StepperView (when processing)
        ├── QuestionDisplay
        │   ├── TabBar
        │   ├── Question prompt
        │   ├── OptionsList
        │   │   └── MultiLineTextInput
        │   └── Footer
        ├── ReviewScreen
        └── ConfirmationDialog
```

### Keyboard Shortcuts

| Key   | Context       | Action                |
| ----- | ------------- | --------------------- |
| ↑/↓   | Options       | Navigate options      |
| ←/→   | Questions     | Navigate questions    |
| Enter | Single-select | Select and advance    |
| Space | Multi-select  | Toggle selection      |
| Tab   | Any           | Advance to next       |
| Esc   | Any           | Show rejection dialog |
| n     | Review        | Go back to editing    |

---

## Dependencies

- `ink` v6.4 - React for CLI
- `@inkjs/ui` v2.0 - UI components
- `react` v19 - Component framework
- `gradient-string` - Header gradients
- `src/session/SessionManager.ts` - Session operations
- `src/tui/session-watcher.ts` - Session detection
