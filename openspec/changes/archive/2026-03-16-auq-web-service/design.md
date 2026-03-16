# AUQ Web Service Technical Design

## System Architecture

The AUQ Web Service implements a two-repository architecture to separate concerns and enable independent deployment:

### Repository Structure

#### Main Repository (ask-user-questions-mcp)

- Core MCP server, shared types, web adapter client
- Contains all open-source code for local and web modes
- Includes `packages/shared` (`@paulp-o/auq-shared`) published to npm

#### Web Platform Integration

- **auq-web-platform** repository: Private GitHub repo containing SvelteKit application (API routes, frontend, PWA, database)
- Integrated as a **git submodule** at `platforms/web/` in this main repository
- The `platforms/web/` directory is added to `.gitignore` to keep the main repo clean for open source distribution
- Private web platform uses `@paulp-o/auq-shared` as a regular npm dependency

### Shared Components

- `@paulp-o/auq-shared`: NPM package containing schemas, session types, and response formats
  - Published to npm registry for cross-repository type sharing
  - Allows private web platform to access shared types without duplicating code
- Type-safe interfaces ensure consistency between MCP server and web platform
- This approach keeps the main repository fully open source while the hosted web platform remains private

## This Repository Changes

### packages/shared

Extract and package core types and schemas into a reusable NPM package:

- `src/schemas.ts`: OptionSchema, QuestionSchema, AskUserQuestionsParametersSchema
- `src/session/types.ts`: SessionStatus, SessionRequest, UserAnswer, SESSION_FILES
- `src/response/format.ts`: Response formatting utilities
- Package configuration for publishing to NPM registry

### packages/web-adapter

HTTP client implementation that replaces file-based IPC with web API calls:

- `WebSessionManager` class implementing same interface as `SessionManager`
- HTTP client with configurable base URL, API key, and timeout settings
- Polling logic: GET /api/v1/questions/:id every 2-5 seconds with configurable interval
- AbortSignal propagation for request cancellation
- Error handling with fallback to local mode on API unavailability
- Request/response mapping between HTTP API and internal session format

### MCP Server Modifications

- **Automatic mode detection**: If `api_key` is present (via env vars, project `.auqrc`, or home `~/.auqrc`), mode is automatically set to `'web'`. Otherwise, mode defaults to `'local'`.
- **Configuration loading**: Server calls config loader on startup to read `api_key` and `api_url` using the priority order defined in the Configuration System section
- **Web mode activation**: When `api_key` is detected, instantiate `WebSessionManager` instead of `SessionManager`
- **Default hosted URL**: If `api_key` is provided without `api_url`, automatically use `https://auq.paulp.dev`
- **Automatic fallback to local mode**: If web API returns 5xx errors, timeouts, or connection failures, fall back to local TUI mode with automatic retry
- **Graceful degradation**: Existing local functionality remains unaffected; users without `api_key` continue using TUI mode by default

## Configuration System

### `.auqrc` File Format

Configuration is stored in a `.auqrc` file that can exist at:

1. **Project-level**: `./.auqrc` (highest priority)
2. **Home directory**: `~/.auqrc` (fallback)

**Format**: JSON

```json
{
  "api_key": "auq_sk_xxxxxxxxxxxx",
  "api_url": "https://auq.example.com",
  "mode": "web"
}
```

All fields are optional. When only `api_key` is provided, the default hosted URL (`https://auq.paulp.dev`) is automatically used.

### Config Resolution Order

Configuration is resolved in the following priority order (highest to lowest):

1. **Environment Variables** (highest priority)
   - `AUQ_WEB_MODE` → mode
   - `AUQ_WEB_API_KEY` → api_key
   - `AUQ_WEB_API_URL` → api_url

2. **Project-level `.auqrc`** (if `./.auqrc` exists)
   - Parsed JSON configuration

3. **Home directory `.auqrc`** (if `~/.auqrc` exists)
   - Parsed JSON configuration

4. **Defaults** (lowest priority)
   - mode: `'local'`
   - api_url: `'https://auq.paulp.dev'` (only if api_key is provided)

### CLI Configuration Management

The `auq config` command provides an interface for managing configuration:

```bash
# Set configuration values
auq config set api_key <key>          # Store API key
auq config set api_url <url>          # Store custom API URL
auq config set mode <local|web>       # Set operation mode

# Read configuration values
auq config get api_key                # Read current API key
auq config get api_url                # Read current API URL
auq config get mode                   # Read current mode

# List all configuration
auq config list                       # Show all configuration (masks sensitive values)

# Reset to defaults
auq config reset                      # Remove .auqrc file from project
```

By default, `auq config set` modifies the project-level `.auqrc`. Use `--global` flag to modify `~/.auqrc`:

```bash
auq config set --global api_key <key>
```

### Cross-Surface Configuration

The same configuration source is used across all AUQ surfaces:

- **MCP Server**: Reads config on startup to determine mode and API settings
- **CLI Tool**: Uses config for web mode operations
- **Agent Skills**: Read config when invoked to access current settings

This ensures consistent behavior regardless of how AUQ is invoked.

### Default Hosted URL Behavior

When users provide an `api_key` without an `api_url`:

- System automatically uses the default hosted instance: `https://auq.paulp.dev`
- No additional configuration needed for hosted use
- Self-hosters must explicitly provide `api_url` via `.auqrc` or environment variable

## Web Platform (Separate Repository)

### Technology Stack

- **Framework**: SvelteKit for unified API routes and frontend
- **Database**: SQLite with Drizzle ORM (self-hosting friendly)
- **Deployment**: Serverless-compatible (Vercel, Cloudflare Pages)
- **Real-time**: Server-Sent Events (SSE) for browser updates
- **Notifications**: Web Push API with VAPID keys + polling fallback
- **PWA**: Service Worker, Web App Manifest, offline capabilities

