## [3.0.0](https://github.com/paulp-o/ask-user-questions-mcp/compare/v2.7.2...v3.0.0) (2026-03-11)

### ⚠ BREAKING CHANGES

* remove silent ink fallback — require explicit flag for ink renderer

### Bug Fixes

* remove silent ink fallback — require explicit flag for ink renderer ([6c58c41](https://github.com/paulp-o/ask-user-questions-mcp/commit/6c58c41b5ab035ca155ae841e52c88200b4e401a))

## [2.7.2](https://github.com/paulp-o/ask-user-questions-mcp/compare/v2.7.1...v2.7.2) (2026-03-11)

### Bug Fixes

* include opentui in build pipeline so default renderer actually works ([1be8280](https://github.com/paulp-o/ask-user-questions-mcp/commit/1be8280b035ff99fde4a116fc9a5e5cefe200a07))

## [2.7.1](https://github.com/paulp-o/ask-user-questions-mcp/compare/v2.7.0...v2.7.1) (2026-03-11)

### Bug Fixes

* default renderer to opentui in config defaults and schema ([0d4bf88](https://github.com/paulp-o/ask-user-questions-mcp/commit/0d4bf88ff3fa0712afd6240c45f804daa36480a4))
* update renderer default tests to opentui, gitignore .auqrc.json ([3614c30](https://github.com/paulp-o/ask-user-questions-mcp/commit/3614c30c322d6127b7745eae092358611b046156))

## [2.7.0](https://github.com/paulp-o/ask-user-questions-mcp/compare/v2.6.4...v2.7.0) (2026-03-11)

### Features

* add non-blocking question mode, get_answered_questions tool, fetch-answers and history CLI commands ([8447983](https://github.com/paulp-o/ask-user-questions-mcp/commit/844798386b0fb1bf461b0a8a86ff6511c6fa2214))
* **spec: migrate-tui-to-opentui:** default renderer to opentui, fix plugin build TS2742 ([ffe2d02](https://github.com/paulp-o/ask-user-questions-mcp/commit/ffe2d0219cda58bb085e07f653b3aa7aa65fffdd))
* **spec: migrate-tui-to-opentui:** wip add OpenSpec change for ink-to-OpenTUI TUI migration ([11a878c](https://github.com/paulp-o/ask-user-questions-mcp/commit/11a878c32a4d55bbfc56782c81041af6fa886173))
* update themes and UI components for improved styling and accessibility ([f93155f](https://github.com/paulp-o/ask-user-questions-mcp/commit/f93155f70991ca84d69ee30ee7ff2692738e9918))

### Bug Fixes

* OpenTUI renderer bug fixes and CLI improvements ([032128d](https://github.com/paulp-o/ask-user-questions-mcp/commit/032128db82ef6eaf8d35aafde7d41794c093c058))
* option row background color fills full terminal width ([aec252c](https://github.com/paulp-o/ask-user-questions-mcp/commit/aec252ceece7949c2ca15c353fa4d84e1f075f24))
* SessionDots and SessionPicker horizontal layout (flexDirection row) ([24ca0b5](https://github.com/paulp-o/ask-user-questions-mcp/commit/24ca0b5a2e8960147f0e659b4917d60e151a2649))
* SessionPicker page navigation, option row full-width bg via box, Ctrl+C exit ([e9c8d98](https://github.com/paulp-o/ask-user-questions-mcp/commit/e9c8d98598546b8c70191825bfde6b4d46b6eff4))
* **spec: migrate-tui-to-opentui:** wip fix custom input erasure, submission validation, simplify placeholders, remove hover effects ([e6f4ecf](https://github.com/paulp-o/ask-user-questions-mcp/commit/e6f4ecf96af7941d6bb9e9d213e544b8c2b742dc))

# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- OpenTUI renderer as opt-in alternative to ink (`AUQ_RENDERER=opentui`)
- `renderer` configuration option in `.auqrc.json`
- `auq config set renderer opentui` CLI command
- Mouse support (click options, scroll overlays, click session dots) with OpenTUI
- Native markdown rendering with Tree-Sitter syntax highlighting in OpenTUI
- SyntaxStyle auto-generation from theme color tokens

### Changed

- Theme definitions extracted to `src/tui/shared/themes/` for renderer-agnostic access
- Utility functions extracted to `src/tui/shared/utils/` for cross-renderer use
- Session watcher event interface extracted for adapter pattern
- Header uses solid accent color instead of gradient in OpenTUI renderer

## [2.6.4](https://github.com/paulp-o/ask-user-questions-mcp/compare/v2.6.3...v2.6.4) (2026-03-10)

### Bug Fixes

- move agent hint back to stderr write before Ink render to guarantee output ([322d077](https://github.com/paulp-o/ask-user-questions-mcp/commit/322d077d9d514b15855d3e0214ec30e44b91d8c9))

## [2.6.3](https://github.com/paulp-o/ask-user-questions-mcp/compare/v2.6.2...v2.6.3) (2026-03-10)

### Bug Fixes

- invalidate stale update cache when current version exceeds cached latest ([a529d3d](https://github.com/paulp-o/ask-user-questions-mcp/commit/a529d3d29fa0a9276c797103dc5d21089c27f879))

## [2.6.2](https://github.com/paulp-o/ask-user-questions-mcp/compare/v2.6.1...v2.6.2) (2026-03-10)

### Bug Fixes

- make AI agent hint message 1-tick invisible using Ink rendering engine ([98055bb](https://github.com/paulp-o/ask-user-questions-mcp/commit/98055bbb5d9762fa948c3dc20acdeab08acdf96a))

## [2.6.1](https://github.com/paulp-o/ask-user-questions-mcp/compare/v2.6.0...v2.6.1) (2026-03-10)

### Bug Fixes

- auto-show update overlay for minor/major updates and auto-install patches on TUI startup ([37a6988](https://github.com/paulp-o/ask-user-questions-mcp/commit/37a698899ff0f980159e85c20d1a4b06ca9715ae))

## [2.6.0](https://github.com/paulp-o/ask-user-questions-mcp/compare/v2.5.0...v2.6.0) (2026-03-10)

### Features

- add sessions show command, AI agent hint, and fix pending session crash ([689667a](https://github.com/paulp-o/ask-user-questions-mcp/commit/689667a4f35c2cddbee348e5e0574b19b2c766f8))

## [2.5.0](https://github.com/paulp-o/ask-user-questions-mcp/compare/v2.4.0...v2.5.0) (2026-03-10)

### Features

- add auto-update system with CLI command, TUI overlay, and background checker ([1aef4f1](https://github.com/paulp-o/ask-user-questions-mcp/commit/1aef4f1ca3ad7d53155088073041401b09cb0370))

## [2.3.0](https://github.com/paulp-o/ask-user-questions-mcp/compare/v2.2.2...v2.3.0) (2026-03-09)

### Features

- improve keyboard shortcuts, centralize keybindings, and enhance CLI help ([e3e92ee](https://github.com/paulp-o/ask-user-questions-mcp/commit/e3e92ee9318f4c130975e44877872d64834937d3))

## [2.3.0](https://github.com/paulp-o/ask-user-questions-mcp/compare/v2.2.2...v2.3.0) (2026-03-10)

### Features

- Centralized keybinding constants system (`src/tui/constants/keybindings.ts`) for maintainability
- Comprehensive `auq --help` output with keyboard shortcuts, configuration options, and environment variables
- 33 new keyboard handling tests across 5 test files (ConfirmationDialog, ReviewScreen, WaitingScreen, StepperView, Footer)

### Bug Fixes

- Session switching shortcuts changed from `Ctrl+[`/`Ctrl+]` to `[`/`]` (fixes `Ctrl+[` sending terminal escape sequence)
- Session switching keys now properly gated by focus context (won't fire during text input)
- Fixed misleading i18n hint: "Press Tab to enter custom answer" → "Tab to submit" (en) / "Tab으로 제출" (ko)
- Standardized letter shortcuts to be case-insensitive: `n`/`N` in ReviewScreen, `q`/`Q` in WaitingScreen
- ConfirmationDialog arrow keys changed from wrap-around to clamping (consistent with SessionPicker)
- Footer keybinding labels now use centralized constants and accurately reflect `]/[` session switch keys

## [2.2.2](https://github.com/paulp-o/ask-user-questions-mcp/compare/v2.2.1...v2.2.2) (2026-02-19)

### Bug Fixes

- prevent shortcut keys from firing in text input and reset cursor on question switch ([10fd4b8](https://github.com/paulp-o/ask-user-questions-mcp/commit/10fd4b8702ace87517b531d918d525cb4ce23598))

## [2.2.1](https://github.com/paulp-o/ask-user-questions-mcp/compare/v2.2.0...v2.2.1) (2026-02-19)

### Bug Fixes

- resolve timer flicker and arrow key navigation bugs in StepperView ([5f5001e](https://github.com/paulp-o/ask-user-questions-mcp/commit/5f5001e50026f995602523e544794963de104bf0))

## [2.2.0](https://github.com/paulp-o/ask-user-questions-mcp/compare/v2.1.1...v2.2.0) (2026-02-19)

### Features

- add queued session switching with state preservation ([40fb49d](https://github.com/paulp-o/ask-user-questions-mcp/commit/40fb49d80a6ebcf11401afb2d9b822e01857be9d))

## [2.1.1](https://github.com/paulp-o/ask-user-questions-mcp/compare/v2.1.0...v2.1.1) (2026-02-18)

### Bug Fixes

- prevent auto-scroll on terminal overflow and show full description on focused option ([2f857f8](https://github.com/paulp-o/ask-user-questions-mcp/commit/2f857f818725b61121d262b140d0bd36885ea5fc))

## [2.1.0](https://github.com/paulp-o/ask-user-questions-mcp/compare/v2.0.1...v2.1.0) (2026-02-18)

### Features

- add markdown rendering to question prompts ([1471844](https://github.com/paulp-o/ask-user-questions-mcp/commit/1471844f24755603635daf329468a7f4d2c4baea))
- implement markdown rendering with ink-markdown-es, add tests, archive spec ([eacbc30](https://github.com/paulp-o/ask-user-questions-mcp/commit/eacbc30555e1939d4b25632df86cc21e0d94e711))

## [2.0.1](https://github.com/paulp-o/ask-user-questions-mcp/compare/v2.0.0...v2.0.1) (2026-02-06)

### Bug Fixes

- configure semantic-release to use maintainer identity ([25d9fb9](https://github.com/paulp-o/ask-user-questions-mcp/commit/25d9fb9428e10f7eed7eb11e256770b0d417d5a5))

## [2.0.0](https://github.com/paulp-o/ask-user-questions-mcp/compare/v1.6.0...v2.0.0) (2026-02-06)

### ⚠ BREAKING CHANGES

- Major release with significant UI/UX improvements

* Complete terminal UI redesign with new stepper-based flow
* Added elaboration input for user guidance
* Internationalization support (English/Korean)
* Theme system with multiple built-in themes
* Configuration system with JSON support
* OS-native notifications
* Improved keyboard navigation and accessibility
* Better release notes configuration with conventionalcommits preset

### Features

- Add AUQ Configuration System with JSON support ([2b4a603](https://github.com/paulp-o/ask-user-questions-mcp/commit/2b4a603f0abeab5cd655788e5265bbbddfafc19c))
- Add elaboration input box for custom user guidance in questions ([943dc47](https://github.com/paulp-o/ask-user-questions-mcp/commit/943dc4789adc2b8a78e5f15f8c3de35b0c151190))
- Add elaboration input box for custom user guidance in questions ([a8d0782](https://github.com/paulp-o/ask-user-questions-mcp/commit/a8d0782c25b613f3e448387694720313e28ae2f6))
- Add Spinner component and integrate it into WaitingScreen for loading indication ([ee109ae](https://github.com/paulp-o/ask-user-questions-mcp/commit/ee109ae054ebe2b6b41912d9fe0ed523deebb638))
- Add submitting state handling and spinner animation in footer and review components ([3023af8](https://github.com/paulp-o/ask-user-questions-mcp/commit/3023af81f77984e115c9a140a2ddc34b321c8fe8))
- add terminal notification batching and detection ([5136779](https://github.com/paulp-o/ask-user-questions-mcp/commit/5136779ba8d5461e113fd1e5e6f802786b4313d5))
- add theme management system with multiple built-in themes ([290b6d1](https://github.com/paulp-o/ask-user-questions-mcp/commit/290b6d19242ac4dbccc60269f183617752a07a86))
- add working directory support to question handling and UI components ([11c3ceb](https://github.com/paulp-o/ask-user-questions-mcp/commit/11c3ceb27a24a510dc33fa1738f8cff262884938))
- **ask-user-questions:** add skills support - interactive user question tool and validation scripts ([32cb480](https://github.com/paulp-o/ask-user-questions-mcp/commit/32cb48087aeb769450937a1e2fc8b411d25a6ca8))
- Bump version to 2.0.0 and update documentation for enhanced user guidance and elaboration features ([d0e6ec7](https://github.com/paulp-o/ask-user-questions-mcp/commit/d0e6ec79d6ecad98c6574e1739a580b5ed9df331))
- Complete UI Redesign! ([d7b356d](https://github.com/paulp-o/ask-user-questions-mcp/commit/d7b356da272b6877097abfb44ad09ab4e315fd41))
- Enhance ask-user-questions skill with interactive TUI and improved user prompts ([79c90a1](https://github.com/paulp-o/ask-user-questions-mcp/commit/79c90a1d3a4fcd8f3b009542a313c5873fc6a7bd))
- Enhance ResponseFormatter to support multiple answers and elaborate requests in formatting ([2ec6b39](https://github.com/paulp-o/ask-user-questions-mcp/commit/2ec6b39eb742684885b59559da9ec0d3ff4b79b8))
- Enhance TabBar component with improved answer tracking and display ([01c4301](https://github.com/paulp-o/ask-user-questions-mcp/commit/01c4301b3925ae10fd26ac575cda0d831c1953f7))
- Enhance user feedback and option selection handling in components ([e77db2d](https://github.com/paulp-o/ask-user-questions-mcp/commit/e77db2d85dbe6fe7cf572bedf1c647ea2ff73b0c))
- Enhance visual styling and theme consistency ([75c7453](https://github.com/paulp-o/ask-user-questions-mcp/commit/75c7453bc2dbe41297008a241fbdf94f3a17116d))
- Fix text input and CJK rendering issues ([9af2de4](https://github.com/paulp-o/ask-user-questions-mcp/commit/9af2de4a064d3f7002cf880fa112a4aa1416ea64))
- **i18n:** Implement internationalization support with English and Korean translations ([c9882b1](https://github.com/paulp-o/ask-user-questions-mcp/commit/c9882b18e254d9f706fd4ed843533129668af432))
- Implement elaborate input functionality with localization and context updates ([7f6b07a](https://github.com/paulp-o/ask-user-questions-mcp/commit/7f6b07a11413299eb64aeaf5475caef5dc8bbc1c))
- Implement elaborate option for questions and remove inline input ([fccb14c](https://github.com/paulp-o/ask-user-questions-mcp/commit/fccb14c720eaaaca9620c43371635fd7577652b9))
- implement native OS notifications and remove OSC notification support ([24493d7](https://github.com/paulp-o/ask-user-questions-mcp/commit/24493d74dda35b25b0d1c529d7289102bbf031d2))
- Migrate project from npm to Bun as primary package manager ([a839949](https://github.com/paulp-o/ask-user-questions-mcp/commit/a8399498b7284f5fe5fe3e8ef68eba2749b2b70f))
- Reintroduce OpenSpec command files for apply, archive, and proposal processes ([c6ecc58](https://github.com/paulp-o/ask-user-questions-mcp/commit/c6ecc5894f88bc495d4ab5a7ab85ae45fc42cc71))
- Replace OSC notifications with OS-native notifications ([57e7c9b](https://github.com/paulp-o/ask-user-questions-mcp/commit/57e7c9baca8908a81758b798fdad204c7b42dc2a))
- **spec: add-auq-configuration:** complete configuration system with i18n and theme contrast improvements ([67fd273](https://github.com/paulp-o/ask-user-questions-mcp/commit/67fd2732e3251d08e30fb5a5f9edfa28ca66d7b7))
- Update configuration limits and enhance documentation for AUQ settings ([d54592c](https://github.com/paulp-o/ask-user-questions-mcp/commit/d54592c2aeb97decb6cd4ca2c76b8bcfb1ed4ee3))
- Update keyboard shortcuts and improve footer interactions for enhanced user experience ([a9930d3](https://github.com/paulp-o/ask-user-questions-mcp/commit/a9930d3cd5b0e9c078ffbf1b90f872b5ebd89e40))
- update theme color values for improved readability and consistency ([9a728b6](https://github.com/paulp-o/ask-user-questions-mcp/commit/9a728b6f5f2b79b060164e98ebe9a9fc0ebb311b))
- v2.0.0 - Complete UI redesign with enhanced UX ([4112120](https://github.com/paulp-o/ask-user-questions-mcp/commit/4112120fc869c6de1d5e865a9474f2bee9dbaf32))

### Bug Fixes

- Improve SingleLineTextInput to avoid stale closures and missed keystrokes ([8018d3e](https://github.com/paulp-o/ask-user-questions-mcp/commit/8018d3ecf2229e278bb434072c384ba99f65810d))
- Update navigation logic in StepperView to skip custom-input mode to prevent double skipping on tab key press ([3e84055](https://github.com/paulp-o/ask-user-questions-mcp/commit/3e8405595d3548019667200c786a89047bc988df))

## [2.0.0](https://github.com/paulp-o/ask-user-questions-mcp/compare/v1.7.0...v2.0.0) (2026-02-06)

### ⚠ BREAKING CHANGES

- Major release with significant UI/UX improvements

* Complete terminal UI redesign with new stepper-based flow
* Added elaboration input for user guidance
* Internationalization support (English/Korean)
* Theme system with multiple built-in themes
* Configuration system with JSON support
* OS-native notifications
* Improved keyboard navigation and accessibility
* Better release notes configuration with conventionalcommits preset

### Features

- v2.0.0 - Complete UI redesign with enhanced UX ([4112120](https://github.com/paulp-o/ask-user-questions-mcp/commit/4112120fc869c6de1d5e865a9474f2bee9dbaf32))
