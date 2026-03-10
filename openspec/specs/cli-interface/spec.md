# cli-interface Specification

## Purpose
TBD - created by archiving change add-auq-configuration. Update Purpose after archive.
## Requirements
### Requirement: Configuration File Loading

The system SHALL load configuration from JSON files including new stale detection settings.

#### Scenario: Stale detection configuration

- **WHEN** a `.auqrc.json` file contains `staleThreshold`, `notifyOnStale`, or `staleAction`
- **THEN** these values SHALL be loaded and validated
- **AND** invalid values SHALL trigger warnings with fallback to defaults

#### Scenario: Extended config schema validation

- **WHEN** a config file contains invalid stale detection settings
- **THEN** the system SHALL display a specific warning message
- **AND** continue with default values for the invalid settings

#### Scenario: Config precedence with new options

- **WHEN** both local and global config files contain stale detection settings
- **THEN** local settings SHALL override global settings
- **AND** all stale detection parameters SHALL follow the same precedence rules

### Requirement: Configurable Question Limits

The system SHALL respect configured limits for questions and options.

#### Scenario: Custom Max Options

- **WHEN** config specifies `maxOptions: 6`
- **THEN** the Zod schema SHALL validate options arrays with max 6 items
- **AND** AI requests exceeding this limit SHALL fail validation

#### Scenario: Custom Max Questions

- **WHEN** config specifies `maxQuestions: 6`
- **THEN** the Zod schema SHALL validate questions arrays with max 6 items

#### Scenario: Recommended Counts

- **WHEN** config specifies `recommendedOptions` or `recommendedQuestions`
- **THEN** these values SHALL be included in tool description for AI guidance

---

### Requirement: Language Configuration

The system SHALL support language settings for TUI localization.

#### Scenario: Auto Language Detection

- **WHEN** config specifies `language: "auto"` or omits language setting
- **THEN** the system SHALL detect language from:
  1. LANG environment variable
  2. System locale via Intl API
  3. Fallback to English

#### Scenario: Explicit Language Setting

- **WHEN** config specifies `language: "ko"` (or other valid language code)
- **THEN** the TUI SHALL display all text in the specified language

#### Scenario: Unsupported Language Fallback

- **WHEN** config specifies an unsupported language code
- **THEN** the system SHALL fall back to English
- **AND** display a warning about unsupported language

### Requirement: CLI Answer Command

The system SHALL provide a CLI command to answer sessions programmatically.

#### Scenario: Answer session with JSON

- **WHEN** user runs `auq answer <sessionId> --answers '{"0": {"selectedOption": "option1"}}'`
- **THEN** the answers SHALL be validated against the session's questions
- **AND** answers.json SHALL be written to the session directory
- **AND** status.json SHALL be updated to "completed"

#### Scenario: Answer validation error

- **WHEN** the provided answers JSON is invalid or incomplete
- **THEN** an error message SHALL be displayed
- **AND** the exit code SHALL be non-zero
- **AND** no files SHALL be modified

#### Scenario: Reject session via CLI

- **WHEN** user runs `auq answer <sessionId> --reject --reason "not applicable"`
- **THEN** status.json SHALL be updated to "rejected"
- **AND** the reason SHALL be stored in the status

#### Scenario: Answer abandoned session with force

- **WHEN** user attempts to answer an abandoned session
- **THEN** a warning SHALL be displayed: "AI disconnected. Use --force to answer anyway."
- **AND** when --force is provided, the answer SHALL proceed
- **AND** when --force is not provided, the command SHALL exit with error

#### Scenario: Answer command JSON output

- **WHEN** user runs `auq answer` with --json flag
- **THEN** output SHALL be valid JSON
- **AND** the JSON SHALL include: success boolean, sessionId, status

---

### Requirement: CLI Sessions List Command

The system SHALL provide a CLI command to list and manage sessions.

#### Scenario: List pending sessions (default)

- **WHEN** user runs `auq sessions list`
- **THEN** only pending sessions SHALL be displayed
- **AND** output SHALL include: sessionId, status, age, question count

#### Scenario: List with --pending flag

