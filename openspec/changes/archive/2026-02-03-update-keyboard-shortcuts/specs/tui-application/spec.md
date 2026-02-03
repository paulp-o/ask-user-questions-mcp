## MODIFIED Requirements

### Requirement: Elaborate Request

The system SHALL allow users to request elaboration on individual questions with optional custom explanation.

#### Scenario: Elaborate Mark Trigger

- **WHEN** user presses `E` key while viewing a question
- **THEN** the system SHALL:
  1. Toggle the elaborate mark on the current question
  2. If marking (not unmarking), display an inline text input for custom explanation
  3. Allow user to enter explanation text (e.g., "add more technical details")
  4. Show visual indicator on the question tab that it's marked for elaboration
  5. Allow user to continue answering other questions

#### Scenario: Elaborate Mark Visual Indicator

- **WHEN** a question is marked for elaboration
- **THEN** the TabBar SHALL display a distinct indicator (e.g., star or color) for that question
- **AND** the ReviewScreen SHALL show the elaboration mark with any custom explanation

#### Scenario: Elaborate Request Submission

- **WHEN** user submits answers with elaboration-marked questions
- **THEN** the response SHALL include elaborate requests in the format:
  ```
  [ELABORATE_REQUEST] Please elaborate on question '{title}' ({prompt})
  User note: {customExplanation}
  ```
- **AND** include the question index for reference

#### Scenario: Elaborate Mark Cancellation

- **WHEN** user presses `E` key on an already-marked question
- **THEN** the system SHALL remove the elaborate mark and any custom explanation

---

### Requirement: Recommended Option Detection

The system SHALL automatically detect and highlight options marked as recommended.

#### Scenario: Recommended Pattern Detection

- **WHEN** an option label contains any of the following patterns (case-insensitive):
  - `(recommended)` or `[recommended]`
  - `(추천)` or `[추천]`
- **THEN** the system SHALL:
  - Visually highlight the option with a distinct color or badge
  - Mark the option as "recommended" internally

#### Scenario: Recommended Auto-Selection Single-Select (Configurable)

- **WHEN** a single-select question has one or more recommended options
- **AND** `autoSelectRecommended` config is `true` (default)
- **THEN** the system SHALL pre-select the first recommended option by default
- **AND** the user MAY change the selection before submitting

#### Scenario: Recommended Auto-Selection Multi-Select (Configurable)

- **WHEN** a multi-select question has one or more recommended options
- **AND** `autoSelectRecommended` config is `true` (default)
- **THEN** the system SHALL pre-select all recommended options by default
- **AND** the user MAY toggle selections before submitting

#### Scenario: Auto-Selection Disabled

- **WHEN** `autoSelectRecommended` config is `false`
- **THEN** the system SHALL NOT auto-select recommended options on question mount
- **AND** the user MAY manually select recommended options or use R key shortcut

---

## ADDED Requirements

### Requirement: R Key Recommended Selection

The system SHALL provide keyboard shortcuts for quickly selecting recommended options.

#### Scenario: R Key Current Question

- **WHEN** user presses `R` key while viewing a question with recommended options
- **AND** focus is on options (not custom input)
- **THEN** the system SHALL:
  - For single-select: select the first recommended option
  - For multi-select: select all recommended options

#### Scenario: Ctrl+R Quick Submit

- **WHEN** user presses `Ctrl+R` at any point during question answering
- **THEN** the system SHALL:
  1. For each unanswered question, select the recommended option(s) if available
  2. Navigate directly to the review screen
  3. Allow user to confirm or go back to edit

#### Scenario: R Key No Recommended Available

- **WHEN** user presses `R` key on a question with no recommended options
- **THEN** the system SHALL take no action (no-op)

---

### Requirement: Navigation Focus Reset

The system SHALL reset option focus when navigating between questions.

#### Scenario: Arrow Key Navigation Focus

- **WHEN** user navigates to a different question using `←` or `→` arrow keys
- **THEN** the system SHALL reset the focused option index to 0 (first option)

#### Scenario: Tab Navigation Focus

- **WHEN** user navigates to a different question using `Tab` or `Shift+Tab`
- **THEN** the system SHALL reset the focused option index to 0 (first option)

---

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
