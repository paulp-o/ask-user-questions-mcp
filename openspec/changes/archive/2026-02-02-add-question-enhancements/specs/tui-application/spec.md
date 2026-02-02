# TUI Application - Question Enhancements Delta

## ADDED Requirements

### Requirement: Recommended Option Detection

The system SHALL automatically detect and highlight options marked as recommended.

#### Scenario: Recommended Pattern Detection

- **WHEN** an option label contains any of the following patterns (case-insensitive):
  - `(recommended)` or `[recommended]`
  - `(추천)` or `[추천]`
- **THEN** the system SHALL:
  - Visually highlight the option with a distinct color or badge
  - Mark the option as "recommended" internally

#### Scenario: Recommended Auto-Selection Single-Select

- **WHEN** a single-select question has one or more recommended options
- **THEN** the system SHALL pre-select the first recommended option by default
- **AND** the user MAY change the selection before submitting

#### Scenario: Recommended Auto-Selection Multi-Select

- **WHEN** a multi-select question has one or more recommended options
- **THEN** the system SHALL pre-select all recommended options by default
- **AND** the user MAY toggle selections before submitting

---

### Requirement: Quick Submit with Recommended Options

The system SHALL provide a shortcut to quickly submit all questions using recommended options.

#### Scenario: Quick Submit Trigger

- **WHEN** user presses `Ctrl+Enter` at any point during question answering
- **THEN** the system SHALL:
  1. For each unanswered question, select the recommended option(s) if available
  2. Navigate directly to the review screen
  3. Allow user to confirm or go back to edit

#### Scenario: Quick Submit No Recommended Available

- **WHEN** user presses `Ctrl+Enter` and some questions have no recommended options
- **THEN** the system SHALL skip those questions (leave unanswered)
- **AND** proceed to review screen where user can see which questions need answers

---

### Requirement: Elaborate Request

The system SHALL allow users to request elaboration on individual questions.

#### Scenario: Elaborate Trigger

- **WHEN** user presses `E` key while viewing a question
- **THEN** the system SHALL:
  1. Mark the current question as requiring elaboration
  2. End the session with a special elaborate request response
  3. Return formatted message to AI requesting more detailed options

#### Scenario: Elaborate Response Format

- **WHEN** an elaborate request is submitted
- **THEN** the response SHALL follow the format:
  ```
  [ELABORATE_REQUEST] Please elaborate on question '{title}' ({prompt}) with more detailed options
  ```
- **AND** include the question index for reference

---

### Requirement: Rephrase Request

The system SHALL allow users to request rephrasing of individual questions.

#### Scenario: Rephrase Trigger

- **WHEN** user presses `D` key while viewing a question
- **THEN** the system SHALL:
  1. Mark the current question as requiring rephrasing
  2. End the session with a special rephrase request response
  3. Return formatted message to AI requesting a different approach

#### Scenario: Rephrase Response Format

- **WHEN** a rephrase request is submitted
- **THEN** the response SHALL follow the format:
  ```
  [REPHRASE_REQUEST] Please rephrase question '{title}' in a different way
  ```
- **AND** include the question index for reference

---

### Requirement: Footer Keybindings

The system SHALL display context-aware keyboard shortcuts.

#### Scenario: Option Focus Context

- **WHEN** an option is focused
- **THEN** footer SHALL show: `↑↓ Options` | `←→ Questions` | `Enter Select` (or `Space Toggle` for multi-select) | `E Elaborate` | `D Rephrase` | `Esc Reject`

#### Scenario: Custom Input Focus Context

- **WHEN** custom input is focused
- **THEN** footer SHALL show: `↑↓ Options` | `Tab Next` | `Enter Newline` | `E Elaborate` | `D Rephrase` | `Esc Reject`

#### Scenario: Quick Submit Hint

- **WHEN** recommended options are available in any question
- **THEN** footer SHALL show: `Ctrl+Enter Quick Submit`
