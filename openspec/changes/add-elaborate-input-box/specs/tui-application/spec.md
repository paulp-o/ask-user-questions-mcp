## MODIFIED Requirements

### Requirement: Elaborate Request

The system SHALL allow users to request elaboration on individual questions with optional custom guidance.

#### Scenario: Elaborate Trigger

- **WHEN** user presses `E` key while viewing a question
- **THEN** the system SHALL:
  1. Mark the current question as requiring elaboration
  2. End the session with a special elaborate request response
  3. Return formatted message to AI requesting more detailed options

#### Scenario: Elaborate Option Display

- **WHEN** displaying the options list for a question
- **THEN** the system SHALL show a "Request Elaboration" option below the custom input option
- **AND** the option SHALL use `(★)` marker when selected and warning color

#### Scenario: Elaborate Input Activation

- **WHEN** user presses `Enter` on the "Request Elaboration" option
- **THEN** the system SHALL toggle the visibility of an inline multi-line text input box
- **AND** the input box SHALL appear directly below the elaborate option
- **AND** the input box SHALL have placeholder text "Tell the AI what you need..."

#### Scenario: Elaborate Input Text Entry

- **WHEN** the elaborate input box is visible and focused
- **THEN** the system SHALL:
  1. Accept multi-line text input
  2. Insert newline when `Enter` is pressed
  3. Move cursor left/right when arrow keys are pressed
  4. NOT navigate between questions with left/right arrow keys

#### Scenario: Elaborate Input Submission

- **WHEN** user presses `Tab` while the elaborate input is focused
- **THEN** the system SHALL:
  1. Save the elaboration text to the question's elaborate mark
  2. Mark the question for elaboration
  3. Advance to the next question (or review screen if last question)

#### Scenario: Elaborate Input Escape

- **WHEN** user presses `Escape` while the elaborate input is focused
- **THEN** the system SHALL:
  1. Close the input box
  2. Preserve any text that was typed
  3. Return focus to the elaborate option

#### Scenario: Elaborate Input Preview

- **WHEN** the elaborate option is NOT focused but has explanation text saved
- **THEN** the system SHALL display a preview of the explanation text below the option
- **AND** the preview SHALL show up to 3 lines with ellipsis for longer text

#### Scenario: Elaborate Input Persistence

- **WHEN** user navigates away from a question and returns
- **THEN** the system SHALL preserve any elaborate explanation text that was entered
- **AND** the input box visibility state SHALL be reset (closed)

#### Scenario: Elaborate Response Format

- **WHEN** an elaborate request is submitted with user guidance text
- **THEN** the response SHALL follow the format:
  ```
  [ELABORATE_REQUEST] Please elaborate on question '{title}' ({prompt}) with more detailed options
  User guidance: "{text}"
  ```
- **AND** include the question index for reference

#### Scenario: Elaborate Response Format Without Guidance

- **WHEN** an elaborate request is submitted without user guidance text (empty)
- **THEN** the response SHALL follow the existing format:
  ```
  [ELABORATE_REQUEST] Please elaborate on question '{title}' ({prompt}) with more detailed options
  ```
- **AND** NOT include a "User guidance" line

#### Scenario: Elaborate Disables Options

- **WHEN** a question is marked for elaboration
- **THEN** the system SHALL disable selection of regular options for that question
- **AND** display options in a dimmed/muted state
- **AND** show "(disabled)" suffix on option labels

#### Scenario: Review Screen Elaborate Display

- **WHEN** displaying a question marked for elaboration on the review screen
- **THEN** the system SHALL display "Marked for elaboration" text
- **AND** if explanation text was provided, display it as: `Marked for elaboration: "{text}"`

#### Scenario: Footer Keybindings for Elaborate Input

- **WHEN** the elaborate input is focused
- **THEN** the footer SHALL show: `↑↓ Options` | `←→ Cursor` | `Tab/S+Tab Questions` | `Enter Newline` | `Esc Reject`
