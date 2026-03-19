# Web MCP Transport - OpenSpec Proposal

## Executive Summary

This change extends AUQ from a **STDIO-only** MCP server to support **web-based question answering** via a **Streamable HTTP transport** and a **web dashboard**. While maintaining full backward compatibility with the existing CLI, we introduce a new web server package (Next.js-based) that serves as both an HTTP MCP transport and a question management interface.

This unlocks two key scenarios:

1. **Network-accessible questioning** - AI agents on different machines can ask questions to a user running the web server
2. **Future SaaS readiness** - Architecture supports multi-tenant deployment and web-based integrations

---

## Motivation

### Current Limitations

**STDIO-only transport:**

- Limits MCP client to same machine as the question server
- No real-time web interface for question answering
- Cannot scale to SaaS or remote-user scenarios

**Monolithic structure:**

- All code (MCP transport, CLI/TUI, schemas, session logic) in single `auq-mcp-server` package
- Difficult to reuse core question logic in different transports
- Hard to test components independently

### Why This Change Matters

**Web-enabled AUQ:**

- Allows AI agents to ask questions to **remote users** (same network/WAN)
- Provides **instant feedback** via Server-Sent Events (SSE) instead of polling
- Enables **dashboard UX** (session list, history, batch operations)
- Foundation for future **SaaS, team, and API integrations**

**Architectural clarity:**

- Separates concerns: `core` (business logic) → `cli` (STDIO+TUI) → `web` (HTTP+dashboard)
- Makes it **simple to add new transports** (e.g., WebSocket, gRPC) in the future
- Improves **testability** and **maintainability**

---

## Scope

### In Scope (Phase 1–4)

| Phase | Feature                 | Scope                                                               |
| ----- | ----------------------- | ------------------------------------------------------------------- |
| **1** | Core package extraction | SessionManager → StorageAdapter interface; EventEmitter for events  |
| **2** | CLI package separation  | Move TUI/CLI code; keep `auq-mcp-server` npm name for compatibility |
| **3** | Web server (Next.js)    | Streamable HTTP MCP transport; SSE; SQLite via Drizzle ORM          |
| **4** | Dashboard UI            | Session list, question answering view, answer history               |

### Not in Scope

- **Authentication** - v1 is local/single-user only (no login, no access control)
- **Multi-tenancy** - All sessions belong to single default user; designed to support it later
- **E2E tests** - Only unit + integration tests; manual QA for dashboard
- **WebSocket** - SSE is the real-time protocol; WebSocket can be added later
- **Analytics/observability** - No metrics, traces, or telemetry in v1
- **Offline mode** - Web server must be running; no offline question queuing

### Backward Compatibility

- **`auq-mcp-server` npm package** keeps its name; it becomes the CLI package (Phase 2 output)
- **Existing STDIO users** see no breaking changes
- **Export paths** remain stable; internal restructuring is transparent to consumers
- **Core schemas, types, and errors** available for reuse by new packages

---

## Success Criteria

### Functional

- [ ] Core package exports business logic (schemas, SessionManager with StorageAdapter)
- [ ] CLI package works identically to v3.x (via Streamable HTTP available internally)
- [ ] Web server exposes MCP tools via Streamable HTTP transport
- [ ] Dashboard displays session list, allows question answering, shows history
- [ ] SSE delivers real-time question notifications to browser
- [ ] Drizzle migrations create SQLite schema on first run
- [ ] FileStore (CLI) and SQLiteStore (web) both pass same unit tests

### Non-Functional

- [ ] No performance regression for CLI users (STDIO latency unchanged)
- [ ] Dashboard loads in <1s; question answering instant (<500ms)
- [ ] SQLite database handles 1000+ sessions without slowdown
- [ ] Clean monorepo structure with independent package versioning

### Quality

- [ ] Unit tests for core, cli, web packages (>80% coverage)
- [ ] Integration tests for SessionManager with both FileStore and SQLiteStore
- [ ] API tests for all `/api/` routes
- [ ] No TypeScript errors (`tsc --noEmit` passes)
- [ ] Existing TUI manual tests still pass

---

## Risk Assessment

### Technical Risks

| Risk                               | Severity | Mitigation                                                                    |
| ---------------------------------- | -------- | ----------------------------------------------------------------------------- |
| **Streamable HTTP MCP support**    | Medium   | Use official SDK; test with real MCP client (Claude, OpenCode, etc.)          |
| **SQLite concurrency**             | Low      | better-sqlite3 is single-threaded; fine for single-server deployments         |
| **Session migration from file→DB** | Medium   | Provide migration script; test on both old and new session formats            |
| **Monorepo complexity**            | Low      | Turborepo handles incremental builds; clear package boundaries                |
| **Next.js server overhead**        | Low      | Next.js 15 with App Router is lightweight; SQLite in-process (no network lag) |

