# Web MCP Transport - Design Document

## Architecture Overview

### Current (AS-IS) - v3.x

```
┌──────────────────────────────────────────────────┐
│         MCP Client (Claude, OpenCode, etc.)      │
└────────────────────┬─────────────────────────────┘
                     │ STDIO transport
                     ▼
┌──────────────────────────────────────────────────┐
│              MCP Server (server.ts)               │
│  ┌──────────────────┐  ┌──────────────────────┐  │
│  │ask_user_questions │  │get_answered_questions│  │
│  └────────┬─────────┘  └──────────┬───────────┘  │
│           └──────────┬────────────┘               │
│                      ▼                            │
│           SessionManager (file-based)             │
│           ↓                                       │
│           FS: ~/.local/share/auq/sessions/       │
│                                                   │
│           ┌──────────────────┐                    │
│           │   TUI (Ink/React)│ ← Detects sessions │
│           │   (terminal)     │   via FileWatcher  │
│           └──────────────────┘                    │
└──────────────────────────────────────────────────┘
```

**Limitations:**

- Single-machine only (STDIO transport)
- No web interface
- Monolithic package (hard to extend)

---

### Target (TO-BE) - v4.x

```
                        MCP Client (STDIO)
                              │
                         STDIO transport
                              │
            ┌─────────────────┴─────────────────┐
            │                                   │
    [packages/cli]                   [packages/web]
    auq-mcp-server                   Next.js Server
            │                              │
            ├─ TUI (Ink/React)            ├─ API routes (/api/...)
            ├─ STDIO transport            ├─ Dashboard UI
            ├─ FileWatcher                ├─ SSE endpoint
            └─ FileStore                  └─ SQLiteStore
                     ↓                            ↓
                [packages/core]          [packages/core]
         (schemas, SessionManager,  (same code, diff storage)
          EventEmitter, types)
                     ↓
        FileStore    SQLiteStore     HTTP MCP
          (FS)      (SQLite)         (Streamable)
          │          │                   │
    Local CLI    Web Server         Any MCP Client
    Sessions     Sessions           (Claude, etc.)
    Inbox        Inbox              over HTTP
```

**Improvements:**

- Multiple transports: STDIO (CLI) + HTTP (web)
- Pluggable storage: FileStore (CLI) + SQLiteStore (web)
- Shared core logic via `packages/core`
- Real-time notifications via SSE
- Web dashboard for remote question answering

---

## Monorepo Structure

### Directory Tree

