# Tasks: Migrate TUI from Ink to OpenTUI

## 1. Project Setup & Configuration

- [ ] 1.1 Add @opentui/core and @opentui/react dependencies to package.json (pin exact version 0.1.87)
- [ ] 1.2 Create tsconfig.opentui.json with jsx: "react-jsx" and jsxImportSource: "@opentui/react"
- [ ] 1.3 Create src/tui-opentui/ directory structure mirroring src/tui/ layout
- [ ] 1.4 Update package.json build scripts to compile OpenTUI files separately
- [ ] 1.5 Add AUQ_RENDERER environment variable support to config types (src/config/types.ts)
- [ ] 1.6 Add renderer field to .auqrc.json config schema using Zod (src/shared/schemas.ts)
- [ ] 1.7 Update ConfigLoader to recognize and validate renderer config value
- [ ] 1.8 Add default renderer value ("ink") to config defaults

## 2. Shared Logic Extraction

- [ ] 2.1 Create src/tui/shared/ directory for framework-agnostic code
- [ ] 2.2 Move theme definitions from src/tui/themes/ to src/tui/shared/themes/
- [ ] 2.3 Update all import paths in existing ink components to reference shared/themes/
- [ ] 2.4 Move framework-agnostic types to src/tui/shared/types.ts:
  - Answer type
  - SessionUIState type
  - FocusContext type
  - Question data structures
- [ ] 2.5 Move utility functions to src/tui/shared/utils/:
  - staleDetection.ts
  - sessionSwitching.ts
  - relativeTime.ts
  - recommended.ts
  - config.ts
  - detectTheme.ts
- [ ] 2.6 Update imports in ink components to reference shared/utils/ paths
- [ ] 2.7 Verify notifications/ module remains importable by both ink and OpenTUI versions
- [ ] 2.8 Verify i18n/ module remains importable by both ink and OpenTUI versions
- [ ] 2.9 Extract session watcher event emitter interface to src/tui/shared/session-events.ts
- [ ] 2.10 Create shared SessionWatcher type definitions
- [ ] 2.11 Verify ink version still compiles and works after extraction
- [ ] 2.12 Run existing ink tests to confirm no regressions

## 3. Entry Point & Renderer Toggle

- [ ] 3.1 Modify bin/tui-app.tsx to check AUQ_RENDERER environment variable
- [ ] 3.2 Add conditional dynamic import logic for OpenTUI vs ink app modules
- [ ] 3.3 Implement fallback mechanism: try OpenTUI, catch error, fall back to ink with stderr warning
- [ ] 3.4 Add renderer config field reading to ConfigLoader initialization
- [ ] 3.5 Add renderer option validation to Zod schema in src/shared/schemas.ts
- [ ] 3.6 Add renderer config documentation to config loader
- [ ] 3.7 Test entry point with AUQ_RENDERER=ink (should use existing ink version)
- [ ] 3.8 Test entry point with AUQ_RENDERER=opentui (should attempt OpenTUI)
- [ ] 3.9 Test fallback when OpenTUI fails to load

## 4. OpenTUI App Shell

- [ ] 4.1 Create src/tui-opentui/app.tsx with createCliRenderer() initialization
- [ ] 4.2 Configure renderer options: exitOnCtrlC: false, useMouse: true, autoFocus: false
- [ ] 4.3 Configure renderer options: useAlternateScreen: true, useKittyKeyboard: {}
- [ ] 4.4 Configure renderer options: useConsole: process.env.AUQ_DEBUG === '1', targetFps: 60
- [ ] 4.5 Create App root component with ConfigProvider wrapper
- [ ] 4.6 Create ThemeProvider wrapper in app shell
- [ ] 4.7 Implement app exit/cleanup via renderer.destroy() on unmount
- [ ] 4.8 Create src/tui-opentui/ThemeProvider.tsx with React Context for theme state
- [ ] 4.9 Create src/tui-opentui/ConfigContext.tsx for app configuration access
- [ ] 4.10 Implement useTerminalDimensions() hook using OpenTUI's terminal size API
- [ ] 4.11 Add error boundary for OpenTUI renderer errors
- [ ] 4.12 Test app shell renders without errors

