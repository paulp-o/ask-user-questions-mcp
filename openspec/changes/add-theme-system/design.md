# Design: Theme System Architecture

## Context

AUQ is a React/Ink terminal UI application that currently uses a single hardcoded theme in `src/tui/theme.ts`. The theme object is imported directly by all 14 components. This design document outlines the architecture for supporting multiple themes with runtime switching.

**Stakeholders**: End users wanting dark/light mode, contributors maintaining themes

## Goals / Non-Goals

### Goals

- Support built-in dark and light themes that work out of the box
- Auto-detect terminal color scheme when `theme: "system"` is configured
- Allow users to create custom themes via JSON files
- Enable runtime theme switching via `Ctrl+T` keyboard shortcut
- Maintain type safety and IDE support for theme colors
- Synchronous theme loading to prevent flash of unstyled content (FOUC)

### Non-Goals

- Hot-reload of theme files (restart required for file changes)
- WCAG contrast ratio validation (trust user)
- Web-based theme preview tool
- Theme marketplace or sharing

## Decisions

### Decision 1: React Context for Theme State

**What**: Use React Context API with `ThemeProvider` and `useTheme()` hook.

**Why**:

- Natural fit for React/Ink component tree
- Enables re-render on theme change without prop drilling
- Standard React pattern, familiar to contributors

**Alternatives considered**:

- Global singleton module: Simpler but doesn't trigger re-renders
- Props drilling: Too verbose for 14 components deep

### Decision 2: Theme Detection Strategy

**What**: Use `COLORFGBG` environment variable as primary detection, with OSC 11 query as secondary.

**Why**:

- `COLORFGBG` is set by many terminals (xterm, rxvt, kitty)
- Format: `foreground;background` (e.g., `15;0` = light on dark)
- OSC 11 query works on iTerm2, kitty, and others
- Fallback to `dark` if detection fails (safer default)

**Detection Algorithm**:

```typescript
function detectSystemTheme(): "dark" | "light" {
  // 1. Check COLORFGBG environment variable
  const colorfgbg = process.env.COLORFGBG;
  if (colorfgbg) {
    const [, bg] = colorfgbg.split(";");
    const bgNum = parseInt(bg, 10);
    // Low numbers (0-7) typically indicate dark background
    if (!isNaN(bgNum)) {
      return bgNum < 8 ? "dark" : "light";
    }
  }

  // 2. OSC 11 query would require async/terminal interaction
  // Skip for simplicity - most terminals set COLORFGBG

  // 3. Fallback to dark (safer for unknown terminals)
  return "dark";
}
```

### Decision 3: Theme File Format

**What**: JSON files with semantic color names, hex values only, partial override support.

**Why**:

- JSON is universal and easy to edit
- Semantic names (`primary`, `success`) are more maintainable than raw colors
- Hex-only keeps parsing simple and terminal-compatible
- Partial override reduces boilerplate for users

**Theme File Structure**:

```json
{
  "$schema": "https://raw.githubusercontent.com/paulp-o/ask-user-questions-mcp/main/schemas/theme.schema.json",
  "name": "my-theme",
  "colors": {
    "primary": "#FF5733",
    "text": "#FFFFFF"
  },
  "gradient": {
    "start": "#FF5733",
    "middle": "#FFC300",
    "end": "#FF5733"
  }
}
```

### Decision 4: Theme Cycle Order

**What**: `Ctrl+T` cycles through `system` -> `dark` -> `light` -> `system`.

**Why**:

- Three states give users full control
- `system` first because it's the default
- Circular cycle is intuitive

### Decision 5: Transparent Backgrounds

**What**: Both built-in themes use terminal default (transparent) background.

**Why**:

- Respects user's terminal configuration
- Avoids jarring background color clashes
- Only text/accent colors need to adapt

## Risks / Trade-offs

| Risk                                       | Mitigation                                         |
| ------------------------------------------ | -------------------------------------------------- |
| Theme detection may fail on some terminals | Default to `dark`, which works on most backgrounds |
| Custom themes may have poor contrast       | Document best practices, provide schema validation |
| Three-way toggle may confuse users         | Show current theme in footer keybind hint          |
| Config file may not exist                  | Create default config or use built-in defaults     |

## Migration Plan

1. **Phase 1**: Add theme infrastructure (ThemeProvider, built-in themes)
2. **Phase 2**: Migrate all components to `useTheme()` hook
3. **Phase 3**: Add keyboard shortcut and detection
4. **Phase 4**: Add custom theme file support

**Rollback**: Revert to static theme import if issues arise. No data migration needed.

## Open Questions

None - all questions resolved through user clarification.