```
.
├── packages/
│   ├── core/                           # Shared business logic
│   │   ├── src/
│   │   │   ├── core/
│   │   │   │   └── ask-user-questions.ts       # Main question logic
│   │   │   ├── session/
│   │   │   │   ├── SessionManager.ts           # Transport-agnostic session manager
│   │   │   │   ├── StorageAdapter.ts           # Storage interface (FILE, DB, etc.)
│   │   │   │   ├── stores/
│   │   │   │   │   ├── FileStore.ts            # File-based implementation
│   │   │   │   │   └── SQLiteStore.ts          # SQLite implementation (Drizzle)
│   │   │   │   ├── events.ts                   # EventEmitter exports
│   │   │   │   └── types.ts
│   │   │   ├── shared/
│   │   │   │   ├── schemas.ts                  # Zod schemas (questions, answers, etc.)
│   │   │   │   └── types.ts                    # TypeScript interfaces
│   │   │   └── config/
│   │   │       └── index.ts                    # Default config, limits
│   │   ├── __tests__/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── cli/                            # CLI & TUI (STDIO + file-based sessions)
│   │   ├── src/
│   │   │   ├── server.ts               # MCP server (STDIO transport, fastmcp)
│   │   │   ├── tui/
│   │   │   │   └── components/         # Ink/React components (from current)
│   │   │   ├── cli/
│   │   │   │   └── commands/           # CLI commands (auq list, auq clear, etc.)
│   │   │   └── session-watcher.ts      # FileWatcher for TUI
│   │   ├── bin/
│   │   │   ├── auq.tsx                 # CLI entry (same as current)
│   │   │   └── tui-app.tsx             # TUI app (same as current)
│   │   ├── __tests__/
│   │   ├── package.json                # Published as auq-mcp-server v4.x
│   │   └── tsconfig.json
│   │
│   └── web/                            # Web server + dashboard
│       ├── src/
│       │   ├── app/
│       │   │   ├── layout.tsx           # Root layout
│       │   │   ├── page.tsx             # Session list page
│       │   │   ├── sessions/
│       │   │   │   └── [id]/
│       │   │   │       └── page.tsx     # Question answering page
│       │   │   └── globals.css          # Tailwind
│       │   ├── api/
│       │   │   ├── mcp/
│       │   │   │   └── route.ts         # Streamable HTTP MCP transport
│       │   │   ├── sse/
│       │   │   │   └── route.ts         # SSE endpoint for real-time updates
│       │   │   └── sessions/
│       │   │       ├── route.ts         # GET /api/sessions (list)
│       │   │       └── [id]/
│       │   │           ├── route.ts     # GET /api/sessions/[id] (details)
│       │   │           └── answer/
│       │   │               └── route.ts # POST /api/sessions/[id]/answer
│       │   ├── lib/
│       │   │   ├── db.ts                # Drizzle client
│       │   │   ├── schema.ts            # Drizzle schema
│       │   │   ├── mcp-transport.ts     # Streamable HTTP setup
│       │   │   └── sse-emitter.ts       # SSE event manager
│       │   └── components/
│       │       ├── SessionList.tsx      # Session table
│       │       ├── QuestionStepper.tsx  # Question answering stepper
│       │       └── SessionHistory.tsx   # History view
│       ├── __tests__/
│       ├── package.json                # Not published initially
│       ├── tsconfig.json
│       ├── next.config.ts
│       └── tailwind.config.ts
│
├── turbo.json                          # Turborepo config
├── package.json                        # Root workspace config
└── bun.lock
```

---

## Core Package (`packages/core`)

### StorageAdapter Interface

```typescript
// src/session/StorageAdapter.ts

interface StorageAdapter {
  /**
   * Create a new session with the given request.
   * Returns the created session ID.
   */
  create(session: Session): Promise<string>;

  /**
   * Retrieve a session by ID.
   * Throws SessionNotFoundError if not found.
   */
  read(sessionId: string): Promise<Session>;

  /**
   * Update an existing session (e.g., add answers).
   */
  update(sessionId: string, updates: Partial<Session>): Promise<void>;

  /**
   * List all sessions, optionally filtered by status.
   */
  list(filter?: { status?: SessionStatus }): Promise<Session[]>;

  /**
   * Delete a session by ID.
   */
  delete(sessionId: string): Promise<void>;

  /**
   * Initialize storage (create tables, directories, etc.).
   * Called once at startup.
   */
  initialize(): Promise<void>;

  /**
   * Cleanup (close DB connections, etc.).
   * Called on server shutdown.
   */
  shutdown(): Promise<void>;
}

// Implementations provided:
// - FileStore: stores sessions in ~/.local/share/auq/sessions/ (CLI)
// - SQLiteStore: stores sessions in SQLite via Drizzle ORM (web)
```

### SessionManager Refactored

```typescript
// src/session/SessionManager.ts (simplified)

export class SessionManager {
  constructor(
    private store: StorageAdapter,
    private events: EventEmitter,
  ) {}

  async createSession(request: QuestionRequest): Promise<string> {
    // Validate request
    const session: Session = {
      id: generateUUID(),
      request,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.store.create(session);
    this.events.emit("session:created", session);
    return session.id;
  }

  async answerSession(sessionId: string, answers: Answer[]): Promise<void> {
    const session = await this.store.read(sessionId);

    // Validate answers
    session.answers = answers;
    session.status = "completed";
    session.updatedAt = new Date();

    await this.store.update(sessionId, session);
    this.events.emit("session:answered", session);
  }

  async rejectSession(sessionId: string, reason?: string): Promise<void> {
    const session = await this.store.read(sessionId);
    session.status = "rejected";
    session.rejectReason = reason;
    session.updatedAt = new Date();

    await this.store.update(sessionId, session);
    this.events.emit("session:rejected", session);
  }

  async listSessions(filter?: { status?: SessionStatus }): Promise<Session[]> {
    return this.store.list(filter);
  }

  async getSession(sessionId: string): Promise<Session> {
    return this.store.read(sessionId);
  }
}
```

