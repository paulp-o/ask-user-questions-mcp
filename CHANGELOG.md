## [2.2.1](https://github.com/paulp-o/ask-user-questions-mcp/compare/v2.2.0...v2.2.1) (2026-02-19)

### Bug Fixes

* resolve timer flicker and arrow key navigation bugs in StepperView ([5f5001e](https://github.com/paulp-o/ask-user-questions-mcp/commit/5f5001e50026f995602523e544794963de104bf0))

## [2.2.0](https://github.com/paulp-o/ask-user-questions-mcp/compare/v2.1.1...v2.2.0) (2026-02-19)

### Features

* add queued session switching with state preservation ([40fb49d](https://github.com/paulp-o/ask-user-questions-mcp/commit/40fb49d80a6ebcf11401afb2d9b822e01857be9d))

## [2.1.1](https://github.com/paulp-o/ask-user-questions-mcp/compare/v2.1.0...v2.1.1) (2026-02-18)

### Bug Fixes

* prevent auto-scroll on terminal overflow and show full description on focused option ([2f857f8](https://github.com/paulp-o/ask-user-questions-mcp/commit/2f857f818725b61121d262b140d0bd36885ea5fc))

## [2.1.0](https://github.com/paulp-o/ask-user-questions-mcp/compare/v2.0.1...v2.1.0) (2026-02-18)

### Features

* add markdown rendering to question prompts ([1471844](https://github.com/paulp-o/ask-user-questions-mcp/commit/1471844f24755603635daf329468a7f4d2c4baea))
* implement markdown rendering with ink-markdown-es, add tests, archive spec ([eacbc30](https://github.com/paulp-o/ask-user-questions-mcp/commit/eacbc30555e1939d4b25632df86cc21e0d94e711))

## [2.0.1](https://github.com/paulp-o/ask-user-questions-mcp/compare/v2.0.0...v2.0.1) (2026-02-06)

### Bug Fixes

* configure semantic-release to use maintainer identity ([25d9fb9](https://github.com/paulp-o/ask-user-questions-mcp/commit/25d9fb9428e10f7eed7eb11e256770b0d417d5a5))

## [2.0.0](https://github.com/paulp-o/ask-user-questions-mcp/compare/v1.6.0...v2.0.0) (2026-02-06)

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

* Add AUQ Configuration System with JSON support ([2b4a603](https://github.com/paulp-o/ask-user-questions-mcp/commit/2b4a603f0abeab5cd655788e5265bbbddfafc19c))
* Add elaboration input box for custom user guidance in questions ([943dc47](https://github.com/paulp-o/ask-user-questions-mcp/commit/943dc4789adc2b8a78e5f15f8c3de35b0c151190))
* Add elaboration input box for custom user guidance in questions ([a8d0782](https://github.com/paulp-o/ask-user-questions-mcp/commit/a8d0782c25b613f3e448387694720313e28ae2f6))
* Add Spinner component and integrate it into WaitingScreen for loading indication ([ee109ae](https://github.com/paulp-o/ask-user-questions-mcp/commit/ee109ae054ebe2b6b41912d9fe0ed523deebb638))
* Add submitting state handling and spinner animation in footer and review components ([3023af8](https://github.com/paulp-o/ask-user-questions-mcp/commit/3023af81f77984e115c9a140a2ddc34b321c8fe8))
* add terminal notification batching and detection ([5136779](https://github.com/paulp-o/ask-user-questions-mcp/commit/5136779ba8d5461e113fd1e5e6f802786b4313d5))
* add theme management system with multiple built-in themes ([290b6d1](https://github.com/paulp-o/ask-user-questions-mcp/commit/290b6d19242ac4dbccc60269f183617752a07a86))
* add working directory support to question handling and UI components ([11c3ceb](https://github.com/paulp-o/ask-user-questions-mcp/commit/11c3ceb27a24a510dc33fa1738f8cff262884938))
* **ask-user-questions:** add skills support - interactive user question tool and validation scripts ([32cb480](https://github.com/paulp-o/ask-user-questions-mcp/commit/32cb48087aeb769450937a1e2fc8b411d25a6ca8))
* Bump version to 2.0.0 and update documentation for enhanced user guidance and elaboration features ([d0e6ec7](https://github.com/paulp-o/ask-user-questions-mcp/commit/d0e6ec79d6ecad98c6574e1739a580b5ed9df331))
* Complete UI Redesign! ([d7b356d](https://github.com/paulp-o/ask-user-questions-mcp/commit/d7b356da272b6877097abfb44ad09ab4e315fd41))
* Enhance ask-user-questions skill with interactive TUI and improved user prompts ([79c90a1](https://github.com/paulp-o/ask-user-questions-mcp/commit/79c90a1d3a4fcd8f3b009542a313c5873fc6a7bd))
* Enhance ResponseFormatter to support multiple answers and elaborate requests in formatting ([2ec6b39](https://github.com/paulp-o/ask-user-questions-mcp/commit/2ec6b39eb742684885b59559da9ec0d3ff4b79b8))
* Enhance TabBar component with improved answer tracking and display ([01c4301](https://github.com/paulp-o/ask-user-questions-mcp/commit/01c4301b3925ae10fd26ac575cda0d831c1953f7))
* Enhance user feedback and option selection handling in components ([e77db2d](https://github.com/paulp-o/ask-user-questions-mcp/commit/e77db2d85dbe6fe7cf572bedf1c647ea2ff73b0c))
* Enhance visual styling and theme consistency ([75c7453](https://github.com/paulp-o/ask-user-questions-mcp/commit/75c7453bc2dbe41297008a241fbdf94f3a17116d))
* Fix text input and CJK rendering issues ([9af2de4](https://github.com/paulp-o/ask-user-questions-mcp/commit/9af2de4a064d3f7002cf880fa112a4aa1416ea64))
* **i18n:** Implement internationalization support with English and Korean translations ([c9882b1](https://github.com/paulp-o/ask-user-questions-mcp/commit/c9882b18e254d9f706fd4ed843533129668af432))
* Implement elaborate input functionality with localization and context updates ([7f6b07a](https://github.com/paulp-o/ask-user-questions-mcp/commit/7f6b07a11413299eb64aeaf5475caef5dc8bbc1c))
* Implement elaborate option for questions and remove inline input ([fccb14c](https://github.com/paulp-o/ask-user-questions-mcp/commit/fccb14c720eaaaca9620c43371635fd7577652b9))
* implement native OS notifications and remove OSC notification support ([24493d7](https://github.com/paulp-o/ask-user-questions-mcp/commit/24493d74dda35b25b0d1c529d7289102bbf031d2))
* Migrate project from npm to Bun as primary package manager ([a839949](https://github.com/paulp-o/ask-user-questions-mcp/commit/a8399498b7284f5fe5fe3e8ef68eba2749b2b70f))
* Reintroduce OpenSpec command files for apply, archive, and proposal processes ([c6ecc58](https://github.com/paulp-o/ask-user-questions-mcp/commit/c6ecc5894f88bc495d4ab5a7ab85ae45fc42cc71))
* Replace OSC notifications with OS-native notifications ([57e7c9b](https://github.com/paulp-o/ask-user-questions-mcp/commit/57e7c9baca8908a81758b798fdad204c7b42dc2a))
* **spec: add-auq-configuration:** complete configuration system with i18n and theme contrast improvements ([67fd273](https://github.com/paulp-o/ask-user-questions-mcp/commit/67fd2732e3251d08e30fb5a5f9edfa28ca66d7b7))
* Update configuration limits and enhance documentation for AUQ settings ([d54592c](https://github.com/paulp-o/ask-user-questions-mcp/commit/d54592c2aeb97decb6cd4ca2c76b8bcfb1ed4ee3))
* Update keyboard shortcuts and improve footer interactions for enhanced user experience ([a9930d3](https://github.com/paulp-o/ask-user-questions-mcp/commit/a9930d3cd5b0e9c078ffbf1b90f872b5ebd89e40))
* update theme color values for improved readability and consistency ([9a728b6](https://github.com/paulp-o/ask-user-questions-mcp/commit/9a728b6f5f2b79b060164e98ebe9a9fc0ebb311b))
* v2.0.0 - Complete UI redesign with enhanced UX ([4112120](https://github.com/paulp-o/ask-user-questions-mcp/commit/4112120fc869c6de1d5e865a9474f2bee9dbaf32))

### Bug Fixes

* Improve SingleLineTextInput to avoid stale closures and missed keystrokes ([8018d3e](https://github.com/paulp-o/ask-user-questions-mcp/commit/8018d3ecf2229e278bb434072c384ba99f65810d))
* Update navigation logic in StepperView to skip custom-input mode to prevent double skipping on tab key press ([3e84055](https://github.com/paulp-o/ask-user-questions-mcp/commit/3e8405595d3548019667200c786a89047bc988df))

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
