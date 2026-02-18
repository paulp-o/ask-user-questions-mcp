# tui-application Specification

## Purpose

TBD - created by archiving change add-question-enhancements. Update Purpose after archive.
## Requirements
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
- **THEN** footer SHALL show: `↑↓ Options` | `←→ Questions` | `Enter Select` (or `Space Toggle` for multi-select) | `E Elaborate` | `R Recommended` | `Ctrl+R Quick Submit` | `Esc Reject`

#### Scenario: Custom Input Focus Context

- **WHEN** custom input is focused
- **THEN** footer SHALL show: `↑↓ Options` | `Tab Next` | `Enter Newline` | `Esc Reject`

#### Scenario: Recommended Key Visibility

- **WHEN** current question has recommended options
- **THEN** footer SHALL show `R Recommended` keybinding
- **WHEN** any question in the session has recommended options
- **THEN** footer SHALL show `Ctrl+R Quick Submit` keybinding

### Requirement: Theme Provider Architecture

The system SHALL use a React Context-based theme provider for managing theme state across all components.

#### Scenario: Theme context initialization

- **WHEN** the TUI application starts
- **THEN** the system SHALL:
  1. Load theme preference from `.auqrc.json` config (default: `"system"`)
  2. If theme is `"system"`, detect terminal color scheme
  3. If theme is a custom name, load from `~/.config/auq/themes/{name}.theme.json`
  4. If loading fails, fall back to `"system"` with a warning logged to stderr
  5. Initialize ThemeProvider with resolved theme
  6. Complete theme resolution synchronously before first render (no FOUC)

#### Scenario: Theme context access

- **WHEN** a component needs theme colors
- **THEN** the component SHALL use the `useTheme()` hook to access current theme values
- **AND** the component SHALL re-render when theme changes

---

### Requirement: Built-in Themes

The system SHALL include built-in `dark` and `light` theme definitions.

#### Scenario: Dark theme colors

- **WHEN** dark theme is active
- **THEN** the system SHALL use:
  - Transparent background (terminal default)
  - Light text colors for readability on dark backgrounds
  - Cyan-based accent colors (brand consistency)
  - Lighter gradient colors for header

#### Scenario: Light theme colors

- **WHEN** light theme is active
- **THEN** the system SHALL use:
  - Transparent background (terminal default)
  - Dark text colors for readability on light backgrounds
  - Cyan-based accent colors (brand consistency)
  - Darker gradient colors for header

---

### Requirement: System Theme Detection

The system SHALL auto-detect terminal dark/light mode when theme is set to `"system"`.

#### Scenario: Detection via COLORFGBG

- **WHEN** theme is `"system"` and `COLORFGBG` environment variable is set
- **THEN** the system SHALL parse the background color value
- **AND** if background value is 0-7 (dark colors), use dark theme
- **AND** if background value is 8+ (light colors), use light theme

#### Scenario: Detection fallback

- **WHEN** theme is `"system"` and detection fails
- **THEN** the system SHALL fall back to dark theme

---

### Requirement: Custom Theme Files

The system SHALL support user-defined themes via JSON files.

#### Scenario: Theme file location

- **WHEN** loading custom themes
- **THEN** the system SHALL search `~/.config/auq/themes/*.theme.json`
- **AND** on Linux, respect `$XDG_CONFIG_HOME` if set

#### Scenario: Theme file format

- **WHEN** a custom theme file is loaded
- **THEN** the system SHALL validate against the JSON Schema
- **AND** merge partial color definitions with the base dark theme
- **AND** support hex color format only (`#RRGGBB`)

#### Scenario: Invalid theme file

- **WHEN** a theme file fails validation or parsing
- **THEN** the system SHALL log a warning to stderr
- **AND** fall back to the `"system"` theme

---

### Requirement: Theme Toggle Keyboard Shortcut

The system SHALL provide a keyboard shortcut to cycle through themes.

#### Scenario: Ctrl+T theme cycle

- **WHEN** user presses `Ctrl+T`
- **THEN** the system SHALL cycle theme in order: `system` -> `dark` -> `light` -> `system`
- **AND** apply the new theme immediately without restart
- **AND** NOT show a toast notification (silent switch)

#### Scenario: Footer keybinding display