### EventEmitter

```typescript
// src/session/events.ts

import { EventEmitter } from "events";

export interface SessionEvent {
  "session:created": [session: Session];
  "session:answered": [session: Session];
  "session:rejected": [session: Session];
  "session:timeout": [sessionId: string];
}

export const createSessionEventEmitter = (): EventEmitter => {
  return new EventEmitter();
};

// Usage:
const events = createSessionEventEmitter();

events.on("session:created", (session) => {
  console.log("Question received:", session.id);
});

events.on("session:answered", (session) => {
  console.log("User answered:", session.id);
});
```

### FileStore Implementation

```typescript
// src/session/stores/FileStore.ts

export class FileStore implements StorageAdapter {
  constructor(private basePath: string) {
    // basePath = ~/.local/share/auq/sessions (XDG compliant)
  }

  async initialize(): Promise<void> {
    // Create basePath if not exists
    // Set permissions 0o700
  }

  async create(session: Session): Promise<string> {
    // Write session JSON to file atomically
    // Same logic as current implementation
  }

  async read(sessionId: string): Promise<Session> {
    // Read and parse session JSON
  }

  async update(sessionId: string, updates: Partial<Session>): Promise<void> {
    // Read, merge updates, write atomically
  }

  async list(filter?: { status?: SessionStatus }): Promise<Session[]> {
    // List all session files, parse, optionally filter
  }

  async delete(sessionId: string): Promise<void> {
    // Remove session file
  }

  async shutdown(): Promise<void> {
    // No-op for file-based store
  }
}
```

---

## CLI Package (`packages/cli`)

### Server (STDIO + MCP)

```typescript
// src/server.ts (no significant changes)

import { Server } from "@modelcontextprotocol/sdk/server/stdio";
import { SessionManager } from "@auq/core";
import { FileStore } from "@auq/core";

const store = new FileStore(getSessionsDir());
await store.initialize();

const manager = new SessionManager(store, eventEmitter);

const server = new Server({
  name: "auq-mcp-server",
  version: "4.0.0",
});

server.setRequestHandler(Tool.ListResources, async () => ({
  resources: [
    {
      uri: "auq://schema/question-request",
      mimeType: "application/json",
      name: "Question Request Schema",
    },
  ],
}));

server.setRequestHandler(Tool.CallTool, async (request) => {
  if (request.params.name === "ask_user_questions") {
    // Existing logic
    const sessionId = await manager.createSession(request.params.arguments);
    await manager.waitForAnswer(sessionId, timeout); // Blocking
    const session = await manager.getSession(sessionId);
    return { content: [{ type: "text", text: formatAnswer(session) }] };
  }
  // ...
});

// TUI watches file system for new sessions
const watcher = new SessionWatcher(getSessionsDir());
watcher.on("new-session", async (sessionId) => {
  // Render TUI question stepper
});
```

### TUI (no changes)

- Continues to use Ink/React
- Detects sessions via `FileWatcher` (unchanged)
- Stores answers back to file (unchanged)

---

## Web Package (`packages/web`)

### Streamable HTTP MCP Transport

