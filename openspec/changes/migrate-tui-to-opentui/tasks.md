# Tasks: Migrate TUI from Ink to OpenTUI

## 1. Project Setup & Configuration

- [x] 1.1 Add @opentui/core and @opentui/react dependencies to package.json (pin exact version 0.1.87)
- [x] 1.2 Create tsconfig.opentui.json with jsx: "react-jsx" and jsxImportSource: "@opentui/react"
- [x] 1.3 Create src/tui-opentui/ directory structure mirroring src/tui/ layout
- [x] 1.4 Update package.json build scripts to compile OpenTUI files separately
- [x] 1.5 Add AUQ_RENDERER environment variable support to config types (src/config/types.ts)
- [x] 1.6 Add renderer field to .auqrc.json config schema using Zod (src/shared/schemas.ts)
- [x] 1.7 Update ConfigLoader to recognize and validate renderer config value
- [x] 1.8 Add default renderer value ("ink") to config defaults

## 2. Shared Logic Extraction

- [x] 2.1 Create src/tui/shared/ directory for framework-agnostic code
- [x] 2.2 Move theme definitions from src/tui/themes/ to src/tui/shared/themes/
- [x] 2.3 Update all import paths in existing ink components to reference shared/themes/
- [x] 2.4 Move framework-agnostic types to src/tui/shared/types.ts:
  - Answer type
  - SessionUIState type
  - FocusContext type
  - Question data structures
- [x] 2.5 Move utility functions to src/tui/shared/utils/:
  - staleDetection.ts
  - sessionSwitching.ts
  - relativeTime.ts
  - recommended.ts
  - config.ts
  - detectTheme.ts
- [x] 2.6 Update imports in ink components to reference shared/utils/ paths
- [x] 2.7 Verify notifications/ module remains importable by both ink and OpenTUI versions
- [x] 2.8 Verify i18n/ module remains importable by both ink and OpenTUI versions
- [x] 2.9 Extract session watcher event emitter interface to src/tui/shared/session-events.ts
- [x] 2.10 Create shared SessionWatcher type definitions
- [x] 2.11 Verify ink version still compiles and works after extraction
- [x] 2.12 Run existing ink tests to confirm no regressions

## 3. Entry Point & Renderer Toggle

- [x] 3.1 Modify bin/tui-app.tsx to check AUQ_RENDERER environment variable
- [x] 3.2 Add conditional dynamic import logic for OpenTUI vs ink app modules
- [x] 3.3 Implement fallback mechanism: try OpenTUI, catch error, fall back to ink with stderr warning
- [x] 3.4 Add renderer config field reading to ConfigLoader initialization
- [x] 3.5 Add renderer option validation to Zod schema in src/shared/schemas.ts
- [x] 3.6 Add renderer config documentation to config loader
- [ ] 3.7 Test entry point with AUQ_RENDERER=ink (should use existing ink version)
- [ ] 3.8 Test entry point with AUQ_RENDERER=opentui (should attempt OpenTUI)
- [ ] 3.9 Test fallback when OpenTUI fails to load

## 4. OpenTUI App Shell

- [x] 4.1 Create src/tui-opentui/app.tsx with createCliRenderer() initialization
- [x] 4.2 Configure renderer options: exitOnCtrlC: false, useMouse: true, autoFocus: false
- [x] 4.3 Configure renderer options: useAlternateScreen: true, useKittyKeyboard: {}
- [x] 4.4 Configure renderer options: useConsole: process.env.AUQ_DEBUG === '1', targetFps: 60
- [x] 4.5 Create App root component with ConfigProvider wrapper
- [x] 4.6 Create ThemeProvider wrapper in app shell
- [x] 4.7 Implement app exit/cleanup via renderer.destroy() on unmount
- [x] 4.8 Create src/tui-opentui/ThemeProvider.tsx with React Context for theme state
- [x] 4.9 Create src/tui-opentui/ConfigContext.tsx for app configuration access
- [x] 4.10 Implement useTerminalDimensions() hook using OpenTUI's terminal size API
- [x] 4.11 Add error boundary for OpenTUI renderer errors
- [x] 4.12 Test app shell renders without errors

## 5. Theme System Migration

