# CLI Interface Capability

Provides the command-line interface for AUQ including the TUI launcher, MCP server command, and direct ask command.

## Overview

The CLI serves as the primary entry point for users and integrations. It supports multiple modes of operation: interactive TUI for answering questions, MCP server mode for AI client integration, and direct CLI mode for programmatic use.

**Key Files:**

- `bin/auq.tsx` - Main CLI entry point
- `bin/tui-app.tsx` - TUI application launcher

---

## Requirements

### Requirement: Help Command

The system SHALL display comprehensive help information when requested.

#### Scenario: Help Flag

- **WHEN** user runs `auq --help` or `auq -h`
- **THEN** the system SHALL display:
  - Available commands (default, server, ask)
  - Command-line options
  - Usage examples
  - Link to documentation
- **AND** exit with code 0

---

### Requirement: Version Command

The system SHALL display version information when requested.

#### Scenario: Version Flag

- **WHEN** user runs `auq --version` or `auq -v`
- **THEN** the system SHALL display the package version from package.json
- **AND** exit with code 0

#### Scenario: Version Fallback

- **WHEN** package.json cannot be read
- **THEN** the system SHALL display a hardcoded fallback version

---

### Requirement: Default TUI Mode

The system SHALL launch the interactive TUI when run without arguments.

#### Scenario: TUI Launch

- **WHEN** user runs `auq` with no arguments
- **THEN** the system SHALL:
  1. Set `NODE_ENV` to "production" if not set
  2. Import and launch the TUI application
  3. Clear the terminal before rendering

#### Scenario: TUI Initialization

- **WHEN** the TUI launches
- **THEN** it SHALL:
  - Ensure session directory exists
  - Load any pending sessions
  - Start watching for new sessions
  - Display the waiting screen if no pending sessions

---

### Requirement: Server Command

The system SHALL start the MCP server when the server command is used.

#### Scenario: Server Start

- **WHEN** user runs `auq server`
- **THEN** the system SHALL:
  1. Import the MCP server module
  2. Start the server with stdio transport
  3. Keep the process alive indefinitely

#### Scenario: Server Communication

- **WHEN** the server is running
- **THEN** it SHALL communicate via stdin/stdout
- **AND** not output any non-JSON content to stdout

---

### Requirement: Ask Command

The system SHALL provide a direct CLI interface for asking questions without MCP.

#### Scenario: Ask with JSON Argument

- **WHEN** user runs `auq ask '{"questions": [...]}'`
- **THEN** the system SHALL:
  1. Parse the JSON input
  2. Validate the questions
  3. Create a session
  4. Wait for user response
  5. Output formatted response to stdout

#### Scenario: Ask with Piped Input

- **WHEN** user pipes JSON to `auq ask`
- **THEN** the system SHALL read from stdin
- **AND** process the questions as if provided as argument

#### Scenario: Ask Input Validation

- **WHEN** the JSON is invalid or missing required fields
- **THEN** the system SHALL:
  - Output error message to stderr
  - Exit with code 1

#### Scenario: Ask Status Messages

- **WHEN** processing a question set via ask command
- **THEN** status messages SHALL be output to stderr
- **AND** only the formatted response SHALL be output to stdout

---

### Requirement: Session Directory Detection

The system SHALL auto-detect the appropriate session directory based on installation mode.

#### Scenario: Global Installation

- **WHEN** AUQ is installed globally
- **THEN** sessions SHALL be stored in the XDG-compliant system path:
  - macOS: `~/Library/Application Support/auq/sessions`
  - Linux: `~/.local/share/auq/sessions`
  - Windows: `%APPDATA%\auq\sessions`

#### Scenario: Local Installation

- **WHEN** AUQ is installed locally in a project
- **THEN** sessions SHALL be stored in `{projectRoot}/.auq/sessions`

#### Scenario: Environment Override

- **WHEN** `AUQ_SESSION_DIR` environment variable is set
- **THEN** the system SHALL use the specified directory

---

### Requirement: Graceful Shutdown

The system SHALL handle shutdown signals gracefully.

#### Scenario: SIGINT Handling

- **WHEN** user presses Ctrl+C in TUI mode
- **THEN** the system SHALL:
  - Exit the TUI cleanly
  - Display goodbye message
  - Exit with code 0

---

## Technical Design

### Command Routing

```typescript
const command = args[0];

if (command === "--help" || command === "-h") {
  /* ... */
}
if (command === "--version" || command === "-v") {
  /* ... */
}
if (command === "server") {
  /* ... */
}
if (command === "ask") {
  /* ... */
}
// Default: Launch TUI
```

### Ask Command Flow

```typescript
const sessionManager = new SessionManager({ baseDir: sessionDir });
await sessionManager.initialize();

const { formattedResponse, sessionId } = await sessionManager.startSession(
  questions,
  callId,
);

console.log(formattedResponse); // stdout only
```

---

## Dependencies

- `bin/tui-app.tsx` - TUI application
- `src/server.ts` - MCP server
- `src/session/SessionManager.ts` - Session management
- `src/session/utils.ts` - Directory detection utilities
