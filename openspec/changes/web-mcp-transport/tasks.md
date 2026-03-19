# Web MCP Transport - Tasks & Implementation Checklist

This document breaks down all work required to implement the web-mcp-transport change into actionable, ordered tasks organized by phase.

---

## Phase 1: Core Package Extraction (1–2 days)

**Objective**: Extract transport-agnostic business logic into `packages/core`.

### Setup & Structure

- [ ] **1.1** Create `packages/core/` directory with `src/`, `__tests__/`, `package.json`, `tsconfig.json`
  - **Acceptance**: `packages/core/package.json` exists with name `@auq/core` and dependencies (zod, uuid, typescript)
  - **Estimated effort**: S (small)

- [ ] **1.2** Create `packages/core/src/` subdirectories: `core/`, `session/`, `shared/`, `config/`
  - **Acceptance**: Directory structure matches design document
  - **Estimated effort**: S

### Core Business Logic

- [ ] **1.3** Extract & move `ask-user-questions.ts` logic to `packages/core/src/core/ask-user-questions.ts`
  - **Acceptance**: Function logic unchanged; imports from `../shared/schemas`
  - **Dependencies**: After 1.1
  - **Estimated effort**: M (medium)

- [ ] **1.4** Move & refactor `SessionManager.ts` to `packages/core/src/session/SessionManager.ts`
  - **Acceptance**: Constructor accepts `StorageAdapter` and `EventEmitter` parameters; methods unchanged
  - **Dependencies**: After 1.5
  - **Estimated effort**: M

### Storage Abstraction

- [ ] **1.5** Create `StorageAdapter` interface in `packages/core/src/session/StorageAdapter.ts`
  - **Acceptance**: Interface matches design document; includes create, read, update, list, delete, initialize, shutdown methods
  - **Tests**: Unit tests verifying interface shape
  - **Estimated effort**: S

- [ ] **1.6** Implement `FileStore` in `packages/core/src/session/stores/FileStore.ts`
  - **Acceptance**: Passes same tests as old SessionManager file logic; atomic operations preserved; errors match original
  - **Dependencies**: After 1.5
  - **Tests**: Unit tests for file I/O, error handling
  - **Estimated effort**: M

- [ ] **1.7** Create `StorageAdapterTestSuite` helper in `packages/core/src/session/__tests__/storage-adapter-tests.ts`
  - **Acceptance**: Reusable test suite that can run against any StorageAdapter implementation
  - **Tests**: Validates create, read, update, list, delete, initialize, shutdown
  - **Dependencies**: After 1.5
  - **Estimated effort**: M

### Event System

- [ ] **1.8** Create `EventEmitter` wrapper in `packages/core/src/session/events.ts`
  - **Acceptance**: Exports `createSessionEventEmitter()`, typed events (session:created, session:answered, session:rejected, session:timeout)
  - **Tests**: Unit tests for event emission
  - **Estimated effort**: S

- [ ] **1.9** Refactor `SessionManager.ts` to emit events on state changes
  - **Acceptance**: Calls `events.emit()` after each state change (create, answer, reject)
  - **Dependencies**: After 1.4, 1.8
  - **Tests**: Unit tests verify events fired
  - **Estimated effort**: S

### Schemas & Types

- [ ] **1.10** Move `shared/schemas.ts` to `packages/core/src/shared/schemas.ts`
  - **Acceptance**: All Zod schemas present and unchanged; re-exports available
  - **Dependencies**: None
  - **Estimated effort**: S

- [ ] **1.11** Move `shared/types.ts` to `packages/core/src/shared/types.ts`
  - **Acceptance**: All TypeScript interfaces and types present; no breaking changes
  - **Dependencies**: None
  - **Estimated effort**: S

- [ ] **1.12** Create `shared/index.ts` for re-exports
  - **Acceptance**: `export * from './schemas'` and `export * from './types'`
  - **Estimated effort**: S

### Config & Utilities