- [x] 5.1 Create src/tui-opentui/utils/syntaxStyle.ts utility file
- [x] 5.2 Implement function to generate SyntaxStyle from theme color tokens
- [x] 5.3 Map theme token 'keyword' to SyntaxStyle.keyword property
- [x] 5.4 Map theme token 'string' to SyntaxStyle.string property
- [x] 5.5 Map theme token 'comment' to SyntaxStyle.comment property
- [x] 5.6 Map theme token 'number' to SyntaxStyle.number property
- [x] 5.7 Map theme token 'markup.heading' to SyntaxStyle.markup.heading property
- [x] 5.8 Map all remaining theme color tokens to SyntaxStyle properties
- [x] 5.9 Create ThemeContext providing both theme colors AND generated SyntaxStyle
- [x] 5.10 Implement useTheme() hook returning combined theme + SyntaxStyle
- [x] 5.11 Implement Ctrl+T theme cycling using useKeyboard hook
- [x] 5.12 Import and reuse system theme detection from shared/utils/detectTheme.ts
- [x] 5.13 Implement theme persistence to config file on theme change
- [ ] 5.14 Test all 15+ built-in themes render correctly with SyntaxStyle
- [ ] 5.15 Test custom theme loading and SyntaxStyle generation
- [ ] 5.16 Verify theme switching works without app restart

## 6. Core Layout Components

- [x] 6.1 Create src/tui-opentui/components/Header.tsx
- [x] 6.2 Implement Header with solid accent color text (no gradient animation)
- [x] 6.3 Display version number in Header
- [x] 6.4 Display update badge in Header when update available
- [x] 6.5 Display queue count in Header
- [x] 6.6 Create src/tui-opentui/components/Footer.tsx
- [x] 6.7 Implement context-aware keybinding hints in Footer using <box>/<text>
- [x] 6.8 Create src/tui-opentui/components/TabBar.tsx
- [x] 6.9 Implement question progress tabs using <box>/<text> components
- [x] 6.10 Add useTerminalDimensions hook for responsive tab width calculation
- [x] 6.11 Create src/tui-opentui/components/SessionDots.tsx
- [x] 6.12 Implement compact session indicators using <text> component
- [x] 6.13 Add stale/abandoned visual indicators to SessionDots
- [x] 6.14 Create src/tui-opentui/components/ThemeIndicator.tsx
- [x] 6.15 Display current theme name in ThemeIndicator
- [x] 6.16 Test all layout components render correctly

## 7. Question Flow Components

- [x] 7.1 Create src/tui-opentui/components/StepperView.tsx (main orchestrator)
- [x] 7.2 Implement question navigation state management in StepperView
- [x] 7.3 Implement answer state storage using Map in StepperView
- [x] 7.4 Implement review toggle functionality in StepperView
- [x] 7.5 Implement rejection flow handling in StepperView
- [x] 7.6 Implement elaborate marks tracking in StepperView
- [x] 7.7 Implement keyboard navigation using useKeyboard hook in StepperView
- [x] 7.8 Handle abandoned session confirmation flow in StepperView
- [x] 7.9 Create src/tui-opentui/components/QuestionDisplay.tsx
- [x] 7.10 Render TabBar + MarkdownPrompt + OptionsList + Footer in QuestionDisplay
- [x] 7.11 Create src/tui-opentui/components/MarkdownPrompt.tsx
- [x] 7.12 Use native <markdown> component with theme-derived SyntaxStyle
- [x] 7.13 Configure markdown component for inline and block rendering modes
- [x] 7.14 Create src/tui-opentui/components/OptionsList.tsx
- [x] 7.15 Implement arrow key navigation (↑/↓) using useKeyboard
- [x] 7.16 Implement single-select with Enter key in OptionsList
- [x] 7.17 Implement multi-select with Space toggle in OptionsList
- [x] 7.18 Implement recommended option highlighting in OptionsList
- [x] 7.19 Implement R key for quick recommended selection
- [x] 7.20 Implement elaborate (E key) with inline <textarea> in OptionsList
- [x] 7.21 Implement rephrase (D key) functionality in OptionsList
- [x] 7.22 Implement custom input field using native <input> in OptionsList
- [x] 7.23 Create src/tui-opentui/components/ReviewScreen.tsx
- [x] 7.24 Display summary of all answers in ReviewScreen
- [x] 7.25 Implement navigation and submission in ReviewScreen
- [x] 7.26 Test complete question flow end-to-end

## 8. Input Components