## 5. Theme System Migration

- [ ] 5.1 Create src/tui-opentui/utils/syntaxStyle.ts utility file
- [ ] 5.2 Implement function to generate SyntaxStyle from theme color tokens
- [ ] 5.3 Map theme token 'keyword' to SyntaxStyle.keyword property
- [ ] 5.4 Map theme token 'string' to SyntaxStyle.string property
- [ ] 5.5 Map theme token 'comment' to SyntaxStyle.comment property
- [ ] 5.6 Map theme token 'number' to SyntaxStyle.number property
- [ ] 5.7 Map theme token 'markup.heading' to SyntaxStyle.markup.heading property
- [ ] 5.8 Map all remaining theme color tokens to SyntaxStyle properties
- [ ] 5.9 Create ThemeContext providing both theme colors AND generated SyntaxStyle
- [ ] 5.10 Implement useTheme() hook returning combined theme + SyntaxStyle
- [ ] 5.11 Implement Ctrl+T theme cycling using useKeyboard hook
- [ ] 5.12 Import and reuse system theme detection from shared/utils/detectTheme.ts
- [ ] 5.13 Implement theme persistence to config file on theme change
- [ ] 5.14 Test all 15+ built-in themes render correctly with SyntaxStyle
- [ ] 5.15 Test custom theme loading and SyntaxStyle generation
- [ ] 5.16 Verify theme switching works without app restart

## 6. Core Layout Components

- [ ] 6.1 Create src/tui-opentui/components/Header.tsx
- [ ] 6.2 Implement Header with solid accent color text (no gradient animation)
- [ ] 6.3 Display version number in Header
- [ ] 6.4 Display update badge in Header when update available
- [ ] 6.5 Display queue count in Header
- [ ] 6.6 Create src/tui-opentui/components/Footer.tsx
- [ ] 6.7 Implement context-aware keybinding hints in Footer using <box>/<text>
- [ ] 6.8 Create src/tui-opentui/components/TabBar.tsx
- [ ] 6.9 Implement question progress tabs using <box>/<text> components
- [ ] 6.10 Add useTerminalDimensions hook for responsive tab width calculation
- [ ] 6.11 Create src/tui-opentui/components/SessionDots.tsx
- [ ] 6.12 Implement compact session indicators using <text> component
- [ ] 6.13 Add stale/abandoned visual indicators to SessionDots
- [ ] 6.14 Create src/tui-opentui/components/ThemeIndicator.tsx
- [ ] 6.15 Display current theme name in ThemeIndicator
- [ ] 6.16 Test all layout components render correctly

## 7. Question Flow Components

- [ ] 7.1 Create src/tui-opentui/components/StepperView.tsx (main orchestrator)
- [ ] 7.2 Implement question navigation state management in StepperView
- [ ] 7.3 Implement answer state storage using Map in StepperView
- [ ] 7.4 Implement review toggle functionality in StepperView
- [ ] 7.5 Implement rejection flow handling in StepperView
- [ ] 7.6 Implement elaborate marks tracking in StepperView
- [ ] 7.7 Implement keyboard navigation using useKeyboard hook in StepperView
- [ ] 7.8 Handle abandoned session confirmation flow in StepperView
- [ ] 7.9 Create src/tui-opentui/components/QuestionDisplay.tsx
- [ ] 7.10 Render TabBar + MarkdownPrompt + OptionsList + Footer in QuestionDisplay
- [ ] 7.11 Create src/tui-opentui/components/MarkdownPrompt.tsx
- [ ] 7.12 Use native <markdown> component with theme-derived SyntaxStyle
- [ ] 7.13 Configure markdown component for inline and block rendering modes
- [ ] 7.14 Create src/tui-opentui/components/OptionsList.tsx
- [ ] 7.15 Implement arrow key navigation (↑/↓) using useKeyboard
- [ ] 7.16 Implement single-select with Enter key in OptionsList
- [ ] 7.17 Implement multi-select with Space toggle in OptionsList
- [ ] 7.18 Implement recommended option highlighting in OptionsList
- [ ] 7.19 Implement R key for quick recommended selection
- [ ] 7.20 Implement elaborate (E key) with inline <textarea> in OptionsList
- [ ] 7.21 Implement rephrase (D key) functionality in OptionsList
- [ ] 7.22 Implement custom input field using native <input> in OptionsList
- [ ] 7.23 Create src/tui-opentui/components/ReviewScreen.tsx
- [ ] 7.24 Display summary of all answers in ReviewScreen
- [ ] 7.25 Implement navigation and submission in ReviewScreen
- [ ] 7.26 Test complete question flow end-to-end

