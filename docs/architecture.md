# Architecture Decision Record (ADR)

## Overview

The `auq-mcp-server` v4.0.0 introduces a **monorepo architecture** with pluggable storage and multiple transport layers. This document explains the architectural decisions and their rationale.

---

## 1. Monorepo Structure (Turborepo + Bun Workspaces)

### Decision

Use **Turborepo** + **Bun workspaces** to manage three packages:

```
.
├── packages/
│   ├── core/           # Shared business logic
│   ├── cli/            # Terminal interface (published as auq-mcp-server)
│   └── web/            # Web dashboard (internal)
├── turbo.json
└── package.json
```

### Rationale

1. **Code reuse** — `SessionManager`, schemas, and event logic are shared between CLI and web
2. **Independent deployment** — CLI and web can be released separately
3. **Type safety** — Shared code is built once, used by both packages
4. **Backward compatibility** — CLI package name (`auq-mcp-server`) stays unchanged
5. **Scalability** — Easy to add more packages (e.g., `@auq/api`, `@auq/mobile`)

### Alternatives Considered

- **Single monolithic package**: Harder to maintain, larger bundle for CLI users
- **Separate npm packages**: Requires manual version coordination, complex dependency management
- **Workspace without Turborepo**: No built-in caching, slower builds, manual task orchestration

### Trades

- **Complexity**: Developers must understand workspace structure
- **Build time**: Initial setup slower, but incremental builds are fast
- **Tooling**: Turborepo adds another tool to learn

---

## 2. StorageAdapter Interface

### Decision

Define a **StorageAdapter interface** that abstracts session persistence:

```typescript
interface StorageAdapter {
  create(session: Session): Promise<string>;
  read(sessionId: string): Promise<Session>;
  update(sessionId: string, updates: Partial<Session>): Promise<void>;
  list(filter?: { status?: SessionStatus }): Promise<Session[]>;
  delete(sessionId: string): Promise<void>;
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
}
```

Two implementations:

- **FileStore**: Sessions as JSON files (`~/.local/share/auq/sessions/`)
- **SQLiteStore**: Sessions in SQLite database via Drizzle ORM

### Rationale

1. **Flexibility** — Add new storage backends (MongoDB, PostgreSQL, etc.) without changing core logic
2. **Testing** — Mock storage for unit tests
3. **Future extensibility** — SaaS could use cloud storage, audit logging, etc.
4. **Single Responsibility** — SessionManager doesn't know about storage implementation
5. **Migration support** — FileStore and SQLiteStore can coexist

### Alternatives Considered

- **Direct database usage**: Couples SessionManager to SQLite, hard to extend
- **Single storage type**: No flexibility for different deployment scenarios
- **Plugin system**: Overkill for current needs, complicates discovery

### Trades

- **Abstraction overhead**: Small performance cost, but gains outweigh it
- **Code duplication**: Tests must run against both implementations
- **Complexity**: Developers learning the codebase must understand the pattern

---

## 3. Event System (Node.js EventEmitter)

### Decision

Use Node.js **built-in EventEmitter** with TypeScript interfaces for type safety:

```typescript
interface SessionEvent {
  "session:created": [session: Session];
  "session:answered": [session: Session];
  "session:rejected": [session: Session];
  "session:timeout": [sessionId: string];
}

export const createSessionEventEmitter = (): EventEmitter => {
  return new EventEmitter();
};
```

### Rationale

1. **Decoupling** — SessionManager doesn't need to know about listeners
2. **Real-time notifications** — SSE and other transports can listen to events
3. **No external dependencies** — Node.js EventEmitter is built-in
4. **Type-safe** — TypeScript interfaces provide autocomplete and compile-time checks
5. **Testability** — Easy to verify events are emitted correctly

### Alternatives Considered

- **Pub/Sub library** (Redis, RabbitMQ): Overkill for single-server deployments
- **Observer pattern**: EventEmitter is the JavaScript implementation of it
- **Callbacks**: Less flexible, harder to add multiple listeners
- **RxJS**: Too heavy for this use case

### Trades

- **Memory growth**: Listeners that forget to unsubscribe can leak memory
- **No persistence**: Events are lost if server restarts (use database for durability)
- **Single-server only**: Multi-instance deployments need Redis pub/sub

---

## 4. MCP Transports: STDIO (CLI) vs. HTTP (Web)

### Decision