- [ ] **1.13** Move `config/` to `packages/core/src/config/`
  - **Acceptance**: Default config exports (limits, session timeout, etc.) available
  - **Estimated effort**: S

- [ ] **1.14** Move utility functions (`uuid`, error classes, formatting) to `packages/core/src/shared/utils.ts`
  - **Acceptance**: All utilities re-exported from `packages/core`
  - **Estimated effort**: S

### Testing & Exports

- [ ] **1.15** Create `packages/core/src/index.ts` with main exports
  - **Acceptance**: Exports SessionManager, StorageAdapter, FileStore, createSessionEventEmitter, schemas, types, config
  - **Tests**: Verify all exports work
  - **Estimated effort**: S

- [ ] **1.16** Write unit tests for `packages/core`
  - **Acceptance**: >80% coverage for core module; tests pass
  - **Dependencies**: After 1.3–1.14
  - **Tests**: Vitest suite covering SessionManager, FileStore, schemas
  - **Estimated effort**: M

- [ ] **1.17** Update root `package.json` to include `packages/core` in workspaces
  - **Acceptance**: `"workspaces": ["packages/core", ...]` in root; `bun install` works
  - **Estimated effort**: S

### Refactor Existing Code

- [ ] **1.18** Update existing CLI code (`src/`) to import from `@auq/core`
  - **Acceptance**: `import { SessionManager, FileStore, ... } from '@auq/core'`; no local re-exports
  - **Dependencies**: After 1.15
  - **Estimated effort**: M

- [ ] **1.19** Verify backward compatibility
  - **Acceptance**: Existing tests pass; `tsc --noEmit` passes; STDIO server works identically
  - **Dependencies**: After 1.18
  - **Tests**: Run existing test suite
  - **Estimated effort**: M

---

## Phase 2: CLI Package Separation (1 day)

**Objective**: Move TUI/CLI code to `packages/cli`, keep `auq-mcp-server` npm name.

### Setup & Structure

- [ ] **2.1** Create `packages/cli/` directory with `src/`, `bin/`, `__tests__/`, `package.json`, `tsconfig.json`
  - **Acceptance**: Directory structure matches design document
  - **Dependencies**: After Phase 1
  - **Estimated effort**: S

- [ ] **2.2** Create `packages/cli/package.json` with `name: "auq-mcp-server"`, depends on `@auq/core`
  - **Acceptance**: Version 4.0.0; exports bin entry point; main points to `dist/src/server.js`
  - **Estimated effort**: S

### Move CLI Code

- [ ] **2.3** Move `bin/auq.tsx` to `packages/cli/bin/auq.tsx`
  - **Acceptance**: File exists; imports from `@auq/core` or local packages
  - **Estimated effort**: S

- [ ] **2.4** Move `bin/tui-app.tsx` to `packages/cli/bin/tui-app.tsx`
  - **Acceptance**: File exists; Ink/React imports unchanged
  - **Estimated effort**: S

- [ ] **2.5** Move `src/server.ts` to `packages/cli/src/server.ts`
  - **Acceptance**: STDIO transport, fastmcp setup; imports `SessionManager`, `FileStore` from `@auq/core`
  - **Estimated effort**: S

- [ ] **2.6** Move `src/tui/` directory to `packages/cli/src/tui/`
  - **Acceptance**: All React/Ink components copied; imports updated
  - **Dependencies**: After 2.1
  - **Estimated effort**: S

- [ ] **2.7** Move `src/cli/commands/` to `packages/cli/src/commands/`
  - **Acceptance**: All CLI commands (auq list, auq clear, etc.) present
  - **Dependencies**: After 2.1
  - **Estimated effort**: S

- [ ] **2.8** Move file-watching logic to `packages/cli/src/session-watcher.ts`
  - **Acceptance**: FileWatcher detects new sessions in filesystem
  - **Estimated effort**: S

### Build & Testing

