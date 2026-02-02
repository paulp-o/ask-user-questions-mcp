# Tasks: Add AUQ Configuration System

## 1. Configuration File Infrastructure

- [ ] 1.1 Create `src/config/types.ts` with AUQConfig interface
- [ ] 1.2 Create `src/config/ConfigLoader.ts` with config discovery and parsing
  - Search order: local (.auqrc.json) -> global (~/.config/auq/.auqrc.json) -> defaults
  - Merge settings with defaults
  - Zod validation for type safety
- [ ] 1.3 Create `src/config/defaults.ts` with default configuration values
- [ ] 1.4 Write unit tests for ConfigLoader
- [ ] 1.5 Integrate config loading in `bin/auq.tsx` startup

## 2. Configurable Limits

- [ ] 2.1 Update `src/shared/schemas.ts` to use config values for limits
  - Make .min() and .max() values dynamic based on config
  - Update schema descriptions to reflect configurable nature
- [ ] 2.2 Update `src/session/types.ts` DEFAULT_SESSION_CONFIG to read from config
- [ ] 2.3 Propagate config to SessionManager constructor
- [ ] 2.4 Write tests for limit validation with custom config

## 3. Internationalization Infrastructure

- [ ] 3.1 Create `src/i18n/index.ts` with translation system
  - Key-based translation function: `t("key.path")`
  - Language detection from config/system
  - Fallback to English for missing keys
- [ ] 3.2 Create `src/i18n/locales/en.ts` with English translations
- [ ] 3.3 Create `src/i18n/locales/ko.ts` with Korean translations
- [ ] 3.4 Write unit tests for i18n system

## 4. TUI Localization

- [ ] 4.1 Update `Footer.tsx` to use translated keybinding labels
- [ ] 4.2 Update `Header.tsx` to use translated text
- [ ] 4.3 Update `WaitingScreen.tsx` to use translated messages
- [ ] 4.4 Update `ConfirmationDialog.tsx` to use translated prompts
- [ ] 4.5 Update `ReviewScreen.tsx` to use translated labels
- [ ] 4.6 Update `Toast.tsx` to use translated messages
- [ ] 4.7 Update CLI help text in `bin/auq.tsx` (English only for CLI)

## 5. Extended Settings Support

- [ ] 5.1 Add sessionTimeout config support to SessionManager
- [ ] 5.2 Add retentionPeriod config support to cleanup logic
- [ ] 5.3 Add theme config support to `src/tui/theme.ts`
  - Support "default", "minimal", "colorful" themes
- [ ] 5.4 Write integration tests for extended settings

## 6. Documentation

- [ ] 6.1 Create example `.auqrc.json` file in repo root
- [ ] 6.2 Update README with configuration documentation
- [ ] 6.3 Document all available settings with defaults and ranges
- [ ] 6.4 Add troubleshooting section for config issues