- **CLI**: STDIO transport (same as v3.x)
- **Web**: Streamable HTTP transport via `@modelcontextprotocol/sdk`

```
MCP Client → STDIO → CLI Server (FileStore)
MCP Client → HTTP  → Web Server (SQLiteStore)
```

### Rationale

1. **STDIO** — Standard for local MCP integration with Claude desktop, etc.
2. **HTTP** — Allows remote/browser-based clients (future feature)
3. **Same MCP tools** — Both transports expose `ask_user_questions` and `get_answered_questions`
4. **Standard SDK** — Use official MCP SDK implementation, not custom code

### Alternatives Considered

- **WebSocket**: Bidirectional, but overkill for request/response pattern
- **gRPC**: Not suitable for browser clients
- **Custom protocol**: Reinventing the wheel, harder to maintain

### Trades

- **Transport differences** — STDIO is synchronous/blocking; HTTP is async/non-blocking
- **Client behavior change** — HTTP MCP returns immediately; callers must poll or use SSE
- **Network overhead** — HTTP has more latency than STDIO

---

## 5. Web Stack: Next.js + Drizzle + better-sqlite3

### Decision

```
Next.js 15 (App Router)
    ↓
Drizzle ORM + better-sqlite3
    ↓
SQLite database
```

### Rationale

| Layer             | Choice         | Why                                                            |
| ----------------- | -------------- | -------------------------------------------------------------- |
| **Framework**     | Next.js 15     | SSR, API routes, Tailwind support, modern DX                   |
| **ORM**           | Drizzle        | Type-safe SQL, minimal abstraction, TypeScript-first           |
| **Database**      | better-sqlite3 | Fast, no server, built-in to Node.js, single-file database     |
| **CSS**           | Tailwind CSS   | Rapid UI development, component library (shadcn/ui) compatible |
| **UI Components** | shadcn/ui      | Copy-paste component library, Tailwind-based, high-quality     |

### Alternatives Considered

| Layer     | Alternative     | Why Not                                      |
| --------- | --------------- | -------------------------------------------- |
| Framework | Express + React | Manual routing, more boilerplate             |
| Framework | SvelteKit       | Smaller community, less ecosystem            |
| ORM       | Prisma          | Heavier, slower type generation              |
| ORM       | TypeORM         | Complex setup, more suited to ORMs           |
| Database  | PostgreSQL      | Requires server, overkill for single-machine |
| Database  | MongoDB         | No schema enforcement, harder to query       |
| CSS       | Bootstrap       | Larger bundle, dated design                  |
| UI        | Material-UI     | Heavy, many dependencies                     |

### Trades

- **Learning curve**: Next.js is different from traditional backends
- **Bundle size**: Next.js adds overhead (mitigated by tree-shaking)
- **Scalability**: Single SQLite file doesn't scale to multi-instance (but v4 is single-machine)

---

## 6. Real-time Updates: Server-Sent Events (SSE)

### Decision

Use **SSE** for real-time browser notifications:

```javascript
const eventSource = new EventSource("/api/sse");
eventSource.addEventListener("session-answered", () => {
  // Update dashboard
});
```

### Rationale

1. **Simple** — Built-in to browsers, no extra libraries
2. **Unidirectional** — Perfect for server → client notifications
3. **Fault-tolerant** — Browser auto-reconnects on disconnect
4. **Lightweight** — Minimal overhead compared to WebSocket
5. **No polling** — More efficient than client polling

### Alternatives Considered

- **WebSocket**: Overkill for one-way push; requires more client code
- **Long polling**: Less efficient, higher latency
- **Webhooks**: Requires client setup, not suitable for browser
- **GraphQL subscriptions**: Unnecessary complexity

### Trades

- **One-way only**: No client → server messages (not needed here)
- **Text-only**: Binary data must be Base64-encoded
- **Single endpoint**: All events on same stream

---

## 7. Session Status Model

### Decision

Sessions have explicit states: `pending`, `completed`, `rejected`, `timeout`

```typescript
type SessionStatus = "pending" | "completed" | "rejected" | "timeout";

interface Session {
  id: string;
  request: QuestionRequest;
  status: SessionStatus;
  answers?: Answer[];
  rejectReason?: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}
```

### Rationale

