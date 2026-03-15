# AUQ Web Service Technical Design

## System Architecture

The AUQ Web Service implements a two-repository architecture to separate concerns and enable independent deployment:

### Repository Structure

- **ask-user-questions-mcp** (this repo): Core MCP server, shared types, web adapter client
- **auq-web-platform** (separate repo): SvelteKit application with API routes, frontend, and database

### Shared Components

- `@paulp-o/auq-shared`: NPM package containing schemas, session types, and response formats
- Type-safe interfaces ensure consistency between MCP server and web platform

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

- Configuration option: `mode: 'local' | 'web'` (default: 'local')
- When `mode: 'web'`, instantiate `WebSessionManager` instead of `SessionManager`
- Automatic fallback to local mode if web API returns 5xx errors or timeouts
- Environment variable configuration: `AUQ_WEB_API_URL`, `AUQ_WEB_API_KEY`
- Graceful degradation without breaking existing local functionality

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