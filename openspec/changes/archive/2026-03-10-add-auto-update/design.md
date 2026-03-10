## Context

AUQ currently has no update notification or management system. Users must manually check npm for new versions and run package manager commands to upgrade. This leads to outdated installations, missed bug fixes, and a degraded user experience compared to modern CLI tools.

This change introduces a comprehensive auto-update system with three modes of operation:

1. **Silent patch auto-update** - Automatically install patch versions (2.4.0 → 2.4.1) at TUI startup
2. **Interactive update prompts** - Fullscreen TUI overlay for minor/major versions with changelogs
3. **Manual update command** - `auq update` CLI command for explicit updates

Technical constraints and considerations:

- AUQ runs on Bun runtime and is distributed via npm as `auq-mcp-server`
- The project already uses `~/.config/auq/` for configuration (XDG-compliant)
- TUI is built with Ink (React for CLI), uses `ink-markdown-es` for markdown rendering
- No external update libraries (like `update-notifier`) due to Bun compatibility issues with detached child processes

## Goals / Non-Goals

**Goals:**

- Provide seamless patch updates without user interruption
- Notify users of minor/major updates through non-intrusive TUI UI
- Support manual update checks via `auq update` command
- Minimize network requests through intelligent caching
- Support all major package managers (bun, npm, yarn, pnpm)
- Respect user preferences (opt-out via config, environment variables)
- Work reliably in CI/non-interactive environments

**Non-Goals:**

- Self-updating binaries (AUQ remains a npm package)
- Background daemon for updates
- Downgrade support
- Delta/patch-based updates (full package replacement only)
- Automatic updates for major versions (always prompt)

## Decisions

### Decision: Custom implementation over update-notifier library

**What:** Build a custom update checking system using native `fetch()` instead of using the popular `update-notifier` npm package.

**Why:**

- Bun has known issues with `child_process.spawn` in detached mode, which `update-notifier` relies on for background checks
- Custom implementation gives us full control over caching, UI integration, and update behavior
- Avoids adding a dependency that brings in 50+ transitive packages

**Alternatives considered:**

- `update-notifier` - Industry standard but incompatible with Bun's process spawning
- `simple-update-notifier` - Lighter but still has Bun compatibility issues
- `check-for-update` - Less popular, limited customization

### Decision: Native fetch() with no new npm dependencies

**What:** Use native `fetch()` for npm registry and GitHub API calls. Implement simple semver comparison utilities locally.

**Why:**

- Node.js 18+ and Bun both have native `fetch()` support
- Semver comparison for version detection is straightforward (~20 lines of code)
- Avoids `semver`, `axios`, or other HTTP client dependencies
- Keeps bundle size minimal

**Implementation details:**

```typescript
// src/update/version.ts
function parseVersion(version: string): {
  major: number;
  minor: number;
  patch: number;
} {
  const [major, minor, patch] = version.split(".").map(Number);
  return { major, minor, patch };
}

function getUpdateType(
  current: string,
  latest: string,
): "patch" | "minor" | "major" {
  const c = parseVersion(current);
  const l = parseVersion(latest);
  if (l.major > c.major) return "major";
  if (l.minor > c.minor) return "minor";
  return "patch";
}
```

### Decision: XDG-compliant cache in ~/.config/auq/

**What:** Store update check cache in `~/.config/auq/update-check.json`, following the existing config system pattern.

**Why:**

- Consistent with existing AUQ configuration storage
- XDG Base Directory Specification compliant
- Simple JSON file is sufficient for this use case
- No need for a database or complex state management

**Cache structure:**

```typescript
interface UpdateCheckCache {
  lastCheck: number; // Unix timestamp
  latestVersion: string; // e.g., "2.5.0"
  skippedVersion?: string; // Version user chose to skip
  changelog?: string; // Cached changelog markdown
  changelogFetchedAt?: number; // When changelog was fetched
}
```

**Alternatives considered:**

- `~/.auq/` - Non-standard location
- OS-specific paths (Library/Preferences, AppData) - Overly complex for CLI tool

### Decision: Patch auto-update only at TUI startup

