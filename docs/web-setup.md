# Web Dashboard Setup Guide

The `auq-mcp-server` v4.0.0 includes an optional **web dashboard** for answering MCP questions in your browser. This guide walks you through installation and configuration.

## Quick Start

### Prerequisites

- **Node.js** 18+ or **Bun** 1.1.0+
- **npm** or **bun** (Bun recommended for this project)
- **Python 3.8+** (for some dependencies)

### Installation

1. **Clone or update the repository:**

```bash
git clone https://github.com/paulp-o/ask-user-questions-mcp.git
cd ask-user-questions-mcp
```

2. **Install dependencies** (Bun):

```bash
bun install
```

Or with npm:

```bash
npm install
```

3. **Build all packages:**

```bash
bun run build
# or: npm run build
```

### Start the Web Server

From the project root:

```bash
bun run dev:web
```

Or from `packages/web/`:

```bash
cd packages/web
bun run dev
```

**Output:**

```
   ▲ Next.js 15.x.x
   - Local:        http://localhost:3000
   - Environments: .env.local

 ✓ Ready in 1.23s
```

Open **http://localhost:3000** in your browser.

---

## Architecture

```
Browser (http://localhost:3000)
    │
    ├─ REST API (/api/sessions/*)
    ├─ SSE stream (/api/sse)
    └─ HTTP MCP (/api/mcp)
            │
            ▼
    Next.js Server (PORT=3000)
            │
            ├─ SessionManager (core logic)
            ├─ SQLiteStore (database)
            └─ Drizzle ORM (schema management)
            │
            ▼
    ~/.local/share/auq/sessions.db (SQLite file)
```

---

## Configuration

### Environment Variables

Create a `.env.local` file in `packages/web/`:

```env
# Database location (default: ~/.local/share/auq/sessions.db)
DATABASE_URL="file:~/.local/share/auq/sessions.db"

# Server port (default: 3000)
PORT=3000

# Node environment
NODE_ENV=development
```

Or set them before starting:

```bash
DATABASE_URL="file:./sessions.db" PORT=3000 bun run dev:web
```

### Database File

The web server automatically:

1. Creates `~/.local/share/auq/sessions.db` on first run
2. Initializes the SQLite schema (sessions, session_history tables)
3. Imports existing file-based sessions if found

**Manual database reset:**

```bash
rm ~/.local/share/auq/sessions.db
bun run dev:web    # Creates fresh database
```

---

## Dashboard Features

### 1. **Session List** (`/`)

View all sessions in a table:

| Column     | Description                           |
| ---------- | ------------------------------------- |
| Session ID | Unique identifier                     |
| Status     | Pending, Completed, Rejected, Timeout |
| Questions  | Number of questions                   |
| Created    | Timestamp                             |
| Actions    | View, Delete                          |

**Filters**: Toggle between All / Pending / Completed / Rejected statuses.

**Real-time updates**: When a new session arrives (via HTTP MCP), the list refreshes automatically via SSE.

### 2. **Question Answering** (`/sessions/[id]`)

Step through questions one by one:

- **Question display**: Shows title, description, and type (single-select, multi-select, text input)
- **Stepper**: "Question 1 of 3" with progress bar
- **Navigation**: Back/Next buttons
- **Review screen**: Summary of all answers before submission
- **Submit**: Final button to record answers

**Real-time notifications**: If answers are submitted elsewhere (CLI, HTTP client), you'll see a toast notification.

### 3. **Session History** (`/sessions/[id]/history`)

Timeline of session events:

- **Created** — Session initiated
- **Answered** — User submitted answers
- **Rejected** — Session was rejected
- **Timestamps** — When each event occurred

**Export**: Download answers as JSON.

---

## Using the Web Dashboard

### MCP Client Connection

The web server exposes an **HTTP MCP endpoint** at `POST /api/mcp`.

**Example: Claude desktop app**

In your `~/.claude/config.json`:

```json
{
  "mcpServers": {
    "auq-web": {
      "command": "curl",
      "args": ["-X", "POST", "http://localhost:3000/api/mcp"],
      "env": {
        "REQUEST_MODE": "streaming"
      }
    }
  }
}
```

Then in Claude, you can call `ask_user_questions` and answers will appear in the web dashboard.

### REST API

**Get all sessions:**

```bash
curl http://localhost:3000/api/sessions
```

**Get a specific session:**

```bash
curl http://localhost:3000/api/sessions/abc123
```

**Submit answers:**

```bash
curl -X POST http://localhost:3000/api/sessions/abc123/answer \
  -H "Content-Type: application/json" \
  -d '{"answers": [...]}'
```

See [API Documentation](./api.md) for full details.

### Server-Sent Events (SSE)

Connect to real-time updates:

```javascript
const eventSource = new EventSource("/api/sse");

eventSource.addEventListener("session-created", (event) => {
  console.log("New session:", JSON.parse(event.data));
});

eventSource.addEventListener("session-answered", (event) => {
  console.log("Session answered:", JSON.parse(event.data));
});
```

---

## Running Both CLI and Web

You can run the CLI and web server simultaneously in different terminals:

**Terminal 1 - CLI with STDIO:**

