# Change: Add Theme System (Dark/Light Mode Support)

## Why

AUQ currently uses a single hardcoded color theme optimized for dark terminal backgrounds. Users with light terminal themes experience poor contrast and readability issues. The README roadmap explicitly lists "Light & dark mode themes" as a planned feature. Adding theme support improves accessibility and user experience across diverse terminal configurations.

## What Changes

- **Theme Provider Architecture**: Add React Context-based theme system with `ThemeProvider` wrapper and `useTheme()` hook
- **Built-in Themes**: Ship default `dark` and `light` theme definitions with brand-consistent colors
- **System Theme Detection**: Auto-detect terminal dark/light mode via `COLORFGBG` environment variable and OSC 11 query
- **Custom Theme Files**: Support user-defined themes in `~/.config/auq/themes/*.theme.json` with JSON Schema validation
- **Theme Toggle**: Add `Ctrl+T` keyboard shortcut to cycle through `system` -> `dark` -> `light` -> `system`
- **Config Integration**: Store theme preference in `.auqrc.json` under `theme` key
- **Gradient Adaptation**: Adjust header gradient colors based on active theme
- **Full Component Support**: Update all 14 TUI components to use dynamic theme from context

## Impact

- Affected specs: `tui-application`
- Affected code:
  - `src/tui/theme.ts` - Refactor to theme provider with multiple themes
  - `src/tui/components/*.tsx` - All 14 components updated to use `useTheme()` hook
  - `bin/tui-app.tsx` - Wrap app in `ThemeProvider`
  - `src/tui/utils/gradientText.ts` - Theme-aware gradient generation
- **New files**:
  - `src/tui/ThemeProvider.tsx` - React Context provider for theme state
  - `src/tui/themes/dark.ts` - Built-in dark theme definition
  - `src/tui/themes/light.ts` - Built-in light theme definition
  - `src/tui/themes/index.ts` - Theme registry and loader
  - `src/tui/utils/detectTheme.ts` - Terminal theme detection utilities
  - `schemas/theme.schema.json` - JSON Schema for custom theme validation
