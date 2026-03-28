# web-server Specification

## Purpose

Local HTTP + WebSocket server that serves the React SPA and bridges filesystem-based session management to real-time browser communication. Runs on localhost only, started via `auq --web`.

## ADDED Requirements

### Requirement: Server Lifecycle

The web server SHALL start on `auq --web` and run until Ctrl+C.

#### Scenario: Start with auto-open

- **WHEN** user runs `auq --web`
- **THEN** the server SHALL bind to 127.0.0.1 on an auto-detected available port
- **AND** print the URL to stdout: `AUQ Web UI running at http://localhost:{port}`
- **AND** open the URL in the default browser

#### Scenario: Start without auto-open

- **WHEN** user runs `auq --web --no-open`
- **THEN** the server SHALL start but NOT open the browser
- **AND** print the URL to stdout for manual opening

#### Scenario: Custom port

- **WHEN** user runs `auq --web --port 4173`
- **THEN** the server SHALL bind to the specified port
- **AND** if the port is unavailable, SHALL exit with an error message

#### Scenario: Renderer config

- **WHEN** config specifies `renderer: "web"`
- **THEN** running `auq` (no flags) SHALL start the web server instead of TUI

#### Scenario: Graceful shutdown

- **WHEN** user presses Ctrl+C or sends SIGTERM
- **THEN** the server SHALL close all WebSocket connections
- **AND** stop the HTTP server
- **AND** exit with code 0

---

### Requirement: Static File Serving

The server SHALL serve the React SPA from the bundled dist directory.

#### Scenario: Serve SPA assets

- **WHEN** browser requests any path
- **THEN** the server SHALL check for a matching file in `packages/web-ui/dist/`
- **AND** if found, serve the file with correct MIME type
- **AND** if not found, serve `index.html` (SPA fallback)

---

### Requirement: WebSocket Connection

The server SHALL accept WebSocket connections for real-time communication.

#### Scenario: Connection established

- **WHEN** a browser connects via WebSocket
- **THEN** the server SHALL validate the Origin header (must be localhost)
- **AND** send a `system:sync` message with all pending sessions and current config

#### Scenario: Invalid origin

- **WHEN** a WebSocket upgrade request has a non-localhost Origin
- **THEN** the server SHALL reject the connection

#### Scenario: Connection limits

- **WHEN** WebSocket messages arrive
- **THEN** the server SHALL enforce a 1MB message size limit
- **AND** rate limit to 100 messages per second per connection

#### Scenario: Keepalive

- **WHEN** a WebSocket connection is idle for 30 seconds
- **THEN** the server SHALL send a `system:ping` message
- **AND** expect a `system:pong` response within 10 seconds
- **AND** if no response, close the connection

---

### Requirement: Session Bridge

The server SHALL bridge filesystem session events to WebSocket messages.

#### Scenario: New session detected

- **WHEN** EnhancedTUISessionWatcher emits `session-created` event
- **THEN** the server SHALL broadcast `session:new` to all connected clients
- **AND** the payload SHALL include the full SessionRequest

#### Scenario: List pending sessions

- **WHEN** client sends `session:list` message
- **THEN** the server SHALL return `session:list:result` with all pending sessions sorted by timestamp (FIFO)

#### Scenario: Submit answers

- **WHEN** client sends `session:answer` with sessionId and answers
- **THEN** the server SHALL call `SessionManager.saveSessionAnswers()`
- **AND** return `session:answer:result` with `{ success: true }`
- **AND** if the session was already answered (lock contention), return `{ success: false, error: "Session already answered" }`

#### Scenario: Reject session

- **WHEN** client sends `session:reject` with sessionId and optional reason
- **THEN** the server SHALL call `SessionManager.rejectSession()`
- **AND** return `session:reject:result` with `{ success: true }`

#### Scenario: Status change detection

- **WHEN** polling detects a session status change (completed, rejected, timed_out, abandoned)
- **THEN** the server SHALL broadcast `session:status` with the new status
- **AND** if the session was answered by another client (TUI), include `source: "external"`

#### Scenario: Session removed

- **WHEN** a session directory is deleted from the filesystem
- **THEN** the server SHALL broadcast `session:removed` with the sessionId

---

### Requirement: Config Bridge

The server SHALL bridge config operations to WebSocket messages.

#### Scenario: Get config

- **WHEN** client sends `config:get` with scope ("local" or "global")
- **THEN** the server SHALL read the specified config file
- **AND** return `config:get:result` with the config data and scope

#### Scenario: Set config field

- **WHEN** client sends `config:set` with key, value, and scope
- **THEN** the server SHALL validate the value against the Zod schema
- **AND** write the config file (local or global)
- **AND** return `config:set:result` with updated config
- **AND** if validation fails, return `{ success: false, errors: [...] }`

#### Scenario: Reset config

- **WHEN** client sends `config:reset` with optional key and scope
- **THEN** if key is specified, the server SHALL remove that key from the config file
- **AND** if no key, the server SHALL delete the entire config file
- **AND** return `config:reset:result` with the resolved config (defaults applied)

#### Scenario: Export config

- **WHEN** client sends `config:export` with scope
- **THEN** the server SHALL return `config:export:result` with the raw JSON string of the config file

#### Scenario: Import config

- **WHEN** client sends `config:import` with JSON string and scope
- **THEN** the server SHALL validate the JSON against the Zod schema
- **AND** write the config file
- **AND** return `config:import:result` with `{ success: true }`
- **AND** if validation fails, return `{ success: false, errors: [...] }`

---

### Requirement: History Bridge

The server SHALL provide paginated session history.

#### Scenario: List history

- **WHEN** client sends `history:list` with page, pageSize, optional status filter, optional search text
- **THEN** the server SHALL scan the session directory for all sessions (not just pending)
- **AND** filter by status if specified
- **AND** search question prompts and option labels if search text specified
- **AND** sort by creation date descending (newest first)
- **AND** return `history:list:result` with `{ sessions, total, page, pageSize }`

#### Scenario: Get history detail

- **WHEN** client sends `history:detail` with sessionId
- **THEN** the server SHALL read request.json, answers.json, and status.json
- **AND** return `history:detail:result` with all session data

---

### Requirement: Security

The server SHALL enforce localhost-only access.

#### Scenario: Binding

- **WHEN** the server starts
- **THEN** it SHALL bind to `127.0.0.1` (IPv4 loopback only)
- **AND** SHALL NOT bind to `0.0.0.0` or `::` (all interfaces)

#### Scenario: Origin validation

- **WHEN** a WebSocket upgrade request arrives
- **THEN** the server SHALL check the Origin header
- **AND** only accept connections where origin matches `http://localhost:*` or `http://127.0.0.1:*`