### Project Structure

```
auq-web-platform/
├── src/
│   ├── app.html
│   ├── app.d.ts
│   ├── lib/
│   │   ├── db/
│   │   │   ├── schema.ts
│   │   │   ├── client.ts
│   │   │   └── migrations/
│   │   ├── auth/
│   │   │   ├── api-key.ts
│   │   │   └── session.ts
│   │   ├── api/
│   │   │   ├── questions.ts
│   │   │   └── push.ts
│   │   └── components/
│   ├── routes/
│   │   ├── api/v1/
│   │   │   ├── questions/
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── +server.ts
│   │   │   │   │   └── answer/
│   │   │   │   │       └── +server.ts
│   │   │   │   └── +server.ts
│   │   │   └── questions/
│   │   │       └── +server.ts
│   │   ├── app/
│   │   │   ├── inbox/
│   │   │   │   └── +page.svelte
│   │   │   ├── questions/
│   │   │   │   └── [id]/
│   │   │   │       └── +page.svelte
│   │   │   └── workspace/
│   │   │       └── +page.svelte
│   │   └── +layout.svelte
│   └── service-worker.ts
├── static/
│   ├── manifest.json
│   └── icons/
├── package.json
├── svelte.config.js
├── vite.config.js
└── drizzle.config.ts
```

### Database Schema

```sql
-- Workspaces table
CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- API Keys table
CREATE TABLE api_keys (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  key_hash TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER,
  last_used_at INTEGER,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);

-- Questions table
CREATE TABLE questions (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected', 'timed_out', 'abandoned')),
  title TEXT,
  questions_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);

-- Answers table
CREATE TABLE answers (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES questions(id),
  question_index INTEGER NOT NULL,
  selected_option TEXT,
  selected_options_json TEXT,
  custom_text TEXT,
  answered_at INTEGER NOT NULL,
  FOREIGN KEY (question_id) REFERENCES questions(id)
);

-- Push Subscriptions table
CREATE TABLE push_subscriptions (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at INTEGER NOT NULL,
  last_used_at INTEGER,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);
```

### API Endpoints Design

#### POST /api/v1/questions

- **Purpose**: Create new question set
- **Auth**: API key in `Authorization: Bearer <key>` header
- **Request Body**: `{ "questions": [...], "title": "optional" }`
- **Response**: `{ "id": "requestId", "status": "pending" }`
- **Error Handling**: 401 (invalid API key), 400 (invalid questions)

#### GET /api/v1/questions/:id

- **Purpose**: Poll question status
- **Auth**: API key required
- **Response**: `{ "status": "pending|in_progress|completed", "answers": [...] }`
- **Polling**: Agent polls every 2-5 seconds

#### GET /api/v1/questions/:id/wait

- **Purpose**: Long-poll for completion (future use)
- **Auth**: API key required
- **Response**: Blocks until status is completed or timeout

#### POST /api/v1/questions/:id/answer

- **Purpose**: Submit user answers
- **Auth**: Session-based (web UI)
- **Request Body**: `{ "answers": [{"questionIndex": 0, "selectedOption": "A"}] }`
- **Response**: `{ "success": true }`

#### GET /api/v1/questions/stream

- **Purpose**: SSE stream for real-time browser updates
- **Auth**: Session-based
- **Response**: Server-Sent Events with question updates

#### DELETE /api/v1/questions/:id

- **Purpose**: Abandon question set
- **Auth**: API key or session
- **Response**: `{ "success": true }`

### Authentication Flow

#### Agent Authentication

- API key passed in `Authorization: Bearer <api-key>` header
- Key lookup routes to specific workspace
- All questions for that key go to workspace inbox

#### Web UI Authentication

- Simple session-based auth for PWA
- Workspace selection on first visit
- Session stored in localStorage with workspace ID

### MCP Elicitation Adapter

Bidirectional format conversion between AUQ and MCP Elicitation:

#### AUQ → MCP Elicitation

- Map QuestionSchema to JSON Schema with enum options
- Convert multiSelect to array type with items
- Preserve option descriptions as schema descriptions

#### MCP Elicitation → AUQ

- Extract enum values as options
- Convert array types to multiSelect questions
- Generate titles from schema titles or property names

### Data Flow

1. **Agent Request**: MCP proxy receives ask_user_questions call
2. **Mode Check**: If mode='web', use WebSessionManager
3. **HTTP POST**: Send questions to /api/v1/questions with API key
4. **Database Storage**: Web platform stores questions in SQLite
5. **Push Notification**: Send web push to subscribed devices
6. **Browser Update**: SSE stream notifies browser of new questions
7. **User Interaction**: User answers via PWA interface
8. **Answer Storage**: Answers saved to database
9. **Agent Polling**: MCP proxy polls GET /api/v1/questions/:id
10. **Response Delivery**: Agent receives answers and continues

### Fallback Mechanisms

- **Web API Unreachable**: Automatic fallback to local TUI mode
- **Push Notification Failure**: Fallback to polling every 30 seconds
- **SSE Unavailable**: Fallback to periodic page refresh
- **Database Issues**: Graceful error handling with retry logic

### Deployment Considerations

- **Serverless**: Designed for Vercel/Cloudflare with stateless API routes
- **Database**: SQLite with file-based storage (self-hosting)
- **Scaling**: Single-user workspaces, low request volume expected
- **Security**: HTTPS required for service workers and push API
- **Performance**: Optimize polling intervals, cache API responses