**What:** Automatically install patch updates (e.g., 2.4.0 → 2.4.1) only when the TUI starts, not during active sessions or CLI commands.

**Why:**

- Predictable behavior - user knows restart may bring updates
- Avoids surprise interruptions during active work
- Simpler implementation - no need for hot-reload handling
- Aligns with user expectations from other CLI tools

**Flow:**

1. TUI starts → check cache → if patch available → auto-install → show completion notice
2. TUI running → background check finds patch → show badge only, don't auto-install
3. Next TUI start → auto-install the pending patch

### Decision: GitHub Releases API with rate limit fallback

**What:** Fetch changelogs from GitHub Releases API, with graceful degradation if rate limited.

**Why:**

- GitHub Releases is the canonical source for AUQ release notes
- Unauthenticated API allows 60 requests/hour, sufficient for normal usage
- Cached changelogs reduce API calls
- Version-only display is acceptable when API is unavailable

**Rate limit handling:**

```typescript
// If 403 rate limit, show version without changelog
if (response.status === 403) {
  return {
    version: latestVersion,
    changelog: null,
    fallbackUrl: `https://github.com/AlpacaLOS/auq/releases/tag/v${latestVersion}`,
  };
}
```

**Alternatives considered:**

- Bundle changelog in npm package - Increases package size, can't update after release
- Store changelog in npm registry metadata - Limited space, not standard practice
- Use GitHub API with authentication - Requires managing tokens

### Decision: Package manager detection priority

**What:** Detect which package manager was used to install AUQ using this priority order:

1. `process.env.npm_config_user_agent` - Most reliable for npm/yarn/pnpm
2. `process.env.npm_execpath` - Fallback for npm-based managers
3. Check if global executable paths contain `bun`/`npm`/`yarn`/`pnpm`
4. Check if bun/npm/yarn/pnpm exists in PATH
5. Default to `npm` as universal fallback

**Why:**

- Different users install AUQ via different methods (`bun add -g`, `npm i -g`, etc.)
- Correct package manager detection ensures `auq update` uses the same tool
- Environment variables set by package managers are the most reliable indicators

**Implementation:**

```typescript
function detectPackageManager(): PackageManagerInfo {
  const userAgent = process.env.npm_config_user_agent || "";

  if (userAgent.includes("bun"))
    return { name: "bun", installCommand: "bun add -g" };
  if (userAgent.includes("yarn"))
    return { name: "yarn", installCommand: "yarn global add" };
  if (userAgent.includes("pnpm"))
    return { name: "pnpm", installCommand: "pnpm add -g" };
  if (userAgent.includes("npm"))
    return { name: "npm", installCommand: "npm install -g" };

  // Fallback: check executable path
  const execPath = process.execPath.toLowerCase();
  if (execPath.includes("bun"))
    return { name: "bun", installCommand: "bun add -g" };

  return { name: "npm", installCommand: "npm install -g" };
}
```

### Decision: Memoized promise pattern for update checks

**What:** Use a single memoized Promise per TUI session for update checks, preventing duplicate concurrent requests.

**Why:**

- Multiple components may request update status simultaneously
- Prevents unnecessary network requests
- Follows pattern used by Wrangler CLI and other modern tools
- Simplifies state management

**Implementation:**

```typescript
// src/update/checker.ts
export class UpdateChecker {
  private checkPromise: Promise<UpdateInfo | null> | null = null;

  async check(): Promise<UpdateInfo | null> {
    if (this.checkPromise) {
      return this.checkPromise;
    }

    this.checkPromise = this.performCheck();
    return this.checkPromise;
  }

  private async performCheck(): Promise<UpdateInfo | null> {
    // ... fetch from npm registry, compare versions, return result
  }
}
```

### Decision: Non-blocking CLI notification with 5s timeout

**What:** For CLI commands, perform update check in a "fire-and-forget" manner with a 5-second timeout, printing a one-line stderr message if an update is found.

**Why:**

- CLI commands should remain fast - update check must not block
- 5 seconds is sufficient for registry check but won't hang slow connections
- stderr ensures stdout remains clean for piping/scripting
- Users can always run `auq update` explicitly for full update info

**Flow:**

```typescript
// In CLI command handler
const updateCheck = checkForUpdate({ timeout: 5000 });
// Don't await - let it run in background