```typescript
// src/lib/mcp-transport.ts

import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/http";
import { Server } from "@modelcontextprotocol/sdk/server/base";

export function createMcpServer(sessionManager: SessionManager) {
  const server = new Server({
    name: "auq-mcp-web",
    version: "4.0.0",
  });

  // Same tool definitions as CLI
  server.setRequestHandler(Tool.CallTool, async (request) => {
    if (request.params.name === "ask_user_questions") {
      const sessionId = await sessionManager.createSession(
        request.params.arguments,
      );

      // NON-BLOCKING: Return immediately with session ID
      // Client polls or uses SSE to check status
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ sessionId, status: "pending" }),
          },
        ],
      };
    }

    if (request.params.name === "get_answered_questions") {
      const sessionId = request.params.arguments.session_id;
      const session = await sessionManager.getSession(sessionId);

      if (session.status === "completed") {
        return {
          content: [{ type: "text", text: formatAnswer(session) }],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ status: session.status }),
          },
        ],
      };
    }
  });

  return server;
}

// Next.js API route handler
// src/app/api/mcp/route.ts

export async function POST(request: Request) {
  const transport = new StreamableHTTPServerTransport({
    server: mcpServer,
  });

  const response = await transport.handleRequest(request);
  return response;
}
```

### SSE Endpoint

```typescript
// src/app/api/sse/route.ts

import { SessionManager } from "@auq/core";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const sessionManager = getSessionManager(db); // Shared instance

  const responseStream = new ReadableStream({
    start(controller) {
      const sendEvent = (eventType: string, data: any) => {
        controller.enqueue(
          new TextEncoder().encode(
            `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`,
          ),
        );
      };

      // Listen to session events
      sessionManager.events.on("session:created", (session) => {
        sendEvent("session-created", { sessionId: session.id });
      });

      sessionManager.events.on("session:answered", (session) => {
        sendEvent("session-answered", { sessionId: session.id });
      });

      // Keep connection alive
      const interval = setInterval(() => {
        controller.enqueue(new TextEncoder().encode(": ping\n\n"));
      }, 30000);

      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        sessionManager.events.removeAllListeners();
        controller.close();
      });
    },
  });

  return new Response(responseStream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
```

### SQLite Schema (Drizzle)

```typescript
// src/lib/schema.ts

import { sqliteTable, text, integer, blob } from "drizzle-orm/sqlite-core";

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),

  request: blob("request").notNull(), // Serialized QuestionRequest
  status: text("status").notNull(), // 'pending' | 'completed' | 'rejected' | 'timeout'

  answers: blob("answers"), // Serialized Answer[]
  rejectReason: text("reject_reason"),

  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }), // For auto-cleanup
});

export const sessionHistory = sqliteTable("session_history", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => sessions.id),

  event: text("event").notNull(), // 'created' | 'answered' | 'rejected'
  timestamp: integer("timestamp", { mode: "timestamp_ms" }).notNull(),
  metadata: blob("metadata"), // JSON extras
});

// Drizzle migrations
export async function initializeDatabase(db: Database) {
  // Run migrations (auto-create tables)
  // Handle schema versioning for future updates
}
```

### SQLiteStore Implementation

```typescript
// src/lib/stores/SQLiteStore.ts

import { eq, desc } from "drizzle-orm";
import { Database } from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

export class SQLiteStore implements StorageAdapter {
  private db: ReturnType<typeof drizzle>;

  constructor(dbPath: string) {
    const sqlite = new Database(dbPath);
    this.db = drizzle(sqlite);
  }

  async initialize(): Promise<void> {
    // Run Drizzle migrations
    // Create tables if not exist
  }

  async create(session: Session): Promise<string> {
    await this.db.insert(sessions).values({
      id: session.id,
      request: JSON.stringify(session.request),
      status: session.status,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    });

    await this.db.insert(sessionHistory).values({
      id: generateUUID(),
      sessionId: session.id,
      event: "created",
      timestamp: new Date(),
    });

    return session.id;
  }

  async read(sessionId: string): Promise<Session> {
    const row = await this.db.query.sessions.findFirst({
      where: eq(sessions.id, sessionId),
    });

    if (!row) throw new SessionNotFoundError(sessionId);

    return {
      id: row.id,
      request: JSON.parse(row.request as string),
      status: row.status as SessionStatus,
      answers: row.answers ? JSON.parse(row.answers as string) : undefined,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }

  async update(sessionId: string, updates: Partial<Session>): Promise<void> {
    await this.db
      .update(sessions)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(sessions.id, sessionId));
  }

  async list(filter?: { status?: SessionStatus }): Promise<Session[]> {
    let query = this.db.select().from(sessions);

    if (filter?.status) {
      query = query.where(eq(sessions.status, filter.status));
    }

    const rows = await query.orderBy(desc(sessions.createdAt)).all();

    return rows.map((row) => ({
      id: row.id,
      request: JSON.parse(row.request as string),
      status: row.status as SessionStatus,
      answers: row.answers ? JSON.parse(row.answers as string) : undefined,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    }));
  }

  async delete(sessionId: string): Promise<void> {
    await this.db.delete(sessions).where(eq(sessions.id, sessionId));
  }

  async shutdown(): Promise<void> {
    this.db.close?.();
  }
}
```

