# Change: Add Auto-Update System

## Why

Currently, AUQ users must manually check for and install updates by running package manager commands. This leads to:

- Users running outdated versions without realizing it
- Missing critical bug fixes and security patches
- Poor user experience compared to modern CLI tools that self-update

An automatic update system ensures users always have the latest improvements while maintaining control over when updates are applied.

## What Changes

- **NEW** `auq update` CLI command for manual update checks and installation
- **NEW** Patch version auto-update (silent background installation for patch releases like 2.4.0 → 2.4.1)
- **NEW** Minor/Major version update prompts (fullscreen TUI overlay with changelog for 2.4.0 → 2.5.0 or 2.4.0 → 3.0.0)
- **NEW** Background update checker (checks npm registry every 1 hour while TUI is running)
- **NEW** CLI non-interactive update notification (one-line stderr message for non-TUI commands)
- **NEW** Config option `updateCheck` to disable automatic update checks
- **NEW** Environment variable `NO_UPDATE_NOTIFIER=1` support for CI/non-interactive environments
- **NEW** "Skip this version" functionality to suppress prompts for specific versions
- **NEW** Package manager auto-detection (bun, npm, yarn, pnpm) based on installation method

## Impact

### Affected Specs

- `cli-interface`: New `auq update` command, update notification on existing commands
- `tui-application`: Fullscreen update overlay component, header update badge, periodic background check

### Affected Code

- New directory `src/update/`: Update checker, version comparison, cache management
- New file `src/cli/commands/update.ts`: `auq update` command implementation
- New file `src/tui/components/UpdateOverlay.tsx`: Fullscreen update prompt UI
- New file `src/tui/components/UpdateBadge.tsx`: Header update indicator
- Modified `src/cli/cli.ts`: Add update command, inject update notification
- Modified `src/tui/TUI.tsx`: Integrate update checker and overlay rendering
- Modified `src/config/schema.ts`: Add `updateCheck` configuration option
- Modified `src/config/types.ts`: Add update-related config types

### Breaking Changes

None - all changes are additive with opt-out mechanisms.

### Dependencies

- Uses native `fetch()` for npm registry and GitHub API calls (no new dependencies)
- Leverages existing `ink-markdown-es` for changelog rendering
- Integrates with existing config system (`~/.config/auq/`)
