# cli-interface Specification

## Purpose
TBD - created by archiving change add-auq-configuration. Update Purpose after archive.
## Requirements
### Requirement: Configuration File Loading

The system SHALL load configuration from JSON files on startup.

#### Scenario: Local Config File

- **WHEN** a `.auqrc.json` file exists in the current working directory
- **THEN** the system SHALL load and apply settings from this file
- **AND** merge with default values for unspecified settings

#### Scenario: Global Config File

- **WHEN** no local config exists but `~/.config/auq/.auqrc.json` exists
- **THEN** the system SHALL load and apply settings from the global file

#### Scenario: Config Precedence

- **WHEN** both local and global config files exist
- **THEN** local settings SHALL override global settings
- **AND** unspecified settings SHALL fall back to defaults

#### Scenario: Invalid Config Handling

- **WHEN** a config file contains invalid JSON or invalid values
- **THEN** the system SHALL display a warning message
- **AND** continue with default values

---

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

