# Session Management Delta: Simplify Session Directory

## REMOVED Requirements

### Requirement: Installation Mode Detection

**Reason**: The `detectInstallMode()` function causes coordination problems between MCP server and CLI components when they are installed in different locations (local vs global). Removing this complexity in favor of always using global XDG-compliant paths.

**Migration**: Existing sessions in global XDG paths continue working. Local `.auq/sessions` directories become orphaned and can be manually deleted by users.

---

## MODIFIED Requirements

### Requirement: Session Directory Resolution

The system SHALL resolve the session directory using a simplified two-step process.

#### Scenario: Environment Variable Override

- **WHEN** `AUQ_SESSION_DIR` environment variable is set
- **THEN** the system SHALL use the specified directory path
- **AND** expand `~` to user home directory if present

#### Scenario: Platform-Specific Default Path

- **WHEN** `AUQ_SESSION_DIR` is not set
- **THEN** the system SHALL use XDG-compliant platform-specific paths:
  - **macOS**: `~/Library/Application Support/auq/sessions`
  - **Linux**: `$XDG_DATA_HOME/auq/sessions` or `~/.local/share/auq/sessions`
  - **Windows**: `%APPDATA%\auq\sessions` or `%USERPROFILE%\auq\sessions`

#### Scenario: Directory Creation

- **WHEN** the resolved session directory does not exist
- **THEN** the system SHALL create it with permissions `0o700` (owner read/write/execute only)

#### Scenario: Consistent Resolution Across Components

- **WHEN** MCP server, CLI `ask` command, or TUI resolve session directory
- **THEN** they SHALL all use the same `getSessionDirectory()` function
- **AND** they SHALL resolve to the same path given the same environment

---

## Technical Notes

### Simplified `getSessionDirectory()` Implementation

```typescript
export function getSessionDirectory(): string {
  // Priority 1: Environment variable override
  if (process.env.AUQ_SESSION_DIR) {
    const envDir = process.env.AUQ_SESSION_DIR;
    if (envDir.startsWith("~")) {
      return join(homedir(), envDir.slice(1));
    }
    return envDir;
  }

  // Priority 2: Platform-specific XDG path
  return resolveSessionDirectory();
}
```

### Removed Code

- `detectInstallMode()` function (lines 147-180 of original utils.ts)
- Local installation detection logic
- Project-relative `.auq/sessions` path resolution

### Backward Compatibility

- Existing sessions in global XDG paths: **Fully compatible**
- Existing sessions in local `.auq/` directories: **Orphaned** (user can delete manually)
- `AUQ_SESSION_DIR` environment variable: **Still supported**