- [x] 8.1 Create src/tui-opentui/components/CustomInput.tsx
- [x] 8.2 Wrap native <input> component for free-text answers
- [x] 8.3 Configure placeholder text support in CustomInput
- [x] 8.4 Implement Tab key submission in CustomInput
- [x] 8.5 Implement cursor navigation (arrow keys) in CustomInput
- [x] 8.6 Verify native <textarea> works for elaborate input
- [x] 8.7 Configure <textarea> multi-line support
- [x] 8.8 Add placeholder text to elaborate <textarea>
- [x] 8.9 Implement Esc to close elaborate <textarea>
- [x] 8.10 Configure Tab submit for elaborate input
- [ ] 8.11 Verify CJK character input works correctly (no visualWidth.ts needed)
- [ ] 8.12 Test Korean text input in CustomInput
- [ ] 8.13 Test Japanese text input in CustomInput
- [ ] 8.14 Test Chinese text input in CustomInput
- [ ] 8.15 Verify paste handling works correctly with native components
- [ ] 8.16 Test multi-line paste in elaborate <textarea>

## 9. Dialog & Overlay Components

- [x] 9.1 Create src/tui-opentui/components/ConfirmationDialog.tsx
- [x] 9.2 Implement 3-option rejection dialog layout using <box>/<text>
- [x] 9.3 Implement keyboard navigation for confirmation options
- [x] 9.4 Create src/tui-opentui/components/SingleLineTextInput.tsx
- [x] 9.5 Use native <input> for rejection reason text entry
- [x] 9.6 Create src/tui-opentui/components/WaitingScreen.tsx
- [x] 9.7 Display "Waiting for AI..." with solid accent text (no gradient animation)
- [x] 9.8 Create src/tui-opentui/components/SessionPicker.tsx
- [x] 9.9 Implement <select> inside positioned <box> overlay
- [x] 9.10 Implement Ctrl+S toggle for SessionPicker visibility
- [x] 9.11 Add stale/abandoned session indicators to SessionPicker items
- [x] 9.12 Create src/tui-opentui/components/UpdateOverlay.tsx
- [x] 9.13 Implement fullscreen <box> overlay for update prompt
- [x] 9.14 Use native <markdown> for changelog display in UpdateOverlay
- [x] 9.15 Add three action buttons: Yes, Skip, Remind me later
- [x] 9.16 Create src/tui-opentui/components/UpdateBadge.tsx
- [x] 9.17 Implement small badge component for header integration
- [x] 9.18 Create src/tui-opentui/components/Toast.tsx
- [x] 9.19 Implement auto-dismiss notification with useTimeline animation
- [x] 9.20 Add fade in/out animation to Toast
- [x] 9.21 Test all dialog components render and function correctly

## 10. Mouse Support

- [x] 10.1 Enable mouse click handling on option items to select/toggle
- [x] 10.2 Implement mouse click handler for single-select options
- [x] 10.3 Implement mouse click handler for multi-select toggle
- [x] 10.4 Enable mouse scroll in scrollable areas (SessionPicker)
- [x] 10.5 Enable mouse scroll in UpdateOverlay changelog view
- [x] 10.6 Enable mouse click on session dots to switch sessions
- [x] 10.7 Add mouse click handler for TabBar navigation
- [x] 10.8 Ensure mouse events don't interfere with keyboard-only workflow
- [ ] 10.9 Test mouse interactions work correctly
- [ ] 10.10 Verify keyboard-only workflow still functions properly

## 11. Session Watcher Adapter

- [x] 11.1 Create src/tui-opentui/hooks/useSessionWatcher.ts
- [x] 11.2 Create OpenTUI-specific session watcher adapter
- [x] 11.3 Implement shared event emitter interface usage
- [x] 11.4 Convert session events to React state updates (useState/useEffect)
- [x] 11.5 Implement session queue management (FIFO ordering)
- [x] 11.6 Implement active session index tracking
- [x] 11.7 Handle session completion and removal from queue
- [ ] 11.8 Handle stale session detection and notifications
- [ ] 11.9 Handle abandoned session detection
- [ ] 11.10 Implement grace period tracking for session interactions
- [ ] 11.11 Test session watcher receives and processes events correctly
- [ ] 11.12 Test session switching functionality

## 12. Testing