- **WHEN** displaying footer keybindings
- **THEN** the footer SHALL include `Ctrl+T Theme` alongside other shortcuts

---

### Requirement: Theme Configuration

The system SHALL persist theme preference in the configuration file.

#### Scenario: Config schema

- **WHEN** reading/writing theme preference
- **THEN** the system SHALL use the `theme` key in `.auqrc.json`
- **AND** accept values: `"system"`, `"dark"`, `"light"`, or custom theme name string

#### Scenario: Default configuration

- **WHEN** no config file exists or `theme` key is missing
- **THEN** the system SHALL default to `"system"` (auto-detect)

---

### Requirement: Gradient Theme Adaptation

The system SHALL adapt the header gradient based on active theme.

#### Scenario: Dark mode gradient

- **WHEN** dark theme is active
- **THEN** the header gradient SHALL use lighter colors for visibility on dark backgrounds

#### Scenario: Light mode gradient

- **WHEN** light theme is active
- **THEN** the header gradient SHALL use darker colors for visibility on light backgrounds

#### Scenario: Custom theme gradient

- **WHEN** a custom theme specifies gradient colors
- **THEN** the system SHALL use the custom gradient colors
- **AND** if gradient is not specified, inherit from base theme

### Requirement: Theming

The system SHALL use a centralized theming system with dynamic theme support.

#### Scenario: Theme Configuration

- **WHEN** displaying UI elements
- **THEN** colors SHALL be sourced from the active theme via `useTheme()` hook
- **AND** include:
  - Header gradient theme (theme-aware)
  - State colors (focused, selected, pending, unanswered-highlight)
  - Component-specific color schemes
  - Support for dark, light, and custom themes
  - Consistent border brightness hierarchy (header brighter than body)

#### Scenario: Gradient Header

- **WHEN** displaying the header
- **THEN** the logo SHALL use gradient colors from the active theme

#### Scenario: Success Pill Theming

- **WHEN** displaying success messages
- **THEN** the pill background and text colors SHALL be sourced from `theme.components.toast.successPillBg` and `theme.components.toast.success`

### Requirement: Notification Batching

The system SHALL batch rapid notification events into a single notification.

#### Scenario: Multiple sessions arrive rapidly

- **WHEN** multiple sessions arrive within a short time window
- **THEN** the system SHALL send one notification with the total count
- **AND** the message SHALL reflect the total: `AUQ: 3 new question(s)`

---

### Requirement: OSC Progress Bar

The system SHALL show question completion progress via OSC 9 progress bar sequences.

#### Scenario: Progress bar activation

- **WHEN** the TUI begins processing a session (first question displayed)
- **AND** terminal supports OSC 9 (iTerm2 or unknown)
- **THEN** the system SHALL send progress bar sequence with current completion percentage

#### Scenario: Progress bar update

- **WHEN** the user answers a question and moves to the next
- **THEN** the system SHALL update progress bar with new percentage
- **AND** percentage SHALL be calculated as `(answeredQuestions / totalQuestions) * 100`

#### Scenario: Progress bar clearing

- **WHEN** a session is completed (answers submitted)
- **OR** a session is rejected
- **THEN** the system SHALL clear the progress bar with `ESC]9;4;0BEL`

---

### Requirement: Notification Sound

The system SHALL support configurable notification sounds via OS-native sound settings.

#### Scenario: Sound enabled (default)

- **WHEN** `notifications.sound` is `true` (default)
- **THEN** the system SHALL set `sound: true` in node-notifier options
- **AND** the OS SHALL play its default notification sound

#### Scenario: Sound disabled

- **WHEN** `notifications.sound` is `false`
- **THEN** the system SHALL set `sound: false` in node-notifier options
- **AND** no sound SHALL be played

---

### Requirement: Notification Configuration

The system SHALL support notification settings in the configuration file.

#### Scenario: Configuration schema

- **WHEN** reading notification settings
- **THEN** the system SHALL read from `.auqrc.json` under `notifications` key:
  ```json
  {
    "notifications": {
      "enabled": true,
      "sound": true
    }
  }
  ```

#### Scenario: Default configuration

- **WHEN** no config file exists or `notifications` key is missing
- **THEN** the system SHALL default to:
  - `enabled: true` (notifications on by default)
  - `sound: true` (sounds on by default)

