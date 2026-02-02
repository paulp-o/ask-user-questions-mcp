# Change: Add AUQ Configuration System

## Why

Currently, AUQ has hardcoded limits (max 4 questions, max 4 options) and no user-configurable settings. Users need the ability to customize these limits, set language preferences for the TUI interface, and configure other session parameters without modifying code.

## What Changes

- **Configuration File Support**: Add `.auqrc.json` config file support (global + local)
- **Customizable Limits**: Allow configuring maxOptions, maxQuestions, recommendedOptions, recommendedQuestions
- **Extended Settings**: Support sessionTimeout, retentionPeriod, theme settings
- **Internationalization (i18n)**: Add language setting with system locale auto-detection
- **TUI Localization**: Translate all TUI interface text (footer, headers, toasts, dialogs)

## Impact

- Affected specs: `cli-interface`, `session-management`
- Affected code:
  - `src/shared/schemas.ts` - Make limits configurable
  - `src/session/types.ts` - Add config types
  - `src/session/utils.ts` - Add config file loading
  - `src/tui/` - Add i18n support to all components
  - `bin/auq.tsx` - Load config on startup
- **New files**:
  - `src/config/ConfigLoader.ts` - Config file discovery and parsing
  - `src/i18n/` - Internationalization module with translations
