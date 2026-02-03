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
  - State colors (focused, selected, pending)
  - Component-specific color schemes
  - Support for dark, light, and custom themes

#### Scenario: Gradient Header

- **WHEN** displaying the header
- **THEN** the logo SHALL use gradient colors from the active theme

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

### Requirement: Notification Icon

The system SHALL support a custom notification icon.

#### Scenario: Icon file exists

- **WHEN** an icon file exists at `src/tui/notifications/assets/icon.png`
- **THEN** the system SHALL use that icon in native notifications
- **AND** the icon path SHALL be resolved as an absolute path

#### Scenario: Icon file missing

- **WHEN** no icon file exists at the expected path
- **THEN** the system SHALL use the OS default notification icon
- **AND** no error or warning SHALL be logged

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

