# Tasks: Add Theme System

## 1. Theme Infrastructure

- [x] 1.1 Create `src/tui/themes/types.ts` with Theme interface definition
- [x] 1.2 Create `src/tui/themes/dark.ts` built-in dark theme (current colors as base)
- [x] 1.3 Create `src/tui/themes/light.ts` built-in light theme (inverted backgrounds, adjusted text)
- [x] 1.4 Create `src/tui/themes/index.ts` theme registry with `getTheme()` and `listThemes()`
- [x] 1.5 Create `schemas/theme.schema.json` JSON Schema for custom theme validation

## 2. Theme Provider

- [x] 2.1 Create `src/tui/ThemeContext.tsx` with React Context and `useTheme()` hook
- [x] 2.2 Create `src/tui/ThemeProvider.tsx` provider component with state management
- [x] 2.3 Implement theme cycling logic (system -> dark -> light -> system)
- [x] 2.4 Add `Ctrl+T` keyboard handler in ThemeProvider

## 3. Theme Detection

- [x] 3.1 Create `src/tui/utils/detectTheme.ts` with `detectSystemTheme()` function
- [x] 3.2 Implement `COLORFGBG` environment variable parsing
- [x] 3.3 Add fallback to `dark` when detection fails
- [x] 3.4 Cache detection result to avoid repeated checks

## 4. Custom Theme Support

- [x] 4.1 Create `src/tui/themes/loader.ts` for loading themes from `~/.config/auq/themes/`
- [x] 4.2 Implement theme file discovery (`*.theme.json` pattern)
- [x] 4.3 Add JSON Schema validation for loaded themes
- [x] 4.4 Implement partial override merging with base theme
- [x] 4.5 Add error handling with fallback to built-in theme on invalid files

## 5. Config Integration

- [x] 5.1 Add `theme` field to config schema (type: `'system' | 'dark' | 'light' | string`)
- [x] 5.2 Update config loader to read theme preference
- [x] 5.3 Implement synchronous theme resolution on startup (prevent FOUC)
- [x] 5.4 Log warning if configured theme not found, fallback to `system`

## 6. Component Migration

- [x] 6.1 Update `src/tui/theme.ts` to export theme utilities instead of static object
- [x] 6.2 Migrate `Header.tsx` to use `useTheme()` hook
- [x] 6.3 Migrate `Footer.tsx` to use `useTheme()` hook
- [x] 6.4 Migrate `OptionsList.tsx` to use `useTheme()` hook
- [x] 6.5 Migrate `TabBar.tsx` to use `useTheme()` hook
- [x] 6.6 Migrate `Toast.tsx` to use `useTheme()` hook
- [x] 6.7 Migrate `QuestionDisplay.tsx` to use `useTheme()` hook
- [x] 6.8 Migrate `ReviewScreen.tsx` to use `useTheme()` hook
- [x] 6.9 Migrate `ConfirmationDialog.tsx` to use `useTheme()` hook
- [x] 6.10 Migrate `WaitingScreen.tsx` to use `useTheme()` hook
- [x] 6.11 Migrate `StepperView.tsx` to use `useTheme()` hook
- [x] 6.12 Migrate `SingleLineTextInput.tsx` to use `useTheme()` hook
- [x] 6.13 Migrate `MultiLineTextInput.tsx` to use `useTheme()` hook
- [x] 6.14 Migrate `CustomInput.tsx` to use `useTheme()` hook
- [x] 6.15 Migrate `AnimatedGradient.tsx` to use `useTheme()` hook (N/A - uses own gradient generation)

## 7. Gradient Adaptation

- [x] 7.1 Update `src/tui/utils/gradientText.ts` to accept theme parameter
- [x] 7.2 Define dark-mode gradient colors (lighter for dark backgrounds)
- [x] 7.3 Define light-mode gradient colors (darker for light backgrounds)
- [x] 7.4 Update Header component to use theme-aware gradient

## 8. App Integration

- [x] 8.1 Wrap App component in `ThemeProvider` in `bin/tui-app.tsx`
- [x] 8.2 Pass initial theme from config to ThemeProvider
- [x] 8.3 Add `Ctrl+T Theme` to Footer keybindings display

## 9. Testing & Documentation

- [ ] 9.1 Add unit tests for `detectSystemTheme()` function
- [ ] 9.2 Add unit tests for theme loader and validation
- [ ] 9.3 Add unit tests for theme merging logic
- [ ] 9.4 Update README.md with theme configuration documentation
- [ ] 9.5 Document custom theme file format in README

## 10. Validation

- [x] 10.1 Run `npm run lint` and fix any issues
- [x] 10.2 Run `npm run build` and verify compilation
- [x] 10.3 Run `npm test` and verify all tests pass
- [ ] 10.4 Manual testing: verify Ctrl+T cycles themes correctly
- [ ] 10.5 Manual testing: verify custom theme loading works