```bash
bun run dev:cli
```

**Terminal 2 - Web server:**

```bash
bun run dev:web
```

Both share the same core business logic but use different storage:

- CLI: File-based sessions (`~/.local/share/auq/sessions/`)
- Web: SQLite sessions (`~/.local/share/auq/sessions.db`)

---

## Production Deployment

### Building for Production

```bash
cd packages/web
bun run build
bun run start
```

### Docker

Create a `Dockerfile` in the project root:

```dockerfile
FROM oven/bun:latest

WORKDIR /app

COPY . .
RUN bun install

EXPOSE 3000

ENV NODE_ENV=production
ENV DATABASE_URL="file:/data/sessions.db"

CMD ["bun", "run", "-cwd", "packages/web", "start"]
```

Build and run:

```bash
docker build -t auq-web .
docker run -p 3000:3000 -v auq-data:/data auq-web
```

### Environment Variables (Production)

```bash
NODE_ENV=production
DATABASE_URL="file:/var/lib/auq/sessions.db"
PORT=3000
```

### Systemd Service (Linux)

Create `/etc/systemd/system/auq-web.service`:

```ini
[Unit]
Description=auq-mcp-server Web Dashboard
After=network.target

[Service]
Type=simple
User=auq
WorkingDirectory=/opt/auq-mcp-server
ExecStart=/usr/bin/bun run -cwd packages/web start
Restart=on-failure
RestartSec=10s
Environment="NODE_ENV=production"
Environment="DATABASE_URL=file:/var/lib/auq/sessions.db"

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable auq-web
sudo systemctl start auq-web
```

---

## Troubleshooting

### Web server won't start

**Error**: `EADDRINUSE: address already in use :::3000`

**Solution**: Change the port:

```bash
PORT=3001 bun run dev:web
```

### Database locked

**Error**: `database is locked`

**Cause**: Two instances are running simultaneously or a process crashed while holding a lock.

**Solution**: Kill any existing processes and restart:

```bash
pkill -f "next dev"
bun run dev:web
```

### Sessions not showing up

**Check**: Make sure sessions were created via HTTP MCP, not STDIO.

```bash
# This creates a session visible to web
curl -X POST http://localhost:3000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"request": {...}}'

# This creates a session visible to CLI only
# (sent via STDIO transport)
```

### Old file-based sessions not imported

**Manual import**: The web server auto-imports on first run, but if it didn't:

```bash
# Delete the database to trigger re-import
rm ~/.local/share/auq/sessions.db

# Restart the web server
bun run dev:web
```

### SSE not updating

**Check**: Make sure you're connecting to `/api/sse`:

```javascript
const eventSource = new EventSource("/api/sse");
eventSource.onerror = () => console.error("SSE error");
```

Also check browser console for CORS errors (shouldn't occur on localhost).

---

## Development

### File Structure

```
packages/web/
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Root layout
│   │   ├── page.tsx             # Session list page
│   │   ├── sessions/
│   │   │   └── [id]/
│   │   │       └── page.tsx     # Question answering page
│   │   ├── api/
│   │   │   ├── mcp/
│   │   │   │   └── route.ts     # HTTP MCP endpoint
│   │   │   ├── sse/
│   │   │   │   └── route.ts     # SSE endpoint
│   │   │   └── sessions/        # REST API
│   │   └── globals.css          # Tailwind styles
│   ├── lib/
│   │   ├── db.ts                # Drizzle setup
│   │   ├── schema.ts            # SQLite schema
│   │   ├── mcp-transport.ts      # MCP server
│   │   └── sse-emitter.ts        # SSE manager
│   └── components/
│       ├── SessionList.tsx       # Session table
│       ├── QuestionStepper.tsx   # Question form
│       └── SessionHistory.tsx    # History timeline
├── next.config.ts
├── tsconfig.json
└── package.json
```

### Running Tests

```bash
cd packages/web
bun run test          # Run all tests
bun run test --watch  # Watch mode
```

### Type Checking

```bash
bun run typecheck
```

---

## Performance Considerations

### Database Indexing

The SQLite schema includes indices on:

- `sessions.id` (primary key)
- `sessions.status` (for filtering)
- `sessions.createdAt` (for sorting)

For high-volume deployments, consider adding:

```sql
CREATE INDEX idx_sessions_updated_at ON sessions(updatedAt);
CREATE INDEX idx_session_history_sessionId ON session_history(sessionId);
```

### SSE Connection Limits

Each browser connection holds an open SSE stream. For many concurrent users, consider:

1. **Adding connection pooling** to manage many SSE clients
2. **Implementing Redis pub/sub** for multi-instance deployments
3. **Rate limiting** on API endpoints

### Database Backups

The database file is located at `~/.local/share/auq/sessions.db`. Set up regular backups:

```bash
# Daily backup
0 2 * * * cp ~/.local/share/auq/sessions.db /backups/sessions-$(date +\%Y\%m\%d).db
```

---

## Next Steps

- 📖 [API Documentation](./api.md) — Full endpoint reference
- 🏗️ [Architecture Guide](./architecture.md) — Design decisions
- 🔄 [Migration Guide](./migration-guide.md) — Upgrading from v3.x