- [ ] **2.9** Create `packages/cli/tsconfig.json` extending root config
  - **Acceptance**: Build succeeds; `tsc --noEmit` passes
  - **Estimated effort**: S

- [ ] **2.10** Create `packages/cli/vitest.config.ts` if custom config needed
  - **Acceptance**: Tests run via `bun test` in cli package
  - **Estimated effort**: S

- [ ] **2.11** Write unit tests for `packages/cli` (STDIO server, TUI components)
  - **Acceptance**: >80% coverage; tests pass
  - **Dependencies**: After 2.3–2.8
  - **Tests**: Vitest suite for server integration, TUI rendering
  - **Estimated effort**: M

- [ ] **2.12** Update root `package.json` workspaces to include `packages/cli`
  - **Acceptance**: `"workspaces": ["packages/core", "packages/cli"]` in root
  - **Estimated effort**: S

### Backward Compatibility

- [ ] **2.13** Verify `auq-mcp-server` still publishes from `packages/cli`
  - **Acceptance**: `package.json` build and publish scripts configured; semantic-release targets correct path
  - **Dependencies**: After 2.2
  - **Estimated effort**: M

- [ ] **2.14** Test CLI commands unchanged
  - **Acceptance**: `bun run cli:dev` works; `auq list`, `auq clear` work identically to v3.x
  - **Dependencies**: After 2.3–2.8
  - **Tests**: Manual test of CLI
  - **Estimated effort**: M

- [ ] **2.15** Remove old `src/server.ts`, `bin/`, original `src/` files from root
  - **Acceptance**: Files moved to `packages/cli`; root no longer has duplicate code
  - **Dependencies**: After 2.14
  - **Estimated effort**: S

---

## Phase 3: Web Server Package (2–3 days)

**Objective**: Create Next.js web server with MCP transport, SSE, SQLite storage.

### Setup & Structure

- [ ] **3.1** Create `packages/web/` directory structure (src/app, src/api, src/lib, src/components, **tests**)
  - **Acceptance**: Next.js app structure in place; `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts` exist
  - **Dependencies**: After Phase 1
  - **Estimated effort**: M

- [ ] **3.2** Create `packages/web/package.json` with Next.js, React, Drizzle, better-sqlite3 dependencies
  - **Acceptance**: Dependencies listed; versions compatible with node versions; dev dependencies for build tools
  - **Estimated effort**: S

### Database Setup

- [ ] **3.3** Create `packages/web/src/lib/db.ts` with Drizzle client initialization
  - **Acceptance**: Exports `db` instance; handles SQLite path (env var or default)
  - **Estimated effort**: S

- [ ] **3.4** Create `packages/web/src/lib/schema.ts` with Drizzle table definitions
  - **Acceptance**: `sessions` and `sessionHistory` tables defined; schema matches design document
  - **Estimated effort**: S

- [ ] **3.5** Create `packages/web/src/lib/init.ts` with database initialization and migration
  - **Acceptance**: Creates tables on first run; handles old file-based session import (optional)
  - **Tests**: Unit test for initialization logic
  - **Estimated effort**: M

- [ ] **3.6** Create `SQLiteStore` in `packages/web/src/lib/stores/SQLiteStore.ts`
  - **Acceptance**: Implements `StorageAdapter` interface; passes `StorageAdapterTestSuite`; uses Drizzle ORM
  - **Dependencies**: After 3.3, 3.4
  - **Tests**: Run `StorageAdapterTestSuite` against SQLiteStore
  - **Estimated effort**: M

- [ ] **3.7** Create migration script for old file-based sessions (optional in v1, useful for beta)
  - **Acceptance**: Script reads old session files, imports to SQLite, reports summary
  - **Estimated effort**: S

### MCP Transport (Streamable HTTP)

- [ ] **3.8** Create `packages/web/src/lib/mcp-transport.ts`
  - **Acceptance**: Initializes MCP server with same tools as CLI (ask_user_questions, get_answered_questions)
  - **Tests**: Unit test for tool definitions
  - **Estimated effort**: M

