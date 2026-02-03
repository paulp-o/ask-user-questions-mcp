# TUI Application - Native Notifications Delta

## REMOVED Requirements

### Requirement: OSC Desktop Notifications

**Reason**: Replaced with OS-native notifications for universal platform support. OSC-based notifications only worked in specific terminal emulators.

**Migration**: Use new "OS-Native Desktop Notifications" requirement instead.

---

## ADDED Requirements

### Requirement: OS-Native Desktop Notifications

The system SHALL send desktop notifications via OS-native APIs (node-notifier) when new questions arrive.

#### Scenario: Notification on new session

- **WHEN** a new session is added to the queue
- **AND** `notifications.enabled` is `true` in config (default)
- **THEN** the system SHALL send a native OS notification
- **AND** the notification title SHALL be `AUQ`
- **AND** the notification message SHALL be `{N} new question(s) waiting` where N is the count

#### Scenario: macOS notification

- **WHEN** running on macOS (`process.platform === 'darwin'`)
- **THEN** the system SHALL use node-notifier's NotificationCenter backend
- **AND** no additional configuration SHALL be required

#### Scenario: Windows notification

- **WHEN** running on Windows (`process.platform === 'win32'`)
- **THEN** the system SHALL use node-notifier's WindowsToaster backend
- **AND** the system SHALL set `appID` to `'com.auq.mcp'` for Action Center persistence

#### Scenario: Linux notification

- **WHEN** running on Linux (`process.platform === 'linux'`)
- **THEN** the system SHALL use node-notifier's NotifySend backend
- **AND** the system SHALL require `notify-send` binary (from libnotify-bin package)

#### Scenario: Notification failure handling

- **WHEN** node-notifier fails to send a notification
- **THEN** the system SHALL log a warning message once
- **AND** the system SHALL continue operating without notifications
- **AND** the system SHALL NOT crash or throw errors to the user

---

### Requirement: Linux Dependency Detection

The system SHALL detect missing Linux notification dependencies at startup.

#### Scenario: notify-send available

- **WHEN** running on Linux
- **AND** `notify-send` binary is found in PATH
- **THEN** the system SHALL proceed normally without warnings

#### Scenario: notify-send missing

- **WHEN** running on Linux
- **AND** `notify-send` binary is NOT found in PATH
- **THEN** the system SHALL log a warning at startup
- **AND** the warning SHALL include: `notify-send not found. Install libnotify-bin for desktop notifications.`
- **AND** the system SHALL continue operating without notifications

#### Scenario: Non-Linux platforms

- **WHEN** running on macOS or Windows
- **THEN** the system SHALL NOT perform dependency checks
- **AND** notifications SHALL work without additional system dependencies

---

### Requirement: Notification Icon

The system SHALL support a custom notification icon.

#### Scenario: Icon file exists

- **WHEN** an icon file exists at `src/tui/notifications/assets/icon.png`
- **THEN** the system SHALL use that icon in native notifications
- **AND** the icon path SHALL be resolved as an absolute path

#### Scenario: Icon file missing

- **WHEN** no icon file exists at the expected path
- **THEN** the system SHALL use the OS default notification icon
- **AND** no error or warning SHALL be logged

---

## MODIFIED Requirements

### Requirement: Notification Sound

The system SHALL support configurable notification sounds via OS-native sound settings.

#### Scenario: Sound enabled (default)

- **WHEN** `notifications.sound` is `true` (default)
- **THEN** the system SHALL set `sound: true` in node-notifier options
- **AND** the OS SHALL play its default notification sound

#### Scenario: Sound disabled

- **WHEN** `notifications.sound` is `false`
- **THEN** the system SHALL set `sound: false` in node-notifier options
- **AND** no sound SHALL be played

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
- **THEN** the system SHALL NOT send any native notifications
- **AND** the system SHALL NOT show progress bar (unchanged behavior)
