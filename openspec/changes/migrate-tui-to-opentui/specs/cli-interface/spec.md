## ADDED Requirements

### Requirement: Renderer Configuration

The system SHALL support a `renderer` configuration option for selecting the TUI rendering engine.

#### Scenario: OpenTUI renderer via config file

- **WHEN** .auqrc.json contains `"renderer": "opentui"`
- **THEN** the TUI SHALL use the OpenTUI renderer
- **AND** the OpenTUI renderer SHALL be initialized on TUI startup

#### Scenario: Ink renderer as default

- **WHEN** .auqrc.json contains `"renderer": "ink"`
- **OR** the renderer key is missing from the config
- **THEN** the TUI SHALL use the ink renderer (default)
- **AND** existing ink-based behavior SHALL be preserved

#### Scenario: Environment variable override

- **WHEN** AUQ_RENDERER environment variable is set (e.g., `AUQ_RENDERER=opentui`)
- **THEN** it SHALL override the config file value
- **AND** the value from the environment variable SHALL take precedence

#### Scenario: OpenTUI fallback on initialization failure

- **WHEN** renderer is set to "opentui" and OpenTUI fails to initialize
- **THEN** the system SHALL fall back to ink with a warning logged to stderr
- **AND** the TUI SHALL continue functioning with ink renderer
- **AND** the fallback SHALL be transparent to the user (no crash)

#### Scenario: Config set renderer command

- **WHEN** user runs `auq config set renderer opentui`
- **THEN** the renderer preference SHALL be persisted to `.auqrc.json`
- **AND** the value SHALL be validated against allowed values ("ink", "opentui")

#### Scenario: Config get renderer command

- **WHEN** user runs `auq config get renderer`
- **THEN** the current renderer setting SHALL be displayed
- **AND** the effective value (after environment variable override) SHALL be shown
- **AND** if no explicit setting exists, "ink (default)" SHALL be displayed

---

## MODIFIED Requirements

### Requirement: Configuration File Loading

The system SHALL load configuration from JSON files including stale detection settings and renderer configuration.

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

#### Scenario: Renderer configuration in config file

- **WHEN** a `.auqrc.json` file contains a `renderer` key with value "ink" or "opentui"
- **THEN** the value SHALL be loaded and validated
- **AND** invalid renderer values SHALL trigger a warning with fallback to "ink"
- **AND** the renderer setting SHALL be stored in the merged configuration object

#### Scenario: Renderer config precedence

- **WHEN** both local and global config files contain renderer settings
- **THEN** local settings SHALL override global settings
- **AND** the AUQ_RENDERER environment variable SHALL override both