// If update found, it will print to stderr:
// "Update available: 2.4.0 → 2.5.0. Run `auq update` to upgrade."
```

### Decision: Fullscreen overlay for minor/major updates

**What:** Display minor and major version updates (2.4.0 → 2.5.0 or 3.0.0) in a fullscreen TUI overlay, pausing the current workflow.

**Why:**

- Minor/major updates may include breaking changes requiring user attention
- Fullscreen allows displaying changelog and clear action buttons
- Major versions show warning badge about potential breaking changes
- "Skip this version" and "Remind me later" options give user control

**UI Layout:**

```
┌─────────────────────────────────────────┐
│           Update Available              │
│                                         │
│   Current: 2.4.0  →  Latest: 2.5.0      │
│                                         │
│   ┌─────────────────────────────────┐   │
│   │ ## What's New in v2.5.0         │   │
│   │                                 │   │
│   │ - New feature A                 │   │
│   │ - Bug fix for issue #123        │   │
│   │ ...                             │   │
│   └─────────────────────────────────┘   │
│                                         │
│   [Yes]  [Skip this version]  [Later]   │
└─────────────────────────────────────────┘
```

### Decision: Header badge for non-intrusive notification

**What:** Show a small update indicator in the TUI header when updates are available but not yet prompted.

**Why:**

- Provides awareness without interruption
- Visible during active sessions when fullscreen prompt would be disruptive
- Clickable/keyboard-activatable to open the fullscreen prompt

**Badge format:**

- Patch available: `↑ Update available`
- Minor/Major available: `↑ v2.5.0 available`

## Risks / Trade-offs

### Network dependency for update checks

**Risk:** Users on air-gapped or restricted networks cannot check for updates.
**Mitigation:**

- Graceful degradation - TUI/CLI work normally without network
- Cached results allow offline awareness of previously discovered updates
- `NO_UPDATE_NOTIFIER=1` completely disables network checks

### GitHub API rate limiting

**Risk:** Unauthenticated GitHub API is limited to 60 requests/hour per IP.
**Mitigation:**

- Changelogs are cached and only fetched once per version
- Rate limit errors show version-only display with link to GitHub
- Changelog is "best effort" - not critical for update functionality

### Package manager detection failure

**Risk:** Auto-detection may fail in exotic environments, leading to wrong install command.
**Mitigation:**

- Clear fallback to `npm` which is universally available
- Error messages include copyable manual command with correct package name
- `auq update` shows detected package manager before confirming

### Background update interruption

**Risk:** Patch auto-update could fail or leave installation in inconsistent state.
**Mitigation:**

- Only run at startup, not during active work
- Show clear error message with manual fallback command
- Installation is atomic (package managers handle this)

### Version comparison edge cases

**Risk:** Prerelease versions (2.5.0-beta.1) or build metadata may not compare correctly.
**Mitigation:**

- Compare only numeric major.minor.patch components
- Prerelease versions are treated as "newer" than their release (e.g., 2.5.0-beta < 2.5.0)
- Document that auto-update targets latest stable release only

### TUI state complexity

**Risk:** Update overlay and background checker add complexity to TUI state management.
**Mitigation:**

- Update state is isolated in a context/provider pattern
- Background checker is started only once at TUI mount
- Clean unmounting stops intervals to prevent memory leaks

## Migration Plan

### Implementation Order

1. **Core Update Module** (`src/update/`)
   - `types.ts` - Define interfaces
   - `version.ts` - Semver comparison utilities
   - `cache.ts` - Cache read/write operations
   - `package-manager.ts` - Detection logic
   - `checker.ts` - UpdateChecker class with memoized promises
   - `changelog.ts` - GitHub Releases API integration
   - `installer.ts` - Package manager spawn execution
   - `index.ts` - Public API exports

2. **Config Integration**
   - Add `updateCheck: boolean` to `src/config/types.ts` AUQConfigSchema
   - Default to `true` in config loader

3. **CLI Integration**
   - Create `src/cli/commands/update.ts` - Full interactive update command
   - Modify `src/cli/cli.ts` - Add update command, inject notification for other commands

4. **TUI Integration**
   - Create `src/tui/components/UpdateOverlay.tsx` - Fullscreen update prompt
   - Create `src/tui/components/UpdateBadge.tsx` - Header indicator
   - Modify `src/tui/TUI.tsx` - Add UpdateChecker provider, integrate overlay in layout
   - Modify header component - Add conditional UpdateBadge rendering

5. **Testing**
   - Unit tests for version comparison
   - Unit tests for package manager detection
   - Manual testing in bun/npm/yarn/pnpm environments

### Rollback Strategy

If critical issues are discovered:

1. Set `updateCheck: false` in config to disable all automatic checks
2. Environment variable `NO_UPDATE_NOTIFIER=1` immediately disables features
3. Can release patch version removing the feature if necessary

### Breaking Change Considerations

None - all features are additive with opt-out mechanisms:

- Config option defaults to enabled but can be disabled
- Environment variables respected for CI/disabling
- Manual `auq update` command always works regardless of settings

## Open Questions

1. **Changelog caching duration:** How long should we cache GitHub release notes? Current proposal caches indefinitely until a newer version is found, but we may want TTL for updated release notes.

2. **Update check frequency:** Is 1 hour (3600000ms) the right interval for background checks? Too frequent wastes resources; too infrequent delays update awareness.

3. **Progress display during patch auto-update:** Should we show a progress bar/spinner during background installation, or just a completion notice? Bun/npm don't provide easy progress streaming.

4. **Major version breaking change detection:** Should we attempt to parse GitHub release notes for "BREAKING CHANGE" indicators and show enhanced warnings?

5. **Concurrent update prevention:** If user runs `auq update` while TUI is auto-updating a patch, how do we handle the conflict? (Likely: detect lock file or process and show "update in progress" message)

6. **Windows compatibility:** Package manager detection on Windows may need different logic for executable paths. Need testing on Windows environments.

## Module Architecture

```
src/update/
├── index.ts              # Public API exports
├── checker.ts            # UpdateChecker class - periodic check logic, npm registry fetch
├── cache.ts              # Cache management - read/write ~/.config/auq/update-check.json
├── version.ts            # Semver comparison utilities (patch/minor/major detection)
├── package-manager.ts    # Package manager detection (bun/npm/yarn/pnpm)
├── installer.ts          # Update installation execution (spawn package manager)
├── changelog.ts          # GitHub Releases API fetch + cache + rate limit fallback
└── types.ts              # TypeScript interfaces for update system