### Mitigation Strategies

1. **Streamable HTTP**: Validate against `@modelcontextprotocol/sdk@latest`; test with multiple clients
2. **SQLite**: Use `better-sqlite3` (battle-tested); Drizzle ORM provides type safety
3. **Migration**: Write FileStore→SQLiteStore converter; run in background without blocking CLI
4. **Monorepo**: Document package boundaries; use Turborepo cache for fast rebuilds
5. **Dashboard**: Use shadcn/ui (battle-tested); Tailwind for styling; no custom CSS

### Rollback Plan

- If Streamable HTTP proves unstable, fall back to SSE-only (no MCP transport) and extend CLI with HTTP client
- If SQLite causes issues, fallback to file-based session storage (revert Phase 3)
- npm releases are semantic; CLI users can stay on v3.x while v4.x web features are optional

---

## Deliverables

### Code Repositories

1. **`packages/core`** - Extracted business logic, schemas, types, EventEmitter
2. **`packages/cli`** - TUI/CLI code; published as `auq-mcp-server` (v4.x)
3. **`packages/web`** - Next.js server, Streamable HTTP transport, dashboard UI
4. **`packages/web-types`** (optional) - Shared TypeScript types for web APIs

### Documentation

- [ ] Migration guide for existing npm users (STDIO → HTTP)
- [ ] Web server setup docs (running Next.js, SQLite initialization)
- [ ] Dashboard user guide
- [ ] API documentation for HTTP MCP and REST endpoints
- [ ] Architecture ADR (Architectural Decision Record) in `openspec/`

### Testing & QA

- [ ] Unit tests for core, cli, web packages
- [ ] Integration tests for StorageAdapter implementations (FileStore, SQLiteStore)
- [ ] API tests for HTTP routes
- [ ] Manual QA checklist for TUI and dashboard

---

## Timeline & Effort

### Estimated Effort

- **Phase 1 (Core extraction)**: 1–2 days - Moderate complexity (refactoring, StorageAdapter design)
- **Phase 2 (CLI separation)**: 1 day - Low complexity (moving existing code, testing)
- **Phase 3 (Web server)**: 2–3 days - High complexity (Next.js, Drizzle, Streamable HTTP)
- **Phase 4 (Dashboard)**: 2 days - Moderate complexity (React components, API integration)

**Total: ~1 week (5–8 working days)**

### Phases Run Sequentially (with Dependencies)

```
Phase 1 (core)
    ↓
Phase 2 (cli) [depends on Phase 1]
    ↓
Phase 3 (web) [depends on Phase 1]
    ↓
Phase 4 (dashboard) [depends on Phase 3]
```

All phases within **one OpenSpec change**, released as **v4.0.0** (major version bump due to monorepo restructuring).

---

## Key Design Decisions

### 1. StorageAdapter Interface (Phase 1)

**Decision**: Make SessionManager storage-agnostic by introducing `StorageAdapter` interface.

```typescript
interface StorageAdapter {
  create(session: Session): Promise<void>;
  read(sessionId: string): Promise<Session>;
  update(sessionId: string, session: Session): Promise<void>;
  list(): Promise<Session[]>;
  delete(sessionId: string): Promise<void>;
}

// Implementations:
// - FileStore: existing file-based logic
// - SQLiteStore: Drizzle ORM + better-sqlite3
```

**Rationale**:

- Decouples business logic from persistence layer
- Allows CLI (file) and web (SQLite) to use same SessionManager
- Future-proofs for Redis, PostgreSQL, or other backends

### 2. EventEmitter for Real-Time Updates (Phase 1)

**Decision**: Use Node.js `EventEmitter` for question lifecycle events.

**Events**:

- `session:created` (when ask_user_questions creates a session)
- `session:answered` (when user completes questions)
- `session:rejected` (when user cancels)

**Usage**:

- CLI (TUI) listens locally via `FileWatcher` (no change)
- Web server listens via SSE and broadcasts to browser
- Decouples MCP tools from transport layer

**Rationale**: Standard, lightweight, built-in to Node.js; no external dependencies.

### 3. Streamable HTTP MCP Transport (Phase 3)

**Decision**: Use `@modelcontextprotocol/sdk` StreamableHTTPServerTransport for HTTP MCP.

**Why HTTP over SSE-only**:

- HTTP is MCP-spec compliant (allows any MCP client to connect)
- SSE is unidirectional; REST handles bidirectional tool calls
- Foundation for future non-browser clients

**Implementation**:

- Next.js API route (`/api/mcp`)
- Exposes same tools as STDIO: `ask_user_questions`, `get_answered_questions`
- Sessions persisted to SQLite (shared with web dashboard)

