# Change: Migrate TUI rendering layer from ink to OpenTUI

## Why

The current ink-based TUI has accumulated extensive workarounds for framework limitations: a custom `visualWidth.ts` module (8+ functions) to compensate for Yoga's CJK character-counting issues, two duplicate custom text input components built from scratch to replace ink-text-input's buggy behavior, scattered text wrapping logic, and stale closure prevention with manual ref management. OpenTUI provides native Zig-based rendering with proper CJK/Unicode support, built-in text input/textarea/select/markdown components, better performance, and mouse support — eliminating most of these workarounds while improving user experience.

## What Changes

- Add renderer toggle via `AUQ_RENDERER=opentui` environment variable and `renderer` field in `.auqrc.json` config (envvar overrides config; default remains `ink`)
- Create parallel directory `src/tui-opentui/` with OpenTUI React component implementations mirroring `src/tui/` structure
- Extract framework-agnostic code (themes, types, utils, notifications, i18n) to `src/tui/shared/` imported by both ink and OpenTUI versions
- Replace custom text input components with OpenTUI native `<input>` and `<textarea>` components
- Replace ink-markdown-es with OpenTUI native `<markdown>` component for prompt and changelog rendering
- Rebuild custom multi-select component on OpenTUI primitives (`<box>`, `<text>`, `useKeyboard()`) since OpenTUI's `<select>` is single-select only
- Drop gradient text in header — replace with solid accent color from theme
- Migrate all 15+ themes with auto-generated SyntaxStyle from existing color tokens
- Add `tsconfig.opentui.json` with `jsx: "react-jsx"` and `jsxImportSource: "@opentui/react"` for OpenTUI files
- Add new dependencies: `@opentui/core` and `@opentui/react` (pinned to exact version)
- Implement fallback to ink if OpenTUI fails to initialize, with warning logged to stderr
- Add OpenTUI configuration: `useAlternateScreen: true`, `useMouse: true`, `useKittyKeyboard: {}`, `useConsole: false` (debug envvar to enable)
- **BREAKING**: TUI tests switch from `ink-testing-library` to `bun:test` with `@opentui/core/testing` utilities (`testRender`, `mockInput`, `captureCharFrame`)

## Impact

- Affected specs: tui-application, cli-interface
- Affected code:
  - `bin/tui-app.tsx` (entry point conditional branching based on `AUQ_RENDERER`)
  - `src/tui-opentui/` (NEW — all OpenTUI component implementations)
  - `src/tui/shared/` (NEW — extracted framework-agnostic shared utilities)
  - `src/tui/` (existing — refactoring to extract shared code)
  - `package.json` (new dependencies: `@opentui/core`, `@opentui/react`)
  - `tsconfig.opentui.json` (NEW — TypeScript config for OpenTUI files)
  - `src/config/` (add `renderer` config field with schema validation)
