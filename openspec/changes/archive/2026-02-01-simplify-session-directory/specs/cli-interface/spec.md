# CLI Interface Delta: Simplify Session Directory Detection

## MODIFIED Requirements

### Requirement: Session Directory Detection

The system SHALL use a simplified session directory detection that always resolves to global XDG-compliant paths.

#### Scenario: Global Path Resolution

- **WHEN** AUQ CLI or TUI resolves the session directory
- **THEN** the system SHALL use the same global XDG-compliant path regardless of where AUQ is installed
- **AND** the path SHALL be:
  - macOS: `~/Library/Application Support/auq/sessions`
  - Linux: `~/.local/share/auq/sessions` (or `$XDG_DATA_HOME/auq/sessions`)
  - Windows: `%APPDATA%\auq\sessions`

#### Scenario: Environment Override

- **WHEN** `AUQ_SESSION_DIR` environment variable is set
- **THEN** the system SHALL use the specified directory instead of the default
- **AND** the system SHALL expand `~` to the user's home directory

#### Scenario: Removed Local Installation Detection

- **WHEN** AUQ is installed locally in a project's `node_modules`
- **THEN** the system SHALL NOT use project-relative `.auq/sessions` directory
- **AND** the system SHALL use the same global path as a global installation

---

## REMOVED Requirements

### Requirement: Local Installation Session Path

**Reason**: Local installation mode detection (`detectInstallMode()`) causes coordination problems between MCP server and CLI when installed in different locations. Removing this feature simplifies the codebase and ensures all components always use the same session directory.

**Migration**: Users with existing local `.auq/sessions` directories can manually delete them. Sessions will now be stored in the global XDG path.