1. **Explicit states** — Clear what's happening with a session
2. **Timeout handling** — Prevent sessions from waiting indefinitely
3. **Reject reason** — Track why a session was rejected (auditing)
4. **Auto-cleanup** — expiresAt allows database maintenance
5. **Analytics** — Track completion rates, timeouts, rejections

### Alternatives Considered

- **Boolean flags**: `answered`, `rejected`, `timedOut` — Ambiguous combinations
- **Timestamp-based**: Infer state from timestamps — fragile
- **Enum states**: Better than strings, but TypeScript union is fine

### Trades

- **State explosion**: New states require code updates
- **Validation**: Must enforce valid state transitions

---

## 8. Question Types and Options

### Decision

Support three question types with reusable Option structure:

```typescript
type QuestionType = "single-select" | "multi-select" | "custom-input";

interface Option {
  id: string; // Unique within question
  label: string; // Display text
}

interface Question {
  id: string;
  prompt: string;
  description?: string;
  type: QuestionType;
  options?: Option[]; // Omitted for custom-input
}
```

### Rationale

1. **Flexibility** — Covers most UI patterns
2. **Type safety** — TypeScript ensures options exist for selects
3. **Reusable** — Options structure consistent across questions
4. **Extensibility** — Easy to add new types (date, number, file upload)

### Alternatives Considered

- **Single text field**: Too limited for structured data
- **Nested structure**: Complicates validation
- **Runtime type checking**: Zod handles this

### Trades

- **Limited types**: Custom types require code changes
- **Validation complexity**: Must ensure options exist for selects

---

## 9. Database Schema (Drizzle + SQLite)

### Decision

Two main tables:

```typescript
// sessions table
{
  id: string (PK),
  request: JSON blob,
  status: enum,
  answers: JSON blob,
  rejectReason?: string,
  createdAt: timestamp,
  updatedAt: timestamp,
  expiresAt?: timestamp,
}

// session_history table (audit log)
{
  id: string (PK),
  sessionId: string (FK),
  event: enum,
  timestamp: timestamp,
  metadata?: JSON blob,
}
```

### Rationale

1. **Denormalization** — Request and answers as JSON blobs (no need to normalize)
2. **Audit trail** — History table tracks all events
3. **Auto-cleanup** — expiresAt triggers deletion of old sessions
4. **Queryability** — Status index for filtering
5. **Performance** — Single sessions table lookup is O(1)

### Alternatives Considered

- **Normalized schema**: Questions and answers in separate tables — overkill
- **Mongo-style**: Store everything as JSON — harder to query
- **Event sourcing**: Every change as an event — too complex for v4

### Trades

- **Storage**: Denormalization duplicates request data
- **Maintainability**: Schema changes require migration scripts
- **Flexibility**: Adding fields requires ALTER TABLE

---

## 10. CLI and Web Independence

### Decision

CLI and web can run **simultaneously** in separate processes:

```
CLI (STDIO):     uses FileStore at ~/.local/share/auq/sessions/
Web (HTTP):      uses SQLiteStore at ~/.local/share/auq/sessions.db
```

They **do not share** session storage.

### Rationale

1. **No blocking** — Web doesn't wait for CLI file operations
2. **Isolation** — Failures in one don't affect the other
3. **Simple setup** — No coordination needed
4. **Future migration** — Auto-import file → SQLite when needed

### Alternatives Considered

- **Shared storage**: CLI writes to SQLite — breaks backward compatibility
- **Sync layer**: Copy sessions between stores — added complexity
- **Central database**: Forces all sessions to SQLite — breaks CLI portability

### Trades

- **Duplication**: Sessions exist in both stores if used concurrently
- **Confusion**: Users must understand which sessions go where
- **Future complexity**: Unification will require migration strategy

---

## 11. Auto-Import Old Sessions (Backward Compatibility)

### Decision

When web server starts, auto-detect and import file-based sessions:

```typescript
// On first web server startup
if (oldSessionsExist()) {
  console.log(`Found ${count} old sessions. Migrating...`);
  await importToSQLite();
}
```

### Rationale

1. **User convenience** — No manual migration steps
2. **Backward compatible** — Existing users can try web seamlessly
3. **Logged** — Users know what happened
4. **Safe** — Original files remain untouched

### Alternatives Considered

- **On-demand migration**: Requires user action and documentation
- **Automatic cleanup**: Might surprise users
- **Prompt user**: Interrupts startup

### Trades

- **Magic**: Non-obvious to users where old sessions go
- **Idempotence**: Must handle repeated imports gracefully