- [ ] **3.9** Create `/api/mcp` route in `packages/web/src/app/api/mcp/route.ts`
  - **Acceptance**: Handles POST requests via Streamable HTTP transport; routes to MCP server
  - **Dependencies**: After 3.8
  - **Tests**: API test with mock MCP client
  - **Estimated effort**: M

### Event System & SSE

- [ ] **3.10** Create `packages/web/src/lib/sse-emitter.ts`
  - **Acceptance**: Manages EventEmitter instance; broadcasts session events to all connected SSE clients
  - **Dependencies**: After Phase 1 (EventEmitter)
  - **Estimated effort**: M

- [ ] **3.11** Create `/api/sse` route in `packages/web/src/app/api/sse/route.ts`
  - **Acceptance**: Returns ReadableStream with SSE events; listens to session events; handles client disconnect
  - **Dependencies**: After 3.10
  - **Tests**: API test for SSE connection and event stream
  - **Estimated effort**: M

### REST API Routes

- [ ] **3.12** Create `GET /api/sessions` route
  - **Acceptance**: Lists sessions; supports `?status=pending` filter; returns JSON array
  - **Dependencies**: After 3.6
  - **Tests**: API test for list endpoint
  - **Estimated effort**: S

- [ ] **3.13** Create `GET /api/sessions/[id]` route
  - **Acceptance**: Fetches single session by ID; returns 404 if not found
  - **Dependencies**: After 3.6
  - **Tests**: API test for detail endpoint
  - **Estimated effort**: S

- [ ] **3.14** Create `POST /api/sessions/[id]/answer` route
  - **Acceptance**: Accepts answers JSON; updates session status to "completed"; returns 200 on success
  - **Dependencies**: After 3.6
  - **Tests**: API test for answer submission
  - **Estimated effort**: S

- [ ] **3.15** Create optional `DELETE /api/sessions/[id]` route
  - **Acceptance**: Deletes session from database; returns 200 on success
  - **Dependencies**: After 3.6
  - **Estimated effort**: S

### App Setup & Layout

- [ ] **3.16** Create `packages/web/src/app/layout.tsx` with Tailwind setup
  - **Acceptance**: Root layout with head metadata, body, global styles imported
  - **Estimated effort**: S

- [ ] **3.17** Create `packages/web/src/app/globals.css` with Tailwind directives
  - **Acceptance**: `@tailwind base`, `@tailwind components`, `@tailwind utilities`
  - **Estimated effort**: S

- [ ] **3.18** Create `packages/web/next.config.ts` with required settings
  - **Acceptance**: Exports default config; no blocking warnings on build
  - **Estimated effort**: S

- [ ] **3.19** Create `packages/web/tailwind.config.ts` with shadcn/ui preset
  - **Acceptance**: Includes shadcn theme config; custom colors optional
  - **Estimated effort**: S

### Testing

- [ ] **3.20** Write API tests for all `/api/` routes
  - **Acceptance**: Tests for list, detail, answer, delete endpoints; >80% coverage
  - **Dependencies**: After 3.12–3.15
  - **Tests**: Vitest API tests with mock database
  - **Estimated effort**: M

- [ ] **3.21** Write unit tests for `SQLiteStore`
  - **Acceptance**: `StorageAdapterTestSuite` passes; errors handled correctly
  - **Dependencies**: After 3.6
  - **Tests**: Vitest suite
  - **Estimated effort**: M

- [ ] **3.22** Integration test: database initialization and migration
  - **Acceptance**: Can initialize new database; can import old file-based sessions
  - **Dependencies**: After 3.5
  - **Tests**: Integration test
  - **Estimated effort**: S

### Build & Dev Setup

- [ ] **3.23** Update root `package.json` workspaces to include `packages/web`
  - **Acceptance**: `"workspaces": ["packages/core", "packages/cli", "packages/web"]`
  - **Estimated effort**: S