- [x] 12.1 Set up bun:test configuration for src/tui-opentui/**tests**/
- [x] 12.2 Create test utilities file (mock session data, mock config)
- [x] 12.3 Create mock theme provider for tests
- [x] 12.4 Create mock terminal dimensions hook
- [x] 12.5 Write tests for StepperView (state management)
- [x] 12.6 Write tests for StepperView (keyboard navigation)
- [x] 12.7 Write tests for StepperView (abandoned sessions)
- [x] 12.8 Write tests for OptionsList (single-select behavior)
- [x] 12.9 Write tests for OptionsList (multi-select behavior)
- [x] 12.10 Write tests for OptionsList (keyboard navigation)
- [x] 12.11 Write tests for OptionsList (recommended selection)
- [x] 12.12 Write tests for Footer (context-aware keybindings)
- [ ] 12.13 Write tests for SessionDots (rendering, stale indicators)
- [ ] 12.14 Write tests for ReviewScreen (answer display)
- [ ] 12.15 Write tests for MarkdownPrompt (markdown rendering)
- [ ] 12.16 Write tests for ConfirmationDialog (3-option flow)
- [ ] 12.17 Write tests for SessionPicker (session list, keyboard navigation)
- [ ] 12.18 Write tests for WaitingScreen (display)
- [ ] 12.19 Write tests for Toast (animation timing, auto-dismiss)
- [x] 12.20 Verify keyboard shortcuts work via mockInput testing
- [ ] 12.21 Achieve minimum 80% test coverage for OpenTUI components

## 13. Build & Integration

- [x] 13.1 Update package.json build script to include OpenTUI TypeScript compilation
- [x] 13.2 Add separate build:opentui script for OpenTUI-only builds
- [x] 13.3 Verify tsc compiles both ink and OpenTUI files without errors
- [x] 13.4 Verify no type conflicts between ink and OpenTUI type definitions
- [x] 13.5 Test existing ink TUI works unchanged (AUQ_RENDERER=ink)
- [ ] 13.6 Test OpenTUI TUI works with AUQ_RENDERER=opentui
- [ ] 13.7 Verify fallback mechanism works when OpenTUI fails
- [ ] 13.8 Verify renderer config in .auqrc.json works correctly
- [x] 13.9 Run full vitest test suite (ink components)
- [ ] 13.10 Run full bun:test suite (OpenTUI components)
- [x] 13.11 Verify ESLint passes on new OpenTUI files
- [x] 13.12 Verify Prettier passes on new OpenTUI files
- [x] 13.13 Test TypeScript strict mode on OpenTUI files
- [ ] 13.14 Run integration test with both renderers

## 14. Documentation

- [x] 14.1 Update README.md with OpenTUI migration information
- [x] 14.2 Document AUQ_RENDERER environment variable usage
- [x] 14.3 Document renderer config option in .auqrc.json
- [ ] 14.4 Add migration guide section to docs/
- [x] 14.5 Document keyboard shortcuts for OpenTUI version
- [x] 14.6 Add JSDoc comments to all public hooks in src/tui-opentui/hooks/
- [x] 14.7 Add JSDoc comments to all shared utility functions
- [x] 14.8 Document theme system differences (Ink vs OpenTUI)
- [ ] 14.9 Create troubleshooting guide for renderer toggle issues
- [x] 14.10 Update CHANGELOG.md with migration details

## 15. Final Validation

- [ ] 15.1 Run complete test suite: bun test && npm run test
- [ ] 15.2 Run build: bun run build
- [ ] 15.3 Validate with OpenSpec: openspec validate migrate-tui-to-opentui --strict
- [ ] 15.4 Test manually with AUQ_RENDERER=ink (verify ink version works)
- [ ] 15.5 Test manually with AUQ_RENDERER=opentui (verify OpenTUI version works)
- [ ] 15.6 Test theme switching in OpenTUI version (Ctrl+T)
- [ ] 15.7 Test session navigation in OpenTUI version (Ctrl+S)
- [ ] 15.8 Test question answering flow end-to-end in OpenTUI
- [ ] 15.9 Test elaborate functionality in OpenTUI
- [ ] 15.10 Test rephrase functionality in OpenTUI
- [ ] 15.11 Test rejection flow in OpenTUI
- [ ] 15.12 Test update overlay in OpenTUI
- [ ] 15.13 Verify no console errors or warnings in either renderer
- [ ] 15.14 Verify performance is acceptable (no noticeable lag)
- [ ] 15.15 Sign off on migration completion