- **WHEN** user runs `auq sessions list --pending`
- **THEN** only pending sessions SHALL be displayed
- **AND** this SHALL be equivalent to the default behavior

#### Scenario: List with --stale flag

- **WHEN** user runs `auq sessions list --stale`
- **THEN** only stale sessions SHALL be displayed
- **AND** each entry SHALL include stale indicator

#### Scenario: List with --all flag

- **WHEN** user runs `auq sessions list --all`
- **THEN** all sessions SHALL be displayed regardless of status
- **AND** each entry SHALL include its current status

#### Scenario: Sessions list sorted by creation time

- **WHEN** sessions are listed
- **THEN** they SHALL be sorted by creation time (newest first)
- **AND** the age SHALL be displayed in human-readable format

#### Scenario: Sessions list JSON output

- **WHEN** user runs `auq sessions list` with --json flag
- **THEN** output SHALL be valid JSON array
- **AND** each element SHALL include: sessionId, status, createdAt, age, stale, questionCount

---

### Requirement: CLI Sessions Dismiss Command

The system SHALL provide a CLI command to dismiss/archive sessions.

#### Scenario: Dismiss stale session

- **WHEN** user runs `auq sessions dismiss <sessionId>`
- **AND** the session is stale
- **THEN** the session SHALL be archived to `~/.local/share/auq/archive/{sessionId}/`
- **AND** the session SHALL be removed from the active sessions directory

#### Scenario: Dismiss non-stale session requires force

- **WHEN** user attempts to dismiss a non-stale session
- **THEN** a confirmation prompt SHALL be displayed
- **AND** when --force is provided, the dismiss SHALL proceed without prompt
- **AND** when --force is not provided and user declines, the command SHALL exit

#### Scenario: Dismiss command JSON output

- **WHEN** user runs `auq sessions dismiss` with --json flag
- **THEN** output SHALL be valid JSON
- **AND** the JSON SHALL include: success boolean, sessionId, archivedTo path

---

### Requirement: CLI Config Get Command

The system SHALL provide a CLI command to read configuration values.

#### Scenario: Get all config values

- **WHEN** user runs `auq config get`
- **THEN** all configuration values SHALL be displayed
- **AND** local settings SHALL override global settings as applicable
- **AND** defaults SHALL be shown for unspecified values

#### Scenario: Get specific config value

- **WHEN** user runs `auq config get <key>` (e.g., `auq config get staleThreshold`)
- **THEN** only the specified key's value SHALL be displayed
- **AND** the effective value (after merging) SHALL be shown

#### Scenario: Config get with local and global files

- **WHEN** both local and global config files exist
- **THEN** local values SHALL take precedence
- **AND** global values SHALL be shown as fallback

#### Scenario: Config get JSON output

- **WHEN** user runs `auq config get` with --json flag
- **THEN** output SHALL be valid JSON object
- **AND** the JSON SHALL include all config keys and their effective values

---

### Requirement: CLI Config Set Command

The system SHALL provide a CLI command to write configuration values.

#### Scenario: Set config value locally

- **WHEN** user runs `auq config set <key> <value>` (e.g., `auq config set staleThreshold 3600000`)
- **THEN** the value SHALL be written to local `.auqrc.json`
- **AND** the file SHALL be created if it does not exist
- **AND** the value SHALL be validated against the schema

#### Scenario: Set config value globally

- **WHEN** user runs `auq config set <key> <value> --global`
- **THEN** the value SHALL be written to `~/.config/auq/.auqrc.json`
- **AND** the directory SHALL be created if it does not exist

#### Scenario: Set invalid config value

- **WHEN** user attempts to set an invalid value (wrong type or out of range)
- **THEN** an error message SHALL be displayed
- **AND** the exit code SHALL be non-zero
- **AND** the config file SHALL NOT be modified

#### Scenario: Set unknown config key

- **WHEN** user attempts to set an unknown configuration key
- **THEN** an error message SHALL list valid keys
- **AND** the exit code SHALL be non-zero

#### Scenario: Config set JSON output

- **WHEN** user runs `auq config set` with --json flag
- **THEN** output SHALL be valid JSON
- **AND** the JSON SHALL include: success boolean, key, value, file (local or global)

