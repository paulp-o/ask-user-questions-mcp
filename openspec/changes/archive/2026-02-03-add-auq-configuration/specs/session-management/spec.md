# Session Management - Configuration System Delta

## ADDED Requirements

### Requirement: Session Configuration

The system SHALL use configurable values for session parameters instead of hardcoded defaults.

#### Scenario: Session Timeout from Config

- **WHEN** config specifies `sessionTimeout: 300000` (5 minutes)
- **THEN** SessionManager SHALL use this value for session timeout
- **AND** sessions exceeding this time SHALL be marked as timed_out

#### Scenario: Retention Period from Config

- **WHEN** config specifies `retentionPeriod: 86400000` (1 day)
- **THEN** cleanup SHALL remove sessions older than this period
- **AND** default 7-day retention SHALL be used if unspecified

#### Scenario: Default Configuration Fallback

- **WHEN** no config file exists or settings are unspecified
- **THEN** the system SHALL use built-in defaults:
  - maxOptions: 4
  - maxQuestions: 4
  - sessionTimeout: 0 (infinite)
  - retentionPeriod: 604800000 (7 days)
