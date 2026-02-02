# TUI Application - OSC Notifications Delta

## ADDED Requirements

### Requirement: OSC Desktop Notifications

The system SHALL send desktop notifications via OSC escape sequences when new questions arrive.

#### Scenario: Notification on new session

- **WHEN** a new session is added to the queue
- **AND** `notifications.enabled` is `true` in config (default)
- **THEN** the system SHALL send an OSC notification to the terminal
- **AND** the notification message SHALL be `AUQ: {N} new question(s)` where N is the count

#### Scenario: OSC 9 for iTerm2

- **WHEN** `TERM_PROGRAM` is `iTerm.app`
- **THEN** the system SHALL use OSC 9 format: `ESC]9;{message}BEL`

#### Scenario: OSC 99 for kitty

- **WHEN** `TERM_PROGRAM` is `kitty`
- **THEN** the system SHALL use OSC 99 format with Base64-encoded parameters
- **AND** include application name `auq` in the `f` parameter
- **AND** include notification type `im` in the `t` parameter

#### Scenario: Default protocol for unknown terminals

- **WHEN** terminal type cannot be determined
- **THEN** the system SHALL use OSC 9 format (most widely ignored by unsupported terminals)

#### Scenario: Unsupported terminal handling

- **WHEN** the terminal does not support OSC notifications
- **THEN** the system SHALL send the escape sequence anyway
- **AND** the terminal SHALL silently ignore the unrecognized sequence
- **AND** no error SHALL be shown to the user

---

### Requirement: Notification Batching

The system SHALL batch rapid notification events into a single notification.

#### Scenario: Multiple sessions arrive rapidly

- **WHEN** multiple sessions arrive within a short time window
- **THEN** the system SHALL send one notification with the total count
- **AND** the message SHALL reflect the total: `AUQ: 3 new question(s)`

---

### Requirement: OSC Progress Bar

The system SHALL show question completion progress via OSC 9 progress bar sequences.

#### Scenario: Progress bar activation

- **WHEN** the TUI begins processing a session (first question displayed)
- **AND** terminal supports OSC 9 (iTerm2 or unknown)
- **THEN** the system SHALL send progress bar sequence with current completion percentage

#### Scenario: Progress bar update

- **WHEN** the user answers a question and moves to the next
- **THEN** the system SHALL update progress bar with new percentage
- **AND** percentage SHALL be calculated as `(answeredQuestions / totalQuestions) * 100`

#### Scenario: Progress bar clearing

- **WHEN** a session is completed (answers submitted)
- **OR** a session is rejected
- **THEN** the system SHALL clear the progress bar with `ESC]9;4;0BEL`

---

### Requirement: Notification Sound

The system SHALL support configurable notification sounds.

#### Scenario: Sound enabled (default)

- **WHEN** `notifications.sound` is `true` (default)
- **AND** using OSC 99 (kitty)
- **THEN** the notification SHALL include sound parameter `s=dialog-information`

#### Scenario: Sound disabled

- **WHEN** `notifications.sound` is `false`
- **AND** using OSC 99 (kitty)
- **THEN** the notification SHALL omit the sound parameter

#### Scenario: OSC 9 sound behavior

- **WHEN** using OSC 9 (iTerm2)
- **THEN** sound behavior SHALL be controlled by the terminal's notification settings
- **AND** the application SHALL not explicitly control sound

---

### Requirement: Notification Configuration

The system SHALL support notification settings in the configuration file.

#### Scenario: Configuration schema

- **WHEN** reading notification settings
- **THEN** the system SHALL read from `.auqrc.json` under `notifications` key:
  ```json
  {
    "notifications": {
      "enabled": true,
      "sound": true
    }
  }
  ```

#### Scenario: Default configuration

- **WHEN** no config file exists or `notifications` key is missing
- **THEN** the system SHALL default to:
  - `enabled: true` (notifications on by default)
  - `sound: true` (sounds on by default)

#### Scenario: Disabled notifications

- **WHEN** `notifications.enabled` is `false`
- **THEN** the system SHALL NOT send any OSC notification sequences
- **AND** the system SHALL NOT show progress bar
