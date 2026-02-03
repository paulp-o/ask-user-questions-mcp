## 1. Unanswered Red Highlighting

- [ ] 1.1 Add `unansweredHighlight` color token to Theme interface (red-family color)
- [ ] 1.2 Update dark theme with appropriate red highlight color (e.g., #FF6B6B or similar)
- [ ] 1.3 Update light theme with appropriate red highlight color (darker for light bg)
- [ ] 1.4 Update all other themes (nord, dracula, catppuccin, solarized, gruvbox, tokyo-night, one-dark, monokai, github, rose-pine) with consistent red variants
- [ ] 1.5 Update TabBar to use `unansweredHighlight` instead of dim gray for unanswered questions
- [ ] 1.6 Update ReviewScreen to use `unansweredHighlight` for "Unanswered" text (remove dimColor)

## 2. Success Message Pill Styling

- [ ] 2.1 Add `successPill` component tokens to Theme interface (bg color, text color)
- [ ] 2.2 Update Toast component to support pill variant (no border, background color)
- [ ] 2.3 Center-align success toast in parent container
- [ ] 2.4 Remove `borderStyle` and `borderColor` from Toast when displaying as pill
- [ ] 2.5 Update all themes with appropriate pill background colors
- [ ] 2.6 Update tui-app.tsx to use pill variant for success messages

## 3. Header/Body Border Consistency

- [ ] 3.1 Define brightness relationship convention (e.g., header 20% brighter than body)
- [ ] 3.2 Add design documentation for border color derivation formula
- [ ] 3.3 Update Theme interface to clarify header vs body border semantic difference
- [ ] 3.4 Audit all themes and adjust border colors to follow consistent brightness relationship:
  - [ ] dark theme
  - [ ] light theme
  - [ ] nord
  - [ ] dracula
  - [ ] catppuccin-mocha
  - [ ] catppuccin-latte
  - [ ] solarized-dark
  - [ ] solarized-light
  - [ ] gruvbox-dark
  - [ ] gruvbox-light
  - [ ] tokyo-night
  - [ ] one-dark
  - [ ] monokai
  - [ ] github-dark
  - [ ] github-light
  - [ ] rose-pine
- [ ] 3.5 Document the color relationship in theme.ts or types.ts comments

## 4. Testing & Validation

- [ ] 4.1 Visual test unanswered highlighting in TabBar
- [ ] 4.2 Visual test unanswered highlighting in ReviewScreen
- [ ] 4.3 Visual test success pill styling and centering
- [ ] 4.4 Cycle through all themes (Ctrl+T) to verify border consistency
- [ ] 4.5 Run lsp_diagnostics on all changed theme files
- [ ] 4.6 Run existing test suite to ensure no regressions
