# Change: Simplify Session Directory to Global-Only

## Why

The current session directory detection logic (`detectInstallMode()`) causes a coordination problem between MCP server and CLI/TUI components. When AUQ is installed locally in a project's `node_modules`, the MCP server writes sessions to `{projectRoot}/.auq/sessions`, but if the user runs `auq` CLI globally, it looks in `~/Library/Application Support/auq/sessions` (or platform-specific XDG path). They never find each other.

This complexity adds maintenance burden and confuses users. Since project-level session isolation is "nice to have" rather than critical, the simplest solution is to always use global XDG-compliant paths.

## What Changes

- **REMOVED**: `detectInstallMode()` function in `src/session/utils.ts`
- **MODIFIED**: `getSessionDirectory()` simplified to: `AUQ_SESSION_DIR` env var → XDG platform path
- **REMOVED**: Local installation mode detection logic
- **REMOVED**: Project-relative `.auq/sessions` directory support
- **KEPT**: `AUQ_SESSION_DIR` environment variable override for power users
- **KEPT**: Platform-specific XDG paths (macOS, Linux, Windows)

## Impact

- **Affected specs**: session-management, cli-interface
- **Affected code**:
  - `src/session/utils.ts` - Remove `detectInstallMode()`, simplify `getSessionDirectory()`
  - `packages/opencode-plugin/src/index.ts` - Remove any local detection logic
- **Backward compatibility**: Fully compatible. Existing sessions in global XDG paths continue working. Local `.auq/` directories become orphaned (users can delete manually).
- **User impact**: Sessions now always stored in one predictable location per platform.

## Benefits

1. **Eliminates coordination problem** - MCP server and CLI always use same path
2. **Simpler codebase** - Remove ~50 lines of detection logic
3. **Predictable UX** - Users always know where sessions are stored
4. **No edge cases** - No stale breadcrumbs, no find-up failures, no multi-project conflicts