### 4. SSE for Real-Time Browser Notifications (Phase 4)

**Decision**: Server-Sent Events (SSE) for browser → server push (question availability).

**Why SSE over WebSocket**:

- Simpler (one-way), fewer edge cases
- Automatic reconnection in browser
- Sufficient for dashboard updates (no bidirectional real-time data)

**Implementation**:

- `/api/sse` endpoint (browser connects)
- EventEmitter triggers SSE sends on `session:created`, `session:answered`
- Dashboard refreshes or shows toast on new question

### 5. SQLite + Drizzle for Web (Phase 3)

**Decision**: SQLite via better-sqlite3 + Drizzle ORM for web server persistence.

**Schema**:

```
sessions (id, request, status, created_at, updated_at)
answers (id, session_id, answers_json, created_at)
```

**Why not file-based for web**:

- Single-file DB is easier to back up
- SQL queries (e.g., "get last 10 sessions") are simpler
- Scales to thousands of sessions without FS overhead
- Drizzle provides type-safe migrations

**Why not PostgreSQL/external DB**:

- Adds deployment complexity (for v1 local/single-user)
- SQLite is sufficient; migrate to PostgreSQL if needed later

### 6. Dashboard via shadcn/ui + Tailwind (Phase 4)

**Decision**: Next.js App Router, shadcn/ui components, Tailwind CSS for dashboard.

**UI Screens**:

1. **Session List** - Table of all sessions, filter by status
2. **Question Answering** - Stepper view (per question), answering inline
3. **History** - Session details, answer history, timestamps

**Why Next.js + shadcn/ui**:

- Integrates seamlessly with API routes
- Type-safe (TypeScript end-to-end)
- shadcn/ui is battle-tested, accessible, customizable
- Tailwind is fast to style

### 7. Monorepo with Turborepo (Phase 1–4)

**Decision**: Restructure to Turborepo-managed monorepo with independent packages.

**Structure**:

```
packages/
├── core/         v4.x (exports schemas, types, SessionManager, EventEmitter)
├── cli/          v4.x (published as auq-mcp-server, STDIO+TUI)
└── web/          v4.x (Next.js server, dashboard, Streamable HTTP)
```

**Why Turborepo**:

- Incremental builds and caching
- Workspace dependency management
- Clear boundaries between packages
- Single `package.json` or per-package config

**Backward Compatibility**:

- `auq-mcp-server` (the CLI) stays the primary npm package
- `core` and `web` initially not published (internal only); can be published later if needed
- Existing users see no change in how they install/use `auq`

---

## Questions & Decisions Made

(This section summarizes user interview decisions)

### Monorepo Tool

**Decision**: Turborepo + Bun workspaces

- Turborepo handles incremental builds, caching
- Bun is the existing runtime; `bun workspaces` aligns with it

### Core Abstraction

**Decision**: StorageAdapter interface + EventEmitter

- Decouples business logic from persistence and transport
- Reusable in CLI and web without duplication

### Web Framework

**Decision**: Next.js 15 + App Router + shadcn/ui + Tailwind

- Type-safe, familiar to team, fast to develop
- shadcn/ui is accessible and lightweight
- Seamless integration with API routes and SSE

### MCP Transport

**Decision**: Streamable HTTP via `@modelcontextprotocol/sdk`

- MCP-compliant (any client can connect)
- Official SDK support
- Fallback to SSE-only if HTTP proves problematic

### Session Storage (Web)

**Decision**: SQLite via better-sqlite3 + Drizzle ORM

- Single-file database (easy backup, portable)
- Type-safe with Drizzle
- Sufficient for local/single-server deployments

### Authentication (v1)

**Decision**: None initially (local/single-user)

- Simplifies v1 delivery
- Architecture supports adding auth later (middleware layer)

### Deployment Model (v1)

**Decision**: Single web server per user/team

- CLI and web server run on same machine
- Sessions shared via SQLite or file
- SaaS multi-tenant deployment is Phase 2+ (not in scope)

---

## Open Questions Resolved

None remaining. All key decisions confirmed by user interview:

- ✅ Monorepo tool: Turborepo
- ✅ Storage: StorageAdapter + FileStore (CLI) / SQLiteStore (web)
- ✅ Events: Node.js EventEmitter
- ✅ Web framework: Next.js 15
- ✅ Real-time: SSE
- ✅ MCP HTTP: Streamable HTTP SDK
- ✅ Auth: None (v1)
- ✅ DB: Drizzle + better-sqlite3

---

## Next Steps

1. **Review & sign-off** on this proposal
2. **Create detailed design.md** (architecture, interfaces, schemas, API routes)
3. **Create tasks.md** (phase-by-phase task breakdown with acceptance criteria)
4. **Begin Phase 1** (core package extraction)
