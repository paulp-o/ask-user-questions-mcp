## ADDED Requirements

### Requirement: Renderer Selection

The system SHALL support selecting between ink and OpenTUI renderers.

#### Scenario: Environment variable selection

- **WHEN** the `AUQ_RENDERER` environment variable is set to `'ink'` or `'opentui'`
- **THEN** the system SHALL use the specified renderer
- **AND** the default value SHALL be `'ink'` if the variable is not set

#### Scenario: Configuration file selection

- **WHEN** the `.auqrc.json` config file contains a `renderer` field
- **AND** the `AUQ_RENDERER` environment variable is NOT set
- **THEN** the system SHALL use the renderer specified in the config

#### Scenario: Environment variable overrides config

- **WHEN** both `AUQ_RENDERER` environment variable and `renderer` config field are set
- **THEN** the environment variable SHALL take precedence over the config file

#### Scenario: Conditional dynamic import at entry point

- **WHEN** the TUI application starts
- **THEN** the system SHALL conditionally import the appropriate renderer based on selection
- **AND** the entry point SHALL use dynamic import to load either ink or OpenTUI components

#### Scenario: Graceful fallback on OpenTUI initialization failure

- **WHEN** OpenTUI renderer is selected but fails to initialize
- **THEN** the system SHALL fall back to the ink renderer
- **AND** the system SHALL display a warning message to stderr

---

### Requirement: OpenTUI Renderer Configuration

When using the OpenTUI renderer, the system SHALL configure the renderer with specific settings.

#### Scenario: Exit on Ctrl+C disabled

- **WHEN** the OpenTUI renderer is initialized
- **THEN** the `exitOnCtrlC` option SHALL be set to `false`
- **AND** the system SHALL handle Ctrl+C manually

#### Scenario: Mouse support enabled

- **WHEN** the OpenTUI renderer is initialized
- **THEN** the `useMouse` option SHALL be set to `true`
- **AND** the system SHALL support full mouse interactions including click, scroll, and drag

#### Scenario: Auto-focus disabled

- **WHEN** the OpenTUI renderer is initialized
- **THEN** the `autoFocus` option SHALL be set to `false`
- **AND** the system SHALL manage focus manually

#### Scenario: Alternate screen buffer enabled

- **WHEN** the OpenTUI renderer is initialized
- **THEN** the `useAlternateScreen` option SHALL be set to `true`
- **AND** the system SHALL take over the full terminal screen

#### Scenario: Kitty keyboard protocol enabled

- **WHEN** the OpenTUI renderer is initialized
- **THEN** the `useKittyKeyboard` option SHALL be set to `{}`
- **AND** the system SHALL use better key detection with graceful fallback for unsupported terminals

#### Scenario: Debug console conditional

- **WHEN** the OpenTUI renderer is initialized
- **AND** the `AUQ_DEBUG` environment variable is set to `1`
- **THEN** the `useConsole` option SHALL be enabled
- **AND** when `AUQ_DEBUG` is not set, `useConsole` SHALL be disabled

#### Scenario: Target FPS configured

- **WHEN** the OpenTUI renderer is initialized
- **THEN** the `targetFps` option SHALL be set to `60`

---

### Requirement: Mouse Interaction Support

When using the OpenTUI renderer, the system SHALL support mouse interactions.

#### Scenario: Click on option items

- **WHEN** user clicks on an option item in a question
- **THEN** the system SHALL select or toggle the option

#### Scenario: Scroll in scrollable areas

- **WHEN** user scrolls in scrollable areas such as the session picker or update overlay
- **THEN** the content SHALL scroll accordingly

#### Scenario: Click on session dots

- **WHEN** user clicks on session dots
- **THEN** the system SHALL switch to the selected session

#### Scenario: Mouse does not interfere with keyboard workflow

- **WHEN** mouse events are processed
- **THEN** keyboard-only workflows SHALL continue to function normally
- **AND** mouse interactions SHALL be additive, not replacing keyboard functionality

---

### Requirement: OpenTUI Component Architecture

When using the OpenTUI renderer, the system SHALL use the specified component architecture.

#### Scenario: React bindings from @opentui/react

- **WHEN** using the OpenTUI renderer
- **THEN** the system SHALL use `@opentui/react` for React bindings

#### Scenario: Native input for single-line text

- **WHEN** displaying a single-line text input
- **THEN** the system SHALL use the native `<input>` component

#### Scenario: Native textarea for multi-line text

- **WHEN** displaying a multi-line text input
- **THEN** the system SHALL use the native `<textarea>` component

#### Scenario: Native markdown with Tree-Sitter

- **WHEN** rendering markdown content
- **THEN** the system SHALL use the native `<markdown>` component with Tree-Sitter for syntax highlighting

#### Scenario: Custom multi-select component

- **WHEN** displaying a multi-select question
- **THEN** the system SHALL use a custom multi-select component built on `<box>`, `<text>`, and `useKeyboard()`
- **AND** the system SHALL NOT use OpenTUI's native `<select>` which only supports single-select

#### Scenario: Keyboard event handling with useKeyboard

- **WHEN** handling keyboard events
- **THEN** the system SHALL use `useKeyboard()` hook instead of `useInput()`

#### Scenario: Terminal dimensions with useTerminalDimensions

- **WHEN** accessing terminal size
- **THEN** the system SHALL use `useTerminalDimensions()` instead of `useStdout()`

#### Scenario: App lifecycle with useRenderer