## 8. Input Components

- [ ] 8.1 Create src/tui-opentui/components/CustomInput.tsx
- [ ] 8.2 Wrap native <input> component for free-text answers
- [ ] 8.3 Configure placeholder text support in CustomInput
- [ ] 8.4 Implement Tab key submission in CustomInput
- [ ] 8.5 Implement cursor navigation (arrow keys) in CustomInput
- [ ] 8.6 Verify native <textarea> works for elaborate input
- [ ] 8.7 Configure <textarea> multi-line support
- [ ] 8.8 Add placeholder text to elaborate <textarea>
- [ ] 8.9 Implement Esc to close elaborate <textarea>
- [ ] 8.10 Configure Tab submit for elaborate input
- [ ] 8.11 Verify CJK character input works correctly (no visualWidth.ts needed)
- [ ] 8.12 Test Korean text input in CustomInput
- [ ] 8.13 Test Japanese text input in CustomInput
- [ ] 8.14 Test Chinese text input in CustomInput
- [ ] 8.15 Verify paste handling works correctly with native components
- [ ] 8.16 Test multi-line paste in elaborate <textarea>

## 9. Dialog & Overlay Components

- [ ] 9.1 Create src/tui-opentui/components/ConfirmationDialog.tsx
- [ ] 9.2 Implement 3-option rejection dialog layout using <box>/<text>
- [ ] 9.3 Implement keyboard navigation for confirmation options
- [ ] 9.4 Create src/tui-opentui/components/SingleLineTextInput.tsx
- [ ] 9.5 Use native <input> for rejection reason text entry
- [ ] 9.6 Create src/tui-opentui/components/WaitingScreen.tsx
- [ ] 9.7 Display "Waiting for AI..." with solid accent text (no gradient animation)
- [ ] 9.8 Create src/tui-opentui/components/SessionPicker.tsx
- [ ] 9.9 Implement <select> inside positioned <box> overlay
- [ ] 9.10 Implement Ctrl+S toggle for SessionPicker visibility
- [ ] 9.11 Add stale/abandoned session indicators to SessionPicker items
- [ ] 9.12 Create src/tui-opentui/components/UpdateOverlay.tsx
- [ ] 9.13 Implement fullscreen <box> overlay for update prompt
- [ ] 9.14 Use native <markdown> for changelog display in UpdateOverlay
- [ ] 9.15 Add three action buttons: Yes, Skip, Remind me later
- [ ] 9.16 Create src/tui-opentui/components/UpdateBadge.tsx
- [ ] 9.17 Implement small badge component for header integration
- [ ] 9.18 Create src/tui-opentui/components/Toast.tsx
- [ ] 9.19 Implement auto-dismiss notification with useTimeline animation
- [ ] 9.20 Add fade in/out animation to Toast
- [ ] 9.21 Test all dialog components render and function correctly

## 10. Mouse Support

- [ ] 10.1 Enable mouse click handling on option items to select/toggle
- [ ] 10.2 Implement mouse click handler for single-select options
- [ ] 10.3 Implement mouse click handler for multi-select toggle
- [ ] 10.4 Enable mouse scroll in scrollable areas (SessionPicker)
- [ ] 10.5 Enable mouse scroll in UpdateOverlay changelog view
- [ ] 10.6 Enable mouse click on session dots to switch sessions
- [ ] 10.7 Add mouse click handler for TabBar navigation
- [ ] 10.8 Ensure mouse events don't interfere with keyboard-only workflow
- [ ] 10.9 Test mouse interactions work correctly
- [ ] 10.10 Verify keyboard-only workflow still functions properly

## 11. Session Watcher Adapter

