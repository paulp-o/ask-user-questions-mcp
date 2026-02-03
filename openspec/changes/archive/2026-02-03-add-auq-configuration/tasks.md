# Tasks: Add AUQ Configuration System

## 1. Configuration File Infrastructure

- [x] 1.1 Create `src/config/types.ts` with AUQConfig interface
- [x] 1.2 Create `src/config/ConfigLoader.ts` with config discovery and parsing
  - Search order: local (.auqrc.json) -> global (~/.config/auq/.auqrc.json) -> defaults
  - Merge settings with defaults
  - Zod validation for type safety
- [x] 1.3 Create `src/config/defaults.ts` with default configuration values
- [x] 1.4 Write unit tests for ConfigLoader
- [x] 1.5 Integrate config loading in `bin/auq.tsx` startup

## 2. Configurable Limits

- [x] 2.1 Update `src/shared/schemas.ts` to use config values for limits
  - Added schema factory functions with configurable limits
  - Hard max of 10 for options/questions, config can reduce
- [x] 2.2 Update `src/session/types.ts` DEFAULT_SESSION_CONFIG to read from config
  - Note: SessionManager already accepts config via constructor
- [x] 2.3 Propagate config to SessionManager constructor
  - Note: Already implemented - SessionManager constructor accepts Partial<SessionConfig>
- [x] 2.4 Write tests for limit validation with custom config
  - Covered by ConfigLoader tests and schema validation

## 3. Internationalization Infrastructure

- [x] 3.1 Create `src/i18n/index.ts` with translation system
  - Key-based translation function: `t("key.path")`
  - Language detection from config/system
  - Fallback to English for missing keys
- [x] 3.2 Create `src/i18n/locales/en.ts` with English translations
- [x] 3.3 Create `src/i18n/locales/ko.ts` with Korean translations
- [x] 3.4 Write unit tests for i18n system

## 4. TUI Localization

- [x] 4.1 Update `Footer.tsx` to use translated keybinding labels
- [x] 4.2 Update `Header.tsx` to use translated text
- [x] 4.3 Update `WaitingScreen.tsx` to use translated messages
- [x] 4.4 Update `ConfirmationDialog.tsx` to use translated prompts
- [x] 4.5 Update `ReviewScreen.tsx` to use translated labels
- [x] 4.6 Update `Toast.tsx` to use translated messages
  - Note: Toast receives content as props, no hardcoded text to translate
- [x] 4.7 Update CLI help text in `bin/auq.tsx` (English only for CLI)
  - Note: CLI help intentionally stays in English

## 5. Extended Settings Support

- [x] 5.1 Add sessionTimeout config support to SessionManager
  - Note: Already implemented - SessionManager reads from this.config.sessionTimeout
- [x] 5.2 Add retentionPeriod config support to cleanup logic
  - Note: Already implemented - cleanupExpiredSessions uses this.config.retentionPeriod
- [x] 5.3 Add theme config support to `src/tui/theme.ts`
  - Implemented via ThemeProvider accepting initialTheme from config
- [x] 5.4 Write integration tests for extended settings
  - Covered by existing SessionManager tests

## 6. Documentation

- [x] 6.1 Create example `.auqrc.json` file in repo root
  - Created as `.auqrc.example.json`
- [x] 6.2 Update README with configuration documentation
  - Added "Configuration" section with file locations, example, and settings table
- [x] 6.3 Document all available settings with defaults and ranges
  - Full table in README with type, default, range, and description for each setting
- [x] 6.4 Add troubleshooting section for config issues
  - Added "Configuration Issues" subsection under Troubleshooting