- [ ] **3.24** Add build scripts to `packages/web/package.json`
  - **Acceptance**: `build`, `dev`, `start` scripts defined; `tsc --noEmit` passes
  - **Estimated effort**: S

- [ ] **3.25** Verify Turborepo build pipeline
  - **Acceptance**: `turbo build` runs all packages; incremental builds work
  - **Dependencies**: After 3.23
  - **Estimated effort**: S

---

## Phase 4: Dashboard UI (2 days)

**Objective**: Build React components for session list, question answering, history.

### Session List

- [ ] **4.1** Create `packages/web/src/app/page.tsx` (session list page)
  - **Acceptance**: Page renders SessionList component; layout includes header, filters
  - **Dependencies**: After 3.16
  - **Estimated effort**: S

- [ ] **4.2** Create `packages/web/src/components/SessionList.tsx` component
  - **Acceptance**: Renders table with columns (ID, Status, Questions, Created, Actions); fetches from `/api/sessions`
  - **Tests**: Unit test component rendering with mock data
  - **Estimated effort**: M

- [ ] **4.3** Add filter controls to SessionList (status tabs)
  - **Acceptance**: Tabs for All / Pending / Completed / Rejected; updates API call with `?status=` filter
  - **Dependencies**: After 4.2
  - **Tests**: Unit test filter interaction
  - **Estimated effort**: S

- [ ] **4.4** Add SSE integration to SessionList
  - **Acceptance**: Connects to `/api/sse`; refreshes list on `session-created` and `session-answered` events
  - **Dependencies**: After 4.2, 3.11
  - **Tests**: Mock SSE events and verify list updates
  - **Estimated effort**: M

- [ ] **4.5** Add row actions (View, Delete buttons)
  - **Acceptance**: View links to `/sessions/[id]`; Delete calls `DELETE /api/sessions/[id]`
  - **Dependencies**: After 4.2
  - **Tests**: Unit test action handlers
  - **Estimated effort**: S

### Question Answering

- [ ] **4.6** Create `packages/web/src/app/sessions/[id]/page.tsx`
  - **Acceptance**: Page renders QuestionStepper component; fetches session from `/api/sessions/[id]`
  - **Dependencies**: After 3.16
  - **Estimated effort**: S

- [ ] **4.7** Create `packages/web/src/components/QuestionStepper.tsx` component
  - **Acceptance**: Renders current question; stepper progress bar; navigation buttons (Back, Next, Submit)
  - **Tests**: Unit test component with mock session data
  - **Estimated effort**: M

- [ ] **4.8** Implement question rendering (single-select, multi-select, custom-input)
  - **Acceptance**: Radio buttons for single-select; checkboxes for multi-select; text input for custom
  - **Dependencies**: After 4.7
  - **Tests**: Unit test each question type
  - **Estimated effort**: M

- [ ] **4.9** Implement review screen
  - **Acceptance**: Shows all questions and selected answers; allows edit button to go back
  - **Dependencies**: After 4.7, 4.8
  - **Tests**: Unit test review rendering
  - **Estimated effort**: S

- [ ] **4.10** Implement answer submission
  - **Acceptance**: POST to `/api/sessions/[id]/answer` with answers JSON; shows success toast; redirects to history
  - **Dependencies**: After 4.7
  - **Tests**: Unit test submission handler
  - **Estimated effort**: M

### History View

- [ ] **4.11** Create `packages/web/src/app/sessions/[id]/history/page.tsx`
  - **Acceptance**: Page renders SessionHistory component; fetches session details
  - **Dependencies**: After 3.16
  - **Estimated effort**: S

- [ ] **4.12** Create `packages/web/src/components/SessionHistory.tsx` component
  - **Acceptance**: Timeline view of session events (created, answered, rejected); shows question/answer details
  - **Tests**: Unit test component with mock history data
  - **Estimated effort**: M

