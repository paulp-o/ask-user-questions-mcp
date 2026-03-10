# Tasks: Add Auto-Update System

## 1. Core Infrastructure - Types & Interfaces

- [x] 1.1 Create `src/update/` directory for the update module
- [x] 1.2 Create `src/update/types.ts` with TypeScript interfaces:
  - `UpdateCheckCache` - Cache structure (lastCheck, latestVersion, skippedVersion, changelog, changelogFetchedAt)
  - `UpdateInfo` - Update check result (currentVersion, latestVersion, updateType, changelogUrl)
  - `PackageManagerInfo` - Package manager details (name, installCommand)
  - `ChangelogResult` - Changelog fetch result (content, fallbackUrl)

## 2. Core Infrastructure - Version Utilities

- [x] 2.1 Create `src/update/version.ts` with semver utilities:
  - `parseVersion(version: string)` - Parse major.minor.patch to numbers
  - `isNewer(current: string, latest: string)` - Compare two versions
  - `getUpdateType(current: string, latest: string)` - Return 'patch' | 'minor' | 'major'
  - Handle prerelease versions (treat as newer than release)

## 3. Core Infrastructure - Cache Management

- [x] 3.1 Create `src/update/cache.ts` for XDG-compliant cache:
  - `getCachePath()` - Resolve `~/.config/auq/update-check.json` using XDG
  - `readCache()` - Read and parse cache file, return null if missing/invalid
  - `writeCache(cache: UpdateCheckCache)` - Atomic write to cache file
  - `isCacheFresh(cache: UpdateCheckCache)` - Check if lastCheck < 1 hour ago
  - `shouldSkipVersion(cache: UpdateCheckCache, version: string)` - Check skippedVersion
  - Ensure directory exists before writing

## 4. Core Infrastructure - Package Manager Detection

- [x] 4.1 Create `src/update/package-manager.ts`:
  - `detectPackageManager()` - Detect bun/npm/yarn/pnpm with priority:
    1. Check `process.env.npm_config_user_agent`
    2. Check `process.env.npm_execpath`
    3. Check `process.execPath` for package manager names
    4. Check PATH for available package managers
    5. Default to npm
  - Return `{ name, installCommand }` for each PM
  - Handle Windows vs Unix path differences

## 5. Core Infrastructure - Update Checker

- [x] 5.1 Create `src/update/checker.ts` with `UpdateChecker` class:
  - `check()` method with memoized Promise pattern (prevent duplicate requests)
  - `performCheck()` private method:
    - Read cache first, return cached if fresh
    - Fetch npm registry for `auq-mcp-server` (timeout: 5s)
    - Parse dist-tags.latest version
    - Compare with current version from package.json
    - Write cache with new version info
    - Return null if no update or on error
  - `shouldSkipCheck()` - Check CI env, NO_UPDATE_NOTIFIER, config
  - `clearCache()` - Force fresh check

## 6. Core Infrastructure - Changelog Fetcher

- [x] 6.1 Create `src/update/changelog.ts`:
  - `fetchChangelog(version: string)` - Fetch from GitHub Releases API
  - Handle rate limiting (403) with graceful fallback
  - Return `{ content: string | null, fallbackUrl: string }`
  - Cache changelogs separately to reduce API calls
  - Format: `https://api.github.com/repos/AlpacaLOS/auq/releases/tags/v{version}`

## 7. Core Infrastructure - Installer

- [x] 7.1 Create `src/update/installer.ts`:
  - `installUpdate(packageManager: PackageManagerInfo)` - Spawn install command
  - Use Bun.spawn() or child_process.spawn
  - Capture stdout/stderr for error reporting
  - Return Promise<boolean> for success/failure
  - Provide manual fallback command on failure
  - Handle permission errors gracefully

## 8. Core Infrastructure - Module Index

- [x] 8.1 Create `src/update/index.ts`:
  - Export `UpdateChecker` class
  - Export version utilities
  - Export cache functions
  - Export package manager detection
  - Export installer function
  - Export types

## 9. Config Extension

- [x] 9.1 Modify `src/config/types.ts`:
  - Add `updateCheck?: boolean` to AUQConfigSchema interface
  - Default value is `true` (opt-out)
- [x] 9.2 Modify `src/config/schema.ts`:
  - Add `updateCheck: z.boolean().default(true)` to Zod schema
- [x] 9.3 Modify `src/config/defaults.ts` (if exists):
  - Include `updateCheck: true` in default config

## 10. CLI Integration - Update Command

- [x] 10.1 Create `src/cli/commands/update.ts`:
  - Implement `auq update` command handler
  - Fetch latest version from npm registry (blocking, with spinner)
  - Display current → latest version
  - Fetch and display changelog from GitHub
  - Show breaking change warning for major versions
  - Interactive confirmation prompt (Y/n)
  - Support `-y` / `--yes` flag for non-interactive mode
  - Detect package manager and show install command
  - Execute installation
  - Handle errors with manual fallback instructions
  - Success message: "Update complete, please restart auq"

