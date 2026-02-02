# TUI Application - Theme System Delta

## ADDED Requirements

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