- **WHEN** managing application lifecycle
- **THEN** the system SHALL use `useRenderer()` hook

#### Scenario: Toast animations with useTimeline

- **WHEN** animating toast notifications
- **THEN** the system SHALL use `useTimeline()` for animations

---

### Requirement: SyntaxStyle Theme Integration

When using the OpenTUI renderer, the system SHALL auto-generate SyntaxStyle objects from existing theme color tokens for markdown and code rendering.

#### Scenario: Accent to keywords mapping

- **WHEN** generating SyntaxStyle from theme
- **THEN** the `accent` theme color SHALL map to keywords in SyntaxStyle

#### Scenario: Success to strings mapping

- **WHEN** generating SyntaxStyle from theme
- **THEN** the `success` theme color SHALL map to strings in SyntaxStyle

#### Scenario: Muted to comments mapping

- **WHEN** generating SyntaxStyle from theme
- **THEN** the `muted` theme color SHALL map to comments in SyntaxStyle with italic style

#### Scenario: Warning to numbers mapping

- **WHEN** generating SyntaxStyle from theme
- **THEN** the `warning` theme color SHALL map to numbers in SyntaxStyle

#### Scenario: Accent to headings mapping

- **WHEN** generating SyntaxStyle from theme
- **THEN** the `accent` theme color SHALL map to headings in SyntaxStyle with bold style

#### Scenario: Text to default mapping

- **WHEN** generating SyntaxStyle from theme
- **THEN** the `text` theme color SHALL map to the default text color in SyntaxStyle

#### Scenario: Secondary to code blocks mapping

- **WHEN** generating SyntaxStyle from theme
- **THEN** the `secondary` theme color SHALL map to code and raw blocks in SyntaxStyle

---

### Requirement: OpenTUI Code Organization

The system SHALL organize OpenTUI components in a parallel directory structure.

#### Scenario: Parallel directory structure

- **WHEN** organizing OpenTUI components
- **THEN** `src/tui-opentui/` SHALL mirror the structure of `src/tui/`

#### Scenario: Shared framework-agnostic code

- **WHEN** organizing shared code
- **THEN** `src/tui/shared/` SHALL contain framework-agnostic code imported by both ink and OpenTUI versions

#### Scenario: Shared theme definitions

- **WHEN** defining themes
- **THEN** theme definitions SHALL be placed in `src/tui/shared/`
- **AND** both renderers SHALL import from the shared location

#### Scenario: Shared UI types

- **WHEN** defining UI types
- **THEN** type definitions SHALL be placed in `src/tui/shared/`
- **AND** both renderers SHALL import from the shared location

#### Scenario: Shared utility functions

- **WHEN** defining utility functions
- **THEN** framework-agnostic utilities SHALL be placed in `src/tui/shared/`
- **AND** both renderers SHALL import from the shared location

#### Scenario: Shared notifications

- **WHEN** defining notification logic
- **THEN** notification code SHALL be placed in `src/tui/shared/`
- **AND** both renderers SHALL import from the shared location

#### Scenario: Shared i18n

- **WHEN** defining internationalization
- **THEN** i18n resources SHALL be placed in `src/tui/shared/`
- **AND** both renderers SHALL import from the shared location

#### Scenario: Session watcher with event emitter

- **WHEN** implementing session watching
- **THEN** the session watcher SHALL use an event emitter interface
- **AND** per-framework adapters SHALL wrap the event emitter for each renderer

---

## MODIFIED Requirements

### Requirement: Gradient Theme Adaptation

The system SHALL adapt the header appearance based on active theme and renderer.

#### Scenario: Dark mode gradient with ink renderer

- **WHEN** dark theme is active and ink renderer is used
- **THEN** the header gradient SHALL use lighter colors for visibility on dark backgrounds

#### Scenario: Light mode gradient with ink renderer

- **WHEN** light theme is active and ink renderer is used
- **THEN** the header gradient SHALL use darker colors for visibility on light backgrounds

#### Scenario: Custom theme gradient with ink renderer

- **WHEN** a custom theme specifies gradient colors and ink renderer is used
- **THEN** the system SHALL use the custom gradient colors
- **AND** if gradient is not specified, inherit from base theme

#### Scenario: Solid accent color with OpenTUI renderer

- **WHEN** OpenTUI renderer is used
- **THEN** the header SHALL use solid accent color instead of gradient
- **AND** the gradient feature SHALL be replaced with a solid color fill

---

### Requirement: Success Message Pill Style

The system SHALL display success messages in a modern pill/badge style with renderer-appropriate animation.

#### Scenario: Success toast appearance

- **WHEN** displaying "Answers submitted successfully!" message
- **THEN** the system SHALL:
  1. Display the message with a colored background (pill/badge style)
  2. NOT display a border outline around the message
  3. Center-align the message horizontally in its container
  4. Use theme-appropriate background and text colors

#### Scenario: Pill style colors

- **WHEN** displaying a success pill
- **THEN** the background color SHALL be a subtle, theme-appropriate success color
- **AND** the text color SHALL be the theme's success text color
- **AND** the combination SHALL maintain WCAG AA contrast ratio

#### Scenario: Toast animation with ink renderer

- **WHEN** ink renderer is used
- **THEN** the toast SHALL use `setTimeout` for fade animation

#### Scenario: Toast animation with OpenTUI renderer

- **WHEN** OpenTUI renderer is used
- **THEN** the toast SHALL use `useTimeline` for fade animation