## 11. CLI Integration - Entry Point

- [x] 11.1 Modify `src/cli/cli.ts`:
  - Add `update` command routing to the command map
  - Add fire-and-forget update check for other commands
  - Non-blocking check with 5s timeout
  - Print one-line stderr message if update found:
    - Format: "Update available: 2.4.0 → 2.5.0. Run `auq update` to upgrade."
  - Respect `NO_UPDATE_NOTIFIER` and `updateCheck: false`

## 12. TUI Integration - UpdateBadge Component

- [x] 12.1 Create `src/tui/components/UpdateBadge.tsx`:
  - Small indicator component for TUI header
  - Display "↑ Update" or "↑ v2.5.0 available"
  - Conditional rendering based on update availability
  - Keyboard-activatable to open fullscreen overlay
  - Different colors for patch (green) vs minor/major (yellow/orange)

## 13. TUI Integration - UpdateOverlay Component

- [x] 13.1 Create `src/tui/components/UpdateOverlay.tsx`:
  - Fullscreen overlay using Ink `<Box>` with centered content
  - Display version info: "Current: 2.4.0 → Latest: 2.5.0"
  - Breaking change warning banner for major versions
  - Scrollable changelog view using `ink-markdown-es`
  - Three action buttons:
    - "[Yes]" - Install update
    - "[Skip this version]" - Add to skipped versions
    - "[Remind me later]" - Close overlay, show badge
  - Progress indicator during installation
  - Error display with retry and manual command options
  - Handle keyboard navigation (Tab/Arrow keys to select, Enter to confirm)

## 14. TUI Integration - App Integration

- [x] 14.1 Modify `src/tui/TUI.tsx`:
  - Add `UpdateChecker` instance in state or context
  - Start periodic background check on mount (setInterval 1 hour)
  - Cleanup interval on unmount
  - Check cache at startup for pending updates:
    - Patch available → Auto-install silently, show completion notice
    - Minor/Major available → Show overlay (if not skipped)
  - Add overlay state management (show/hide UpdateOverlay)
  - Add badge state for header integration
  - Defer prompts during active sessions (wait for idle state)
- [x] 14.2 Modify TUI header component:
  - Import and conditionally render `<UpdateBadge />`
  - Pass update info from TUI state

## 15. Testing - Unit Tests

- [x] 15.1 Create `src/update/__tests__/version.test.ts`:
  - Test `parseVersion` with valid/invalid versions
  - Test `isNewer` for patch/minor/major comparisons
  - Test `getUpdateType` returns correct type
  - Test prerelease version handling
- [x] 15.2 Create `src/update/__tests__/cache.test.ts`:
  - Test cache read/write operations
  - Test cache expiration logic
  - Test skipped version management
  - Mock filesystem for isolation
- [x] 15.3 Create `src/update/__tests__/package-manager.test.ts`:
  - Test detection with various env variables
  - Test fallback behavior
  - Test install command generation
- [x] 15.4 Create `src/update/__tests__/checker.test.ts`:
  - Test skip logic (CI, env vars, config)
  - Test memoized promise pattern
  - Mock npm registry responses
  - Test error handling

## 16. Testing - Integration Tests

- [x] 16.1 Test CLI update command:
  - Mock npm registry and GitHub API
  - Test interactive prompts
  - Test `-y` flag behavior
  - Test error scenarios
- [x] 16.2 Test TUI update flow:
  - Test overlay rendering
  - Test button interactions
  - Test background checker
  - Test badge display
- [x] 16.3 Test config integration:
  - Verify `updateCheck: false` disables checks
  - Verify `NO_UPDATE_NOTIFIER=1` disables checks

## 17. Documentation

- [x] 17.1 Update README.md:
  - Add "Auto-Update" section explaining the feature
  - Document `auq update` command
  - Document config option `updateCheck`
  - Document environment variable `NO_UPDATE_NOTIFIER`
  - Explain patch auto-update vs minor/major prompts
- [x] 17.2 Add inline documentation:
  - JSDoc comments for all public functions in `src/update/`
  - Comments explaining semver comparison edge cases
  - Comments for complex cache logic

## 18. Final Validation

- [x] 18.1 Run full test suite: `bun test`
- [x] 18.2 Run build: `bun run build`
- [x] 18.3 Validate with OpenSpec: `openspec validate add-auto-update --strict`
- [x] 18.4 Test manually in different environments:
  - Test with bun global install
  - Test with npm global install
  - Test in CI environment (should skip)
  - Test with `NO_UPDATE_NOTIFIER=1`
- [x] 18.5 Verify no new npm dependencies were added (using only native fetch)