src/cli/commands/update.ts  # `auq update` CLI command handler

src/tui/components/
├── UpdateOverlay.tsx       # Fullscreen update prompt (minor/major)
└── UpdateBadge.tsx         # Header update indicator badge
```

## Data Flow

### Startup Flow (TUI)

```
TUI Start
  ↓
Read Cache (~/.config/auq/update-check.json)
  ↓
Cache Fresh? ──Yes──→ Check if update available in cache
  ↓ No                   ↓
Fetch npm registry    Patch? ──Yes──→ Auto-install in background
  ↓                      ↓ No
Update cache       Minor/Major? ──Yes──→ Show overlay
  ↓                      ↓ No
Start periodic      No update → Continue normally
checker (1hr)       Show badge if available
```

### CLI Command Flow

```
CLI Command (e.g., auq ask)
  ↓
Fire-and-forget update check (5s timeout)
  ↓
Execute main command immediately
  ↓
If update found (async) → Print to stderr:
"Update available: 2.4.0 → 2.5.0. Run `auq update` to upgrade."
```

### Manual Update Flow

```
auq update
  ↓
Fetch npm registry (blocking, with spinner)
  ↓
Compare versions
  ↓
Already latest? ──Yes──→ "Already up to date"
  ↓ No
Fetch changelog from GitHub
  ↓
Display info + changelog
  ↓
User confirms
  ↓
Detect package manager
  ↓
Spawn install command
  ↓
Success → "Update complete, please restart auq"
Failure → Error message + manual command
```
