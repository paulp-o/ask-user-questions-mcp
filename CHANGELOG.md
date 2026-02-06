## [2.0.0](https://github.com/paulp-o/ask-user-questions-mcp/compare/v1.7.0...v2.0.0) (2026-02-06)

### ⚠ BREAKING CHANGES

* Major release with significant UI/UX improvements

- Complete terminal UI redesign with new stepper-based flow
- Added elaboration input for user guidance
- Internationalization support (English/Korean)
- Theme system with multiple built-in themes
- Configuration system with JSON support
- OS-native notifications
- Improved keyboard navigation and accessibility
- Better release notes configuration with conventionalcommits preset

### Features

* v2.0.0 - Complete UI redesign with enhanced UX ([4112120](https://github.com/paulp-o/ask-user-questions-mcp/commit/4112120fc869c6de1d5e865a9474f2bee9dbaf32))

# Changelog

## [Unreleased]

### Changed

- Session directory now always uses global XDG-compliant paths
- Sessions are now stored in one predictable location per platform

### Removed

- `detectInstallMode()` function and local `.auq/sessions` support

### Migration

- Existing local `.auq/` directories can be safely deleted
