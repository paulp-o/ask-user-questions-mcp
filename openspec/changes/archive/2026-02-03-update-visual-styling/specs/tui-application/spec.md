## ADDED Requirements

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

## MODIFIED Requirements

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