---

## 12. Testing Strategy

### Decision

Three levels:

1. **Unit tests** — Individual modules (StorageAdapter, SessionManager, schemas)
2. **Integration tests** — Full flows (session creation → answering → retrieval)
3. **Manual QA** — CLI still works, web UI responsive

### Rationale

1. **Unit** — Fast feedback during development
2. **Integration** — Catch issues at boundaries
3. **Manual** — Catch UX problems and real browser issues

### Alternatives Considered

- **E2E tests**: Too slow, requires headless browser
- **Property-based testing**: Overkill for this domain
- **Contract testing**: Not needed for monorepo

### Trades

- **Coverage gaps**: Some integration issues slip through
- **Manual effort**: QA checklist is tedious

---

## 13. Session ID Generation

### Decision

Use **UUID v4** for session IDs:

```typescript
import { v4 as uuidv4 } from "uuid";

const sessionId = uuidv4(); // e.g., "550e8400-e29b-41d4-a716-446655440000"
```

### Rationale

1. **Uniqueness** — Guaranteed no collisions across machines
2. **No database** — No need for sequence generators
3. **Non-sequential** — Can't guess next session ID
4. **Standard** — Well-known format, tooling support

### Alternatives Considered

- **Incrementing IDs**: Predictable, hard to scale across machines
- **Slugs**: Harder to generate, less unique
- **Timestamps**: Collisions possible

### Trades

- **Length**: UUIDs are longer than sequential IDs
- **Readability**: Not as user-friendly as `session-001`

---

## 14. Future Considerations

### Multi-instance Deployments

For future versions supporting multiple web servers:

1. **Session sync** — Use Redis pub/sub for SSE events
2. **Database** — Switch to PostgreSQL for concurrent access
3. **Authentication** — Add user/organization isolation

### Mobile/Desktop Clients

1. **Dedicated app** — Electron for desktop, React Native for mobile
2. **Web URL sharing** — Send HTTP MCP endpoint URL to other devices
3. **QR codes** — Quick setup without typing

### Audit and Compliance

1. **Session history** — Enhance with user identity, IP address
2. **Encryption** — Encrypt answers at rest and in transit
3. **GDPR support** — Add data export and deletion

### Analytics

1. **Session metrics** — Completion rates, timeout frequency
2. **Performance** — Response times, database size
3. **Usage** — Most common question types, question difficulty

---

## 15. Version Management

### Decision

Semantic versioning:

- **CLI package** (`auq-mcp-server`): v4.0.0, v4.1.0, v5.0.0
- **Core package** (`@auq/core`): Private (v0.0.0), internal only
- **Web package** (`@auq/web`): Private (v4.0.0), internal only

### Rationale

1. **Backward compatibility** — Semantic versioning signals breaking changes
2. **Clarity** — Users know what to expect
3. **CLI-focused** — Only CLI version matters for npm consumers
4. **Internal flexibility** — Core and web can change without bumping CLI minor

### Alternatives Considered

- **Independent versions** — Confusing for users
- **Lock to CLI version** — Tight coupling

---

## Glossary

| Term                | Definition                                       |
| ------------------- | ------------------------------------------------ |
| **StorageAdapter**  | Interface for pluggable storage implementations  |
| **FileStore**       | JSON file-based session storage (CLI)            |
| **SQLiteStore**     | SQLite database session storage (web)            |
| **SessionManager**  | Core class managing session lifecycle            |
| **EventEmitter**    | Node.js pub/sub for session events               |
| **STDIO transport** | Standard input/output for MCP (CLI)              |
| **HTTP transport**  | HTTP POST for MCP (web)                          |
| **SSE**             | Server-Sent Events for browser real-time updates |
| **Drizzle**         | TypeScript-first ORM for SQL databases           |
| **Turborepo**       | Monorepo build system with caching               |
| **Bun workspaces**  | Workspace support in Bun package manager         |

---

## References

- [MCP Specification](https://modelcontextprotocol.io)
- [Next.js Documentation](https://nextjs.org/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)

---

## Document History

| Date       | Change                 | Author |
| ---------- | ---------------------- | ------ |
| 2025-03-19 | Initial ADR for v4.0.0 | Team   |

---

## See Also

- [Web Setup Guide](./web-setup.md)
- [API Documentation](./api.md)
- [Migration Guide](./migration-guide.md)