- [ ] 11.1 Create src/tui-opentui/hooks/useSessionWatcher.ts
- [ ] 11.2 Create OpenTUI-specific session watcher adapter
- [ ] 11.3 Implement shared event emitter interface usage
- [ ] 11.4 Convert session events to React state updates (useState/useEffect)
- [ ] 11.5 Implement session queue management (FIFO ordering)
- [ ] 11.6 Implement active session index tracking
- [ ] 11.7 Handle session completion and removal from queue
- [ ] 11.8 Handle stale session detection and notifications
- [ ] 11.9 Handle abandoned session detection
- [ ] 11.10 Implement grace period tracking for session interactions
- [ ] 11.11 Test session watcher receives and processes events correctly
- [ ] 11.12 Test session switching functionality

## 12. Testing

- [ ] 12.1 Set up bun:test configuration for src/tui-opentui/**tests**/
- [ ] 12.2 Create test utilities file (mock session data, mock config)
- [ ] 12.3 Create mock theme provider for tests
- [ ] 12.4 Create mock terminal dimensions hook
- [ ] 12.5 Write tests for StepperView (state management)
- [ ] 12.6 Write tests for StepperView (keyboard navigation)
- [ ] 12.7 Write tests for StepperView (abandoned sessions)
- [ ] 12.8 Write tests for OptionsList (single-select behavior)
- [ ] 12.9 Write tests for OptionsList (multi-select behavior)
- [ ] 12.10 Write tests for OptionsList (keyboard navigation)
- [ ] 12.11 Write tests for OptionsList (recommended selection)
- [ ] 12.12 Write tests for Footer (context-aware keybindings)
- [ ] 12.13 Write tests for SessionDots (rendering, stale indicators)
- [ ] 12.14 Write tests for ReviewScreen (answer display)
- [ ] 12.15 Write tests for MarkdownPrompt (markdown rendering)
- [ ] 12.16 Write tests for ConfirmationDialog (3-option flow)
- [ ] 12.17 Write tests for SessionPicker (session list, keyboard navigation)
- [ ] 12.18 Write tests for WaitingScreen (display)
- [ ] 12.19 Write tests for Toast (animation timing, auto-dismiss)
- [ ] 12.20 Verify keyboard shortcuts work via mockInput testing
- [ ] 12.21 Achieve minimum 80% test coverage for OpenTUI components

## 13. Build & Integration

- [ ] 13.1 Update package.json build script to include OpenTUI TypeScript compilation
- [ ] 13.2 Add separate build:opentui script for OpenTUI-only builds
- [ ] 13.3 Verify tsc compiles both ink and OpenTUI files without errors
- [ ] 13.4 Verify no type conflicts between ink and OpenTUI type definitions
- [ ] 13.5 Test existing ink TUI works unchanged (AUQ_RENDERER=ink)
- [ ] 13.6 Test OpenTUI TUI works with AUQ_RENDERER=opentui
- [ ] 13.7 Verify fallback mechanism works when OpenTUI fails
- [ ] 13.8 Verify renderer config in .auqrc.json works correctly
- [ ] 13.9 Run full vitest test suite (ink components)
- [ ] 13.10 Run full bun:test suite (OpenTUI components)
- [ ] 13.11 Verify ESLint passes on new OpenTUI files
- [ ] 13.12 Verify Prettier passes on new OpenTUI files
- [ ] 13.13 Test TypeScript strict mode on OpenTUI files
- [ ] 13.14 Run integration test with both renderers

## 14. Documentation

- [ ] 14.1 Update README.md with OpenTUI migration information
- [ ] 14.2 Document AUQ_RENDERER environment variable usage
- [ ] 14.3 Document renderer config option in .auqrc.json
- [ ] 14.4 Add migration guide section to docs/
- [ ] 14.5 Document keyboard shortcuts for OpenTUI version
- [ ] 14.6 Add JSDoc comments to all public hooks in src/tui-opentui/hooks/
- [ ] 14.7 Add JSDoc comments to all shared utility functions
- [ ] 14.8 Document theme system differences (Ink vs OpenTUI)
- [ ] 14.9 Create troubleshooting guide for renderer toggle issues
- [ ] 14.10 Update CHANGELOG.md with migration details

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
