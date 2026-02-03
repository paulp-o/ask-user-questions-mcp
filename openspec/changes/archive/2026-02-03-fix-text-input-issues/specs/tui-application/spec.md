## ADDED Requirements

### Requirement: CJK Character Width Handling

The system SHALL correctly calculate and render visual widths for CJK (Chinese, Japanese, Korean) characters.

#### Scenario: Korean Text Background Color

- **WHEN** displaying text with background color that contains Korean characters
- **THEN** the background color SHALL extend to cover the full visual width of the text
- **AND** the background SHALL NOT be clipped or wrap incorrectly

#### Scenario: Mixed CJK and ASCII Text

- **WHEN** displaying text containing both CJK and ASCII characters with background color
- **THEN** the system SHALL calculate visual width as: ASCII chars = 1 column, CJK chars = 2 columns
- **AND** the background color SHALL cover the full calculated visual width

#### Scenario: Options List with Korean Labels

- **WHEN** displaying an option with a Korean label and the option is focused or selected
- **THEN** the background highlight SHALL cover the entire option text without clipping
- **AND** the text SHALL remain fully visible and readable

---

### Requirement: Text Input Cursor Accuracy

The system SHALL maintain accurate cursor positioning in text input fields.

#### Scenario: Spacebar Input at Cursor

- **WHEN** user presses spacebar while cursor is in the middle of text
- **THEN** a space character SHALL be inserted at the current cursor position
- **AND** the cursor SHALL move one position to the right
- **AND** all text after the cursor SHALL shift right by one position

#### Scenario: Delete Key Functionality

- **WHEN** user presses the Delete key while cursor is not at the end of text
- **THEN** the character immediately after the cursor SHALL be removed
- **AND** the cursor position SHALL remain unchanged
- **AND** all text after the deleted character SHALL shift left by one position

#### Scenario: Backspace Key Functionality

- **WHEN** user presses the Backspace key while cursor is not at the beginning of text
- **THEN** the character immediately before the cursor SHALL be removed
- **AND** the cursor SHALL move one position to the left
- **AND** all text after the cursor SHALL shift left by one position

---

### Requirement: Paste Event Handling

The system SHALL correctly handle text paste operations in input fields.

#### Scenario: Paste Text Detection

- **WHEN** user pastes text into an input field (via Ctrl+V, Cmd+V, or terminal paste)
- **THEN** the system SHALL detect the paste event (multiple characters arriving rapidly or single input with length > 1)
- **AND** the pasted text SHALL be inserted at the current cursor position

#### Scenario: Cursor Position After Paste

- **WHEN** text is pasted into an input field
- **THEN** the cursor SHALL move to the end of the pasted content
- **AND** the cursor SHALL be positioned immediately after the last pasted character

#### Scenario: Paste with Existing Text

- **WHEN** text is pasted while the input field already contains text
- **THEN** the pasted text SHALL be inserted at the cursor position
- **AND** existing text before the cursor SHALL remain unchanged
- **AND** existing text after the cursor SHALL be shifted right

---

### Requirement: CJK Cursor Navigation

The system SHALL correctly navigate cursor through CJK text.

#### Scenario: Right Arrow with CJK Character

- **WHEN** user presses right arrow key and the next character is a CJK character
- **THEN** the cursor SHALL move past the entire CJK character (2 visual columns)
- **AND** the cursor SHALL be positioned after the CJK character

#### Scenario: Left Arrow with CJK Character

- **WHEN** user presses left arrow key and the previous character is a CJK character
- **THEN** the cursor SHALL move past the entire CJK character (2 visual columns)
- **AND** the cursor SHALL be positioned before the CJK character

#### Scenario: Cursor Visual Position Display

- **WHEN** displaying the cursor in text containing CJK characters
- **THEN** the cursor SHALL appear at the correct visual column position
- **AND** the cursor SHALL NOT appear in the middle of a CJK character

---

### Requirement: Custom Input Text Entry

The system SHALL provide a text input field for custom answers with correct character handling.

#### Scenario: Multi-line Text Input

- **WHEN** custom input is focused
- **THEN** the system SHALL accept multi-line text input
- **AND** Enter/Return SHALL insert a newline character
- **AND** Tab SHALL submit the custom answer and advance

#### Scenario: Character Input at Cursor

- **WHEN** user types any character (including space, CJK, or special characters)
- **THEN** the character SHALL be inserted at the current cursor position
- **AND** the cursor SHALL advance by the appropriate amount (1 for ASCII, 1 for CJK at character level)

#### Scenario: Input Field Visual Feedback

- **WHEN** custom input is focused
- **THEN** the input field SHALL display a visible cursor
- **AND** the cursor position SHALL accurately reflect where the next character will be inserted