#### Scenario: Disabled notifications

- **WHEN** `notifications.enabled` is `false`
- **THEN** the system SHALL NOT send any native notifications
- **AND** the system SHALL NOT show progress bar (unchanged behavior)

### Requirement: OS-Native Desktop Notifications

The system SHALL send desktop notifications via OS-native APIs (node-notifier) when new questions arrive.

#### Scenario: Notification on new session

- **WHEN** a new session is added to the queue
- **AND** `notifications.enabled` is `true` in config (default)
- **THEN** the system SHALL send a native OS notification
- **AND** the notification title SHALL be `AUQ`
- **AND** the notification message SHALL be `{N} new question(s) waiting` where N is the count

#### Scenario: macOS notification

- **WHEN** running on macOS (`process.platform === 'darwin'`)
- **THEN** the system SHALL use node-notifier's NotificationCenter backend
- **AND** no additional configuration SHALL be required

#### Scenario: Windows notification

- **WHEN** running on Windows (`process.platform === 'win32'`)
- **THEN** the system SHALL use node-notifier's WindowsToaster backend
- **AND** the system SHALL set `appID` to `'com.auq.mcp'` for Action Center persistence

#### Scenario: Linux notification

- **WHEN** running on Linux (`process.platform === 'linux'`)
- **THEN** the system SHALL use node-notifier's NotifySend backend
- **AND** the system SHALL require `notify-send` binary (from libnotify-bin package)

#### Scenario: Notification failure handling

- **WHEN** node-notifier fails to send a notification
- **THEN** the system SHALL log a warning message once
- **AND** the system SHALL continue operating without notifications
- **AND** the system SHALL NOT crash or throw errors to the user

---

### Requirement: Linux Dependency Detection

The system SHALL detect missing Linux notification dependencies at startup.

#### Scenario: notify-send available

- **WHEN** running on Linux
- **AND** `notify-send` binary is found in PATH
- **THEN** the system SHALL proceed normally without warnings

#### Scenario: notify-send missing

- **WHEN** running on Linux
- **AND** `notify-send` binary is NOT found in PATH
- **THEN** the system SHALL log a warning at startup
- **AND** the warning SHALL include: `notify-send not found. Install libnotify-bin for desktop notifications.`
- **AND** the system SHALL continue operating without notifications

#### Scenario: Non-Linux platforms

- **WHEN** running on macOS or Windows
- **THEN** the system SHALL NOT perform dependency checks
- **AND** notifications SHALL work without additional system dependencies

---

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

### Requirement: Unanswered Question Highlighting

The system SHALL visually emphasize unanswered questions using attention-grabbing colors.

#### Scenario: TabBar Unanswered Display

- **WHEN** displaying a question tab that has not been answered
- **THEN** the system SHALL display the tab with a red-family highlight color
- **AND** the color SHALL be clearly distinguishable from answered (green) and active (theme primary) states

#### Scenario: ReviewScreen Unanswered Display

- **WHEN** displaying an unanswered question on the review screen
- **THEN** the system SHALL display "Unanswered" text in a red-family highlight color
- **AND** the text SHALL NOT use dimColor attribute (should be prominent, not subtle)

#### Scenario: Theme-Consistent Unanswered Color

- **WHEN** using any built-in theme (dark, light, nord, dracula, etc.)
- **THEN** the unanswered highlight color SHALL be a red-family color appropriate for that theme's palette
- **AND** the color SHALL maintain sufficient contrast against the theme's background

---

### Requirement: Success Message Pill Style

The system SHALL display success messages in a modern pill/badge style.

#### Scenario: Success Toast Appearance

- **WHEN** displaying "Answers submitted successfully!" message
- **THEN** the system SHALL:
  1. Display the message with a colored background (pill/badge style)
  2. NOT display a border outline around the message
  3. Center-align the message horizontally in its container
  4. Use theme-appropriate background and text colors

#### Scenario: Pill Style Colors

- **WHEN** displaying a success pill
- **THEN** the background color SHALL be a subtle, theme-appropriate success color
- **AND** the text color SHALL be the theme's success text color
- **AND** the combination SHALL maintain WCAG AA contrast ratio

---

### Requirement: Theme Border Brightness Consistency