- [ ] **4.13** Add export function (download as JSON)
  - **Acceptance**: Button to download session as JSON file; includes request, answers, timestamps
  - **Dependencies**: After 4.12
  - **Tests**: Unit test export handler
  - **Estimated effort**: S

### UI Refinement & Accessibility

- [ ] **4.14** Implement shadcn/ui components usage
  - **Acceptance**: Use Button, Table, Tabs, Badge, Input, RadioGroup, Checkbox, Progress from shadcn/ui
  - **Dependencies**: After 4.2, 4.7, 4.12
  - **Estimated effort**: M

- [ ] **4.15** Add error states (failed API calls, missing sessions)
  - **Acceptance**: Error messages displayed; retry buttons available
  - **Dependencies**: After 4.2, 4.7
  - **Tests**: Unit test error rendering
  - **Estimated effort**: S

- [ ] **4.16** Add loading states (spinners, skeleton screens)
  - **Acceptance**: Loading indicators during API calls; skeleton screens for initial load
  - **Dependencies**: After 4.2, 4.7
  - **Tests**: Unit test loading states
  - **Estimated effort**: S

- [ ] **4.17** Verify accessibility (WCAG 2.1 AA)
  - **Acceptance**: Keyboard navigation works; screen reader friendly; color contrast sufficient
  - **Dependencies**: After 4.14–4.16
  - **Manual QA**: Accessibility audit
  - **Estimated effort**: S

### Dashboard Polish

- [ ] **4.18** Add header/navigation component
  - **Acceptance**: Consistent header across all pages; links to session list and home
  - **Estimated effort**: S

- [ ] **4.19** Add responsive design (mobile-friendly)
  - **Acceptance**: Layout adapts to mobile screens; tables are scrollable; buttons remain accessible
  - **Dependencies**: After 4.14
  - **Tests**: Manual mobile testing
  - **Estimated effort**: M

- [ ] **4.20** Create dashboard readme/documentation
  - **Acceptance**: Quick start guide for running web server; screenshot of UI; API endpoint docs
  - **Estimated effort**: S

### Testing & QA

- [ ] **4.21** Write component tests for SessionList, QuestionStepper, SessionHistory
  - **Acceptance**: >80% component coverage; tests pass
  - **Dependencies**: After 4.2, 4.7, 4.12
  - **Tests**: Vitest component tests with React Testing Library
  - **Estimated effort**: M

- [ ] **4.22** Integration test: full user flow (list → view → answer → history)
  - **Acceptance**: Can navigate from session list to question answering to history; all API calls work
  - **Dependencies**: After 4.21
  - **Tests**: E2E test (optional, manual QA sufficient for v1)
  - **Estimated effort**: M

- [ ] **4.23** Manual QA checklist
  - **Acceptance**: ✅ All screens load without errors
  - **Acceptance**: ✅ Session list displays correctly
  - **Acceptance**: ✅ Answering questions works end-to-end
  - **Acceptance**: ✅ History shows answers correctly
  - **Acceptance**: ✅ SSE updates appear in real-time
  - **Acceptance**: ✅ Export to JSON works
  - **Manual QA**: Full walkthrough by team
  - **Estimated effort**: M

---

## Cross-Phase Tasks

### Documentation

- [ ] **5.1** Create migration guide for v3.x → v4.x users
  - **Acceptance**: Explains new web server; how to run both CLI and web; backward compatibility notes
  - **Dependencies**: After all phases
  - **Estimated effort**: S

- [ ] **5.2** Create web server setup documentation
  - **Acceptance**: Installation, configuration, environment variables, running web server
  - **Dependencies**: After all phases
  - **Estimated effort**: S

- [ ] **5.3** Create API documentation for HTTP MCP and REST endpoints
  - **Acceptance**: Endpoint specs, request/response examples, error codes
  - **Dependencies**: After Phase 3
  - **Estimated effort**: M

- [ ] **5.4** Create dashboard user guide
  - **Acceptance**: Screenshots, workflows, keyboard shortcuts (if any)
  - **Dependencies**: After Phase 4
  - **Estimated effort**: S