### API Routes

#### GET /api/sessions

```typescript
// src/app/api/sessions/route.ts

export async function GET(request: Request) {
  const url = new URL(request.url);
  const status = url.searchParams.get("status");

  const sessionManager = getSessionManager(db);
  const sessions = await sessionManager.listSessions(
    status ? { status: status as SessionStatus } : undefined,
  );

  return Response.json({
    sessions: sessions.map((s) => ({
      id: s.id,
      status: s.status,
      createdAt: s.createdAt.toISOString(),
      questionCount: s.request.questions.length,
      answered: !!s.answers,
    })),
  });
}
```

#### GET /api/sessions/[id]

```typescript
// src/app/api/sessions/[id]/route.ts

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  const sessionManager = getSessionManager(db);

  try {
    const session = await sessionManager.getSession(params.id);
    return Response.json({
      id: session.id,
      request: session.request,
      status: session.status,
      answers: session.answers,
      createdAt: session.createdAt.toISOString(),
    });
  } catch (error) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }
}
```

#### POST /api/sessions/[id]/answer

```typescript
// src/app/api/sessions/[id]/answer/route.ts

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const body = await request.json();
  const { answers } = body;

  const sessionManager = getSessionManager(db);

  try {
    await sessionManager.answerSession(params.id, answers);
    return Response.json({ success: true });
  } catch (error) {
    return Response.json(
      { error: "Failed to answer session" },
      { status: 400 },
    );
  }
}
```

---

## Dashboard UI

### Page Structure

#### Session List (`/`)

- **Table columns**: Session ID, Status, Question Count, Created At, Actions
- **Filters**: Status (All / Pending / Completed / Rejected)
- **Actions**: View, Delete
- **Real-time**: SSE updates show badge on pending sessions

#### Question Answering (`/sessions/[id]`)

- **Stepper**: "Question 1 of 3" → "Question 2 of 3" → "Question 3 of 3" → Review
- **Question display**: Title, description, options (radio/checkbox/text input)
- **Navigation**: Back, Next buttons; skip option if allowed
- **Review screen**: Summary of all answers, edit button, submit
- **Real-time**: SSE connects on page load; shows "Session answered" toast if user answered elsewhere

#### History (`/sessions/[id]/history`)

- **Timeline**: Event log (Created, Answered, Rejected) with timestamps
- **Details**: Question text, selected options, custom answers
- **Export**: Download answers as JSON

### Components (shadcn/ui based)

