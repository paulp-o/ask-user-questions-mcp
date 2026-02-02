# Tasks: Simplify Session Directory to Global-Only

## 1. Core Implementation

- [x] 1.1 Remove `detectInstallMode()` function from `src/session/utils.ts`
- [x] 1.2 Simplify `getSessionDirectory()` to check env var then return XDG path
- [x] 1.3 Remove any references to `detectInstallMode()` in codebase
- [x] 1.4 Update `resolveSessionDirectory()` if needed (may keep as-is for XDG logic)

## 2. Component Updates

- [x] 2.1 Verify MCP server (`src/server.ts`, `src/core/ask-user-questions.ts`) uses simplified path
- [x] 2.2 Verify CLI ask command (`bin/auq.tsx`) uses simplified path
- [x] 2.3 Verify TUI (`bin/tui-app.tsx`, `src/tui/session-watcher.ts`) uses simplified path
- [x] 2.4 Update OpenCode plugin (`packages/opencode-plugin/src/index.ts`) if it has local detection

## 3. Testing

- [x] 3.1 Update/add unit tests for simplified `getSessionDirectory()` in `src/session/__tests__/`
- [x] 3.2 Remove tests for `detectInstallMode()` if any exist
- [x] 3.3 Test env var override still works (`AUQ_SESSION_DIR`)
- [x] 3.4 Test platform-specific paths (macOS, Linux, Windows)

## 4. Documentation

- [x] 4.1 Update `openspec/project.md` to reflect global-only behavior
- [x] 4.2 Add troubleshooting section to README.md explaining session directory location
- [x] 4.3 Update CHANGELOG.md with release notes

## 5. Cleanup

- [x] 5.1 Run `npm run lint` and fix any issues
- [x] 5.2 Run `npm test` and ensure all tests pass
- [x] 5.3 Manual testing: verify MCP server and CLI find each other's sessions