The system SHALL maintain consistent brightness relationships between header and body borders across all themes.

#### Scenario: Header Border Brightness

- **WHEN** rendering header component borders
- **THEN** the border color SHALL be consistently brighter (higher lightness) than body component borders
- **AND** both colors SHALL share the same hue family within a theme

#### Scenario: Body Border Brightness

- **WHEN** rendering body component borders (footer, options, input, etc.)
- **THEN** the border color SHALL be consistently darker (lower lightness) than header borders
- **AND** the brightness difference SHALL be perceptually similar across all themes

#### Scenario: Cross-Theme Consistency

- **WHEN** switching between any two built-in themes
- **THEN** the relative brightness relationship between header and body borders SHALL remain consistent
- **AND** users SHALL perceive a similar visual hierarchy regardless of theme choice

---

### Requirement: Markdown Prompt Rendering

The system MUST render question prompts as Markdown in the question view.

#### Scenario: Prompt renders as Markdown

- **WHEN** a question is displayed in the question view
- **THEN** the system SHALL render the question `prompt` using a Markdown renderer
- **AND** the renderer MUST support both inline Markdown and fenced code blocks

#### Scenario: Inline-by-default rendering mode

- **WHEN** a prompt contains only inline Markdown constructs (for example emphasis, inline code, links)
- **THEN** the system SHALL render the prompt as a single inline flow (without inserting extra block spacing)

#### Scenario: Block rendering when block elements exist

- **WHEN** a prompt contains block-level Markdown elements (for example fenced code blocks)
- **THEN** the system SHALL render the prompt using block layout suitable for multi-line content

---

### Requirement: Supported Inline Markdown

The system SHALL support a core inline Markdown feature set for question prompts.

#### Scenario: Emphasis and inline code

- **WHEN** a prompt contains bold or italic emphasis
- **THEN** the system SHALL render the emphasized text distinctly from surrounding text
- **AND** **WHEN** a prompt contains inline code (backticks)
- **THEN** the system SHALL render inline code with a distinct style

#### Scenario: Strikethrough

- **WHEN** a prompt contains strikethrough syntax
- **THEN** the system SHALL render strikethrough text distinctly from surrounding text

---

### Requirement: Fenced Code Block Rendering

The system SHALL render fenced code blocks in prompts as code blocks.

#### Scenario: Code block renders as a distinct block

- **WHEN** a prompt contains a fenced code block
- **THEN** the system SHALL render the code block as a visually distinct block separate from surrounding text

#### Scenario: Syntax highlighting

- **WHEN** a fenced code block includes a language identifier
- **THEN** the system SHALL apply syntax highlighting to the code block content

---

### Requirement: Theme-Aware Code Block Colors

The system SHALL apply theme-aware colors for code block backgrounds and text.

#### Scenario: Code block colors derived from theme

- **WHEN** rendering a code block
- **THEN** the system SHALL use the active theme (via `useTheme()`)
- **AND** the theme MUST provide semantic color tokens for code block background and code block text

---

### Requirement: Link Rendering Format

The system SHALL render links in prompts in a terminal-compatible text format.

#### Scenario: Link renders as text plus URL

- **WHEN** a prompt contains a Markdown link
- **THEN** the system SHALL render it in the format `text (url)`

---

### Requirement: Graceful Fallback on Markdown Failure

The system MUST fall back to plain-text prompt rendering if Markdown parsing or rendering fails.

#### Scenario: Silent fallback without user-visible errors

- **WHEN** Markdown parsing or rendering throws an error
- **THEN** the system SHALL render the raw prompt text as plain text
- **AND** the system SHALL NOT display an error message to the user

---

### Requirement: Consistent Prompt Rendering in Review Screen

The system SHALL render prompts consistently across the question view and review screen.

#### Scenario: Review screen uses the same prompt renderer

- **WHEN** the review screen displays a question prompt
- **THEN** the system SHALL render the prompt using the same Markdown prompt renderer used in the question view

---

### Requirement: Terminal Width Matching

The system SHALL render Markdown prompts to match the available terminal width.

#### Scenario: Prompt layout respects terminal width

- **WHEN** the terminal width changes or differs between environments
- **THEN** the system SHALL layout the rendered prompt content to fit within the current terminal width

