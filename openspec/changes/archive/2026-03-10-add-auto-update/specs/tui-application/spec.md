## ADDED Requirements

### Requirement: Background Update Checker

The system SHALL periodically check for updates while the TUI is running.

#### Scenario: Periodic update check

- **WHEN** the TUI application starts
- **AND** `updateCheck` config is not disabled
- **AND** not running in CI or non-TTY environment
- **THEN** the system SHALL:
  1. Check npm registry for latest version on startup
  2. Schedule periodic checks every 1 hour (3600000ms) using setInterval
  3. Cache check results in `~/.config/auq/update-check.json`
  4. Use memoized promise to prevent duplicate concurrent checks
  5. Silently fail on network errors (log to stderr only)

#### Scenario: Skip check when disabled

- **WHEN** `NO_UPDATE_NOTIFIER=1` or `CI=true` or `NODE_ENV=test` or non-TTY
- **THEN** the system SHALL NOT start the background update checker
- **AND** SHALL NOT perform any update checks

#### Scenario: Network timeout handling

- **WHEN** checking npm registry for updates
- **THEN** the request SHALL timeout after 5 seconds
- **AND** on timeout, the check SHALL fail silently
- **AND** the cached result SHALL remain unchanged

---

### Requirement: Patch Auto-Update

The system SHALL automatically install patch version updates without user confirmation.

#### Scenario: Auto-install patch updates on startup

- **WHEN** a patch update is detected at TUI startup (e.g., 2.4.0 → 2.4.1)
- **THEN** the system SHALL:
  1. Start background installation automatically (no confirmation needed)
  2. Show progress indicator in TUI footer or small overlay
  3. Auto-detect package manager (bun, npm, yarn, pnpm)
  4. On completion, display "Update complete, please restart auq" message
  5. Continue normal TUI operation until user chooses to restart

#### Scenario: Package manager detection

- **WHEN** auto-installing a patch update
- **THEN** the system SHALL detect package manager by checking:
  1. `process.env.npm_execpath` and `process.env.npm_config_user_agent`
  2. Executable path of current process
  3. Global installation location
- **AND** fall back to `npm` if detection fails

#### Scenario: Patch auto-update failure

- **WHEN** patch auto-update installation fails
- **THEN** the system SHALL:
  1. Display non-blocking error message in footer
  2. Include copyable manual update command
  3. Continue normal TUI operation
  4. Log full error details to stderr

---

### Requirement: Minor/Major Update Prompt

The system SHALL display a fullscreen update prompt for minor and major version updates.

#### Scenario: Fullscreen update overlay

- **WHEN** a minor or major update is detected (e.g., 2.4.0 → 2.5.0 or 2.4.0 → 3.0.0)
- **AND** the TUI is at a natural breakpoint (not in active question session)
- **THEN** the system SHALL display a fullscreen overlay with:
  - Title: "Update Available"
  - Current version and latest version (e.g., "2.4.0 → 2.5.0")
  - Changelog from GitHub Releases API (rendered as Markdown)
  - ⚠️ Warning badge for major version updates: "Breaking changes may be included"
  - Three action options: "Yes" (update now), "Skip this version", "Remind me later"

#### Scenario: Changelog rendering

- **WHEN** displaying the update overlay
- **AND** GitHub Releases API returns changelog data
- **THEN** the system SHALL render the changelog using existing Markdown renderer
- **AND** apply theme-aware colors to the rendered content

#### Scenario: GitHub API rate limit fallback

- **WHEN** GitHub Releases API returns rate limit error (403)
- **THEN** the system SHALL:
  1. Display version info only (without changelog)
  2. Show link to GitHub releases page
  3. Still present update options (Yes/Skip/Remind)

#### Scenario: Defer prompt during active session

- **WHEN** a minor/major update is detected
- **AND** user is actively answering questions (not on session list)
- **THEN** the system SHALL:
  1. Show a small update badge in the header (e.g., "↑ Update available")
  2. NOT interrupt the current session with fullscreen prompt
  3. Display fullscreen prompt after user completes or exits the session

#### Scenario: Skip this version

- **WHEN** user selects "Skip this version" option
- **THEN** the system SHALL:
  1. Store the skipped version in `~/.config/auq/update-check.json`
  2. Close the update overlay
  3. NOT show update prompt for that specific version again
  4. If a newer version comes out, show prompt again

#### Scenario: Remind me later

- **WHEN** user selects "Remind me later" option
- **THEN** the system SHALL:
  1. Close the update overlay
  2. NOT show update prompt again until next TUI session (restart)
  3. Continue showing header badge if applicable

#### Scenario: Update now

- **WHEN** user selects "Yes" (update now) option
- **THEN** the system SHALL:
  1. Show progress overlay with installation status
  2. Auto-detect package manager and run install command
  3. On success, display "Update complete, please restart auq" and exit
  4. On failure, display error overlay with copyable manual command

---

### Requirement: Update Cache Management

The system SHALL cache update check results to minimize network requests.

#### Scenario: Cache file location

- **WHEN** caching update check results
- **THEN** the system SHALL store data in `~/.config/auq/update-check.json`
- **AND** on Linux, respect `$XDG_CONFIG_HOME` if set

#### Scenario: Cache data structure

- **WHEN** writing to update cache
- **THEN** the system SHALL store:
  - `lastCheck`: timestamp of last successful check
  - `latestVersion`: latest version found on npm
  - `skippedVersion`: version user chose to skip (if any)
  - `checkIntervalMs`: interval between checks (3600000ms)

#### Scenario: Cache expiration

- **WHEN** reading from update cache
- **AND** cache is older than 1 hour
- **THEN** the system SHALL perform a fresh check
- **AND** update the cache with new results

#### Scenario: Cache read on startup

- **WHEN** TUI starts
- **THEN** the system SHALL read cached version info first
- **AND** display update prompt immediately if cached data indicates update available
- **AND** trigger background refresh of cache
