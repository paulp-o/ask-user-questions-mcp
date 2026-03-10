## ADDED Requirements

### Requirement: Update CLI Command

The system SHALL provide a CLI command to manually check for and install updates.

#### Scenario: Check and install updates interactively

- **WHEN** user runs `auq update`
- **THEN** the system SHALL:
  1. Query npm registry for the latest version of `auq-mcp-server`
  2. Compare with currently installed version
  3. If newer version exists, display version info (current → latest) and changelog
  4. Prompt user for confirmation to install
  5. On confirmation, auto-detect package manager and run install command
  6. Display progress during installation
  7. On success, display "Update complete, please restart auq" and exit
  8. On failure, display error message with copyable manual update command

#### Scenario: Skip confirmation with -y flag

- **WHEN** user runs `auq update -y`
- **THEN** the system SHALL skip confirmation prompt
- **AND** proceed directly to installation if update is available

#### Scenario: No update available

- **WHEN** user runs `auq update` and current version is already latest
- **THEN** the system SHALL display "Already up to date" message
- **AND** exit with code 0

#### Scenario: Update command with network error

- **WHEN** npm registry query fails (network error, timeout)
- **THEN** the system SHALL display "Unable to check for updates" message
- **AND** exit with non-zero code
- **AND** NOT attempt installation

---

### Requirement: CLI Update Notification

The system SHALL display update notifications for non-TUI CLI commands.

#### Scenario: One-line update notification

- **WHEN** user runs non-TUI commands like `auq ask`, `auq sessions`, `auq answer`, `auq config`
- **AND** a newer version is available
- **AND** update check is not disabled via config or environment
- **THEN** the system SHALL print a one-line message to stderr:
  - Format: "Update available: {current} → {latest}. Run `auq update` to upgrade."
- **AND** the message SHALL NOT block command execution
- **AND** the message SHALL NOT affect command output (stdout)

#### Scenario: No notification in CI environments

- **WHEN** `CI=true` environment variable is set
- **THEN** the system SHALL NOT display update notifications
- **AND** SHALL NOT perform update checks

#### Scenario: No notification with NO_UPDATE_NOTIFIER

- **WHEN** `NO_UPDATE_NOTIFIER=1` environment variable is set
- **THEN** the system SHALL NOT display update notifications
- **AND** SHALL NOT perform update checks

#### Scenario: No notification in test environment

- **WHEN** `NODE_ENV=test` environment variable is set
- **THEN** the system SHALL NOT display update notifications
- **AND** SHALL NOT perform update checks

---

### Requirement: Update Configuration Option

The system SHALL support disabling automatic update checks via configuration.

#### Scenario: Disable update checks via config

- **WHEN** config specifies `updateCheck: false`
- **THEN** the system SHALL NOT perform automatic update checks
- **AND** SHALL NOT display update notifications in CLI
- **AND** SHALL NOT show update prompts in TUI
- **AND** the `auq update` command SHALL still work when invoked manually

#### Scenario: Default update check enabled

- **WHEN** no config file exists or `updateCheck` key is missing
- **THEN** the system SHALL default to `updateCheck: true`
- **AND** automatic update checks SHALL be enabled

#### Scenario: Config schema validation

- **WHEN** reading `updateCheck` configuration value
- **THEN** the system SHALL validate it as a boolean
- **AND** invalid values SHALL trigger a warning with fallback to default (true)