- [ ] **5.5** Write architecture ADR (Architectural Decision Record)
  - **Acceptance**: Explains monorepo structure, storage adapter pattern, event system
  - **Dependencies**: After all phases
  - **Estimated effort**: S

### Build & Release

- [ ] **5.6** Update Turborepo config for multi-package build
  - **Acceptance**: `turbo.json` configured; caching works; incremental builds verified
  - **Dependencies**: After Phases 1–3
  - **Estimated effort**: S

- [ ] **5.7** Update root scripts in `package.json` for multi-package dev/build
  - **Acceptance**: `bun run dev` starts both CLI and web; `bun run build` builds all packages
  - **Dependencies**: After 5.6
  - **Estimated effort**: S

- [ ] **5.8** Configure semantic-release for v4.0.0
  - **Acceptance**: Bumps version to 4.0.0; publishes `auq-mcp-server` from `packages/cli`
  - **Dependencies**: After all phases
  - **Estimated effort**: M

- [ ] **5.9** Update GitHub CI/CD pipeline
  - **Acceptance**: Runs tests for all packages; linting passes; builds succeed
  - **Dependencies**: After all phases
  - **Estimated effort**: M

- [ ] **5.10** Create changelog entries for v4.0.0
  - **Acceptance**: Summarizes major changes (monorepo split, web server, HTTP MCP, dashboard)
  - **Dependencies**: After all phases
  - **Estimated effort**: S

### Testing & Quality

- [ ] **5.11** Monorepo-wide test coverage report
  - **Acceptance**: All packages >80% coverage; report visible in CI
  - **Dependencies**: After all phases
  - **Estimated effort**: S

- [ ] **5.12** TypeScript strict mode verification
  - **Acceptance**: `tsc --noEmit` passes for all packages; no `any` types unless necessary
  - **Dependencies**: After all phases
  - **Tests**: CI check
  - **Estimated effort**: S

- [ ] **5.13** Create manual QA checklist
  - **Acceptance**: Document with checkboxes for CLI, web, dashboard, MCP transport testing
  - **Dependencies**: After Phases 3–4
  - **Estimated effort**: S

- [ ] **5.14** Run full backward compatibility test
  - **Acceptance**: v3.x session files work with v4.x CLI; STDIO behavior unchanged
  - **Dependencies**: After Phase 2
  - **Manual QA**: Load old sessions into new CLI
  - **Estimated effort**: S

### Final Validation

- [ ] **5.15** Code review & team sign-off
  - **Acceptance**: All code reviewed; no blocking issues; team agrees on design
  - **Dependencies**: After all phases
  - **Estimated effort**: M

- [ ] **5.16** Prepare release notes and marketing materials
  - **Acceptance**: Release notes explain new web features; screenshots of dashboard
  - **Dependencies**: After all phases
  - **Estimated effort**: S

- [ ] **5.17** Release v4.0.0
  - **Acceptance**: npm publish succeeds; GitHub release created; announcement posted
  - **Dependencies**: After 5.15, 5.8
  - **Estimated effort**: S

---

## Task Dependencies & Parallelization

### Dependency Graph

```
Phase 1 (Core extraction)
    ↓
Phase 2 (CLI separation) ────→ Phase 3 (Web server)
                                     ↓
                              Phase 4 (Dashboard)
                                     ↓
                         Phase 5 (Cross-phase tasks)
```

**Parallelization opportunities**:

- Phase 3 and Phase 4 can run partially in parallel (API routes in 3.12–3.15 before components in 4.2–4.12)
- Documentation (5.1–5.5) can start during Phase 4
- Cross-phase tasks (5.6–5.17) mostly sequential (depend on completion of all phases)

### Critical Path

1. Phase 1: Core extraction (blocks everything)
2. Phase 2: CLI separation (blocks release; not blocker for Phase 3)
3. Phase 3: Web server (blocks Phase 4)
4. Phase 4: Dashboard (final feature completion)
5. Phase 5: Documentation & release (final sign-off)