```typescript
// src/components/SessionList.tsx
export function SessionList() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [filter, setFilter] = useState<SessionStatus | 'All'>('All');

  useEffect(() => {
    // Fetch sessions on mount
    fetchSessions(filter).then(setSessions);

    // Connect SSE for updates
    const eventSource = new EventSource('/api/sse');

    eventSource.addEventListener('session-created', () => {
      // Refresh list
      fetchSessions(filter).then(setSessions);
    });

    eventSource.addEventListener('session-answered', () => {
      // Refresh list
      fetchSessions(filter).then(setSessions);
    });

    return () => eventSource.close();
  }, [filter]);

  return (
    <div>
      <Tabs value={filter} onChange={setFilter}>
        <TabsList>
          <TabsTrigger value="All">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
      </Tabs>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Session ID</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Questions</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.map((s) => (
            <TableRow key={s.id}>
              <TableCell>{s.id}</TableCell>
              <TableCell>
                <Badge variant={s.status === 'pending' ? 'outline' : 'default'}>
                  {s.status}
                </Badge>
              </TableCell>
              <TableCell>{s.questionCount}</TableCell>
              <TableCell>{new Date(s.createdAt).toLocaleString()}</TableCell>
              <TableCell>
                <Button variant="link" asChild>
                  <Link href={`/sessions/${s.id}`}>View</Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

```typescript
// src/components/QuestionStepper.tsx
export function QuestionStepper({ session }: { session: Session }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);

  const question = session.request.questions[currentStep];
  const isLastStep = currentStep === session.request.questions.length;

  const handleAnswer = (option: Option | string) => {
    const newAnswers = [...answers];
    newAnswers[currentStep] = {
      questionId: question.id,
      selectedOption: typeof option === 'string' ? undefined : option,
      customText: typeof option === 'string' ? option : undefined,
    };
    setAnswers(newAnswers);
  };

  const handleSubmit = async () => {
    await submitAnswers(session.id, answers);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          Question {currentStep + 1} of {session.request.questions.length}
        </h2>
        <Progress value={(currentStep / session.request.questions.length) * 100} />
      </div>

      {!isLastStep ? (
        <>
          <div>
            <h3 className="text-base font-medium">{question.prompt}</h3>
            <p className="mt-2 text-sm text-gray-600">{question.description}</p>
          </div>

          {question.type === 'single-select' && (
            <RadioGroup value={answers[currentStep]?.selectedOption?.id}>
              {question.options.map((opt) => (
                <div key={opt.id} className="flex items-center space-x-2">
                  <RadioGroupItem
                    value={opt.id}
                    onChange={() => handleAnswer(opt)}
                  />
                  <Label>{opt.label}</Label>
                </div>
              ))}
            </RadioGroup>
          )}

          {question.type === 'multi-select' && (
            <div className="space-y-2">
              {question.options.map((opt) => (
                <div key={opt.id} className="flex items-center space-x-2">
                  <Checkbox
                    onChange={(checked) =>
                      handleAnswer(checked ? opt : null)
                    }
                  />
                  <Label>{opt.label}</Label>
                </div>
              ))}
            </div>
          )}

          {question.type === 'custom-input' && (
            <Input
              placeholder="Enter your answer"
              onChange={(e) => handleAnswer(e.target.value)}
            />
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={currentStep === 0}
              onClick={() => setCurrentStep(currentStep - 1)}
            >
              Back
            </Button>
            <Button
              onClick={() =>
                isLastStep
                  ? handleSubmit()
                  : setCurrentStep(currentStep + 1)
              }
            >
              {isLastStep ? 'Submit' : 'Next'}
            </Button>
          </div>
        </>
      ) : (
        <>
          <h3 className="text-base font-semibold">Review Your Answers</h3>
          <div className="space-y-4">
            {session.request.questions.map((q, idx) => (
              <div key={q.id} className="rounded border p-4">
                <h4 className="font-medium">{q.prompt}</h4>
                <p className="mt-2 text-sm text-gray-600">
                  {answers[idx]?.selectedOption?.label ||
                    answers[idx]?.customText ||
                    '(no answer)'}
                </p>
              </div>
            ))}
          </div>
          <Button onClick={handleSubmit} size="lg">
            Submit Answers
          </Button>
        </>
      )}
    </div>
  );
}
```

---

## Migration & Rollout Strategy

### Phase 1: Core Package Extraction

1. Extract `SessionManager`, `schemas`, `types`, `config` to `packages/core`
2. Introduce `StorageAdapter` interface
3. Move existing `FileStore` logic to `packages/core/stores/FileStore`
4. Create `EventEmitter` wrapper in `packages/core`
5. Update imports in existing code to use `@auq/core`

**Rollout**: No user-facing changes (internal refactoring)

### Phase 2: CLI Package Separation

1. Move TUI, CLI commands, STDIO server to `packages/cli`
2. `packages/cli` depends on `@auq/core`
3. Keep `auq-mcp-server` npm package name; it now publishes from `packages/cli`
4. Verify backward compatibility: same CLI commands, same STDIO behavior

**Rollout**: No breaking changes for existing npm users

### Phase 3: Web Server Package

1. Create `packages/web` with Next.js
2. Implement SQLiteStore using Drizzle
3. Implement Streamable HTTP MCP transport
4. Implement SSE endpoint
5. API routes for session management
6. Database initialization on first run

**Rollout**: New optional web server; no impact on CLI users

### Phase 4: Dashboard UI

1. Build React components (SessionList, QuestionStepper, etc.)
2. Integrate with API routes
3. Connect SSE for real-time updates
4. Manual QA on dashboard

**Rollout**: Dashboard available at `http://localhost:3000` when web server runs

### Session Migration (Backward Compatibility)

**Scenario**: User has old v3.x file-based sessions; wants to try v4.x web server

**Solution**:

1. Web server on first run: check for existing sessions in filesystem
2. If found, auto-import to SQLite (one-time migration)
3. Preserve session IDs and answers
4. Write migration summary to logs

**Code**:

```typescript
// src/lib/init.ts
async function initializeDatabase(dbPath: string, sessionDir: string) {
  const db = new Database(dbPath);
  // Create schema
  runMigrations(db);

  // Check for old file-based sessions
  const oldSessions = listFileBasedSessions(sessionDir);

  if (oldSessions.length > 0) {
    console.log(`Found ${oldSessions.length} old sessions. Migrating...`);

    for (const sessionId of oldSessions) {
      const fileSession = readSessionFile(sessionId);
      await sqliteStore.create(fileSession);
    }

    console.log(`Migration complete.`);
  }
}
```

---

## Testing Strategy

### Unit Tests

- **Core package**: SessionManager, StorageAdapter interface compliance, schemas
- **CLI package**: STDIO server integration, TUI component rendering
- **Web package**: MCP transport, SSE, API routes, SQLiteStore

### Integration Tests

- **FileStore + SessionManager**: Create, update, list, answer sessions
- **SQLiteStore + SessionManager**: Same as FileStore
- **Both implementations**: Run identical test suite against both stores

### API Tests

- **POST /api/sessions**: Create session
- **GET /api/sessions**: List sessions
- **GET /api/sessions/[id]**: Fetch session details
- **POST /api/sessions/[id]/answer**: Submit answers
- **GET /api/sse**: SSE connection and events

### Manual QA Checklist

- [ ] CLI works identically to v3.x (STDIO, TUI, `auq` commands)
- [ ] Web server starts without errors
- [ ] Dashboard loads in browser
- [ ] Session list shows existing sessions
- [ ] Clicking "View" shows question stepper
- [ ] Answering questions updates database
- [ ] SSE updates dashboard in real-time
- [ ] MCP client can connect via HTTP transport

---

## Deployment Considerations

### Local Development

```bash
# CLI only (STDIO + TUI)
bun run cli:dev

# Web server only
bun run web:dev

# Both (separate terminals)
bun run cli:dev &
bun run web:dev
```

### Production (Containerized)

```dockerfile
FROM oven/bun:latest

WORKDIR /app

COPY . .
RUN bun install

EXPOSE 3000

CMD ["bun", "run", "web:start"]
```

### Environment Variables

**CLI**: Same as v3.x (`AUQ_SESSION_DIR`, etc.)

**Web**:

- `DATABASE_URL` - Path to SQLite file (default: `~/.local/share/auq/sessions.db`)
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - `development` or `production`

---

## Appendix: Glossary

| Term                    | Definition                                                              |
| ----------------------- | ----------------------------------------------------------------------- |
| **StorageAdapter**      | Interface that abstracts session persistence (FileStore vs SQLiteStore) |
| **SessionManager**      | Core class managing session lifecycle (create, answer, reject, list)    |
| **EventEmitter**        | Node.js pattern for decoupling listeners from state changes             |
| **Streamable HTTP MCP** | MCP transport that uses HTTP (POST) instead of STDIO                    |
| **SSE**                 | Server-Sent Events; one-way push from server to browser                 |
| **Drizzle ORM**         | Type-safe SQL ORM for TypeScript                                        |
| **Turborepo**           | Monorepo build system with caching and incremental builds               |