**Estimated total: 5–8 working days**

---

## Success Criteria Mapping

### Phase 1 Success

- ✅ All code in `packages/core/`; no functionality changes
- ✅ FileStore implementation passes StorageAdapterTestSuite
- ✅ EventEmitter events fire correctly
- ✅ Core exports available; no import errors

### Phase 2 Success

- ✅ CLI code in `packages/cli/`; STDIO behavior identical
- ✅ `auq` command works as before
- ✅ TUI renders correctly
- ✅ File-based sessions detected by FileWatcher
- ✅ `auq-mcp-server` package can be published

### Phase 3 Success

- ✅ Next.js server starts without errors
- ✅ SQLiteStore passes StorageAdapterTestSuite
- ✅ `/api/sessions`, `/api/sessions/[id]`, `/api/sessions/[id]/answer` routes work
- ✅ MCP client can connect via `/api/mcp` and call tools
- ✅ `/api/sse` delivers real-time events
- ✅ Database initializes correctly; old sessions auto-migrated
- ✅ No performance regression vs. FileStore

### Phase 4 Success

- ✅ Dashboard loads; session list displays
- ✅ Clicking "View" shows question stepper
- ✅ Answering questions works end-to-end
- ✅ History page shows answers correctly
- ✅ SSE updates appear in real-time (new questions trigger dashboard refresh)
- ✅ Responsive on mobile; accessible (WCAG 2.1 AA)

### Phase 5 Success

- ✅ All packages build successfully; tests pass
- ✅ Documentation complete and accurate
- ✅ CI/CD pipeline updated and green
- ✅ v4.0.0 released to npm
- ✅ Backward compatibility verified (old sessions work in new version)

---

## Notes & Tips

### For Task Owners

1. **Read design.md first** — understand architecture before starting tasks
2. **Run tests frequently** — catch integration issues early
3. **Update tasks as you go** — mark [ ] → [x] immediately after completion
4. **Document blockers** — if stuck, note the issue and move to next independent task
5. **Cross-phase communication** — if Phase 2 needs Phase 3 feature, flag it early

### Common Pitfalls

- **FileStore atomicity** — ensure rename-based atomic writes are preserved in refactor
- **SQLiteStore concurrency** — better-sqlite3 is single-threaded; don't add parallel inserts
- **EventEmitter cleanup** — always unsubscribe from events on component unmount (React)
- **TypeScript type safety** — ensure StorageAdapter implementations match interface exactly
- **Backward compatibility** — test loading v3.x session files in v4.x code

### Testing Approach

- **Unit**: Test each store implementation against StorageAdapterTestSuite
- **Integration**: Test SessionManager with both FileStore and SQLiteStore
- **API**: Test routes with mock database
- **Component**: Test React components with React Testing Library
- **Manual QA**: Test full user flows (CLI TUI, web dashboard, MCP client)

---

## Appendix: Estimated Timeline

| Phase     | Tasks               | Days                 | Notes                                     |
| --------- | ------------------- | -------------------- | ----------------------------------------- |
| 1         | 1.1–1.19 (19 tasks) | 1–2                  | Core extraction; most refactoring         |
| 2         | 2.1–2.15 (15 tasks) | 1                    | Move existing code; verify compatibility  |
| 3         | 3.1–3.25 (25 tasks) | 2–3                  | Next.js setup; MCP transport; SQLite; SSE |
| 4         | 4.1–4.23 (23 tasks) | 2                    | React components; styling; QA             |
| 5         | 5.1–5.17 (17 tasks) | 1–2                  | Docs; build config; release               |
| **Total** | **99 tasks**        | **5–8 working days** | Parallel phases 3–4 possible              |

**Effort distribution**: ~40% backend (Phase 1–3), ~40% frontend (Phase 4), ~20% ops/docs (Phase 5)
