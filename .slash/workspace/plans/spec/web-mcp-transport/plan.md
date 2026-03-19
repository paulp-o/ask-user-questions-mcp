---
created: 2026-03-19T00:00:00Z
last_updated: 2026-03-19T00:00:00Z
type: spec
change_id: web-mcp-transport
status: pending
trigger: "Convert auq-mcp-server from monolithic STDIO-only MCP server to monorepo with core/cli/web packages supporting web-based question answering via Streamable HTTP transport and dashboard UI"
---

# Plan: Web MCP Transport — Monorepo Restructure & Web Server

## Background & Research

### Current Project Structure

The project is `auq-mcp-server` v3.4.0, a single-package MCP server published on npm. It already has a partial monorepo with `packages/opencode-plugin` in Bun workspaces.

**Root package.json** (key fields):

```json
{
  "name": "auq-mcp-server",
  "version": "3.4.0",
  "main": "dist/index.js",
  "bin": { "auq": "bin/auq" },
  "type": "module",
  "workspaces": ["packages/opencode-plugin"],
  "scripts": {
    "build": "bun run sync-plugin-schemas && bun run generate:skill && tsc && tsc -p tsconfig.opentui.json",
    "start": "bun run src/server.ts",
    "dev": "bunx fastmcp dev src/server.ts",
    "test": "vitest run",
    "lint": "prettier --check . && eslint . && tsc --noEmit"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "1.17.2",
    "fastmcp": "^3.23.0",
    "ink": "^6.4.0",
    "react": "^19.2.0",
    "uuid": "^13.0.0",
    "zod": "^4.1.13"
  }
}
```

**vitest config** excludes: `opensrc/**`, `node_modules/**`, `dist/**`, `oc-docs-for-references/**`, `src/tui-opentui/**`.

### Key Source Files to Migrate

**`src/core/ask-user-questions.ts`** — Core business logic factory (172 lines):

```typescript
import type { Question } from "../session/types.js";
import { SessionManager } from "../session/index.js";
import { ResponseFormatter } from "../session/ResponseFormatter.js";
import { getSessionDirectory } from "../session/utils.js";
import {
  AskUserQuestionsParametersSchema,
  QuestionSchema,
  QuestionsSchema,
  type QuestionInput,
} from "../shared/schemas.js";

export type AskUserQuestionsCore = {
  ask: (
    questions: QuestionInput[],
    callId?: string,
    workingDirectory?: string,
    signal?: AbortSignal,
  ) => Promise<{ formattedResponse: string; sessionId: string }>;
  askNonBlocking: (
    questions: QuestionInput[],
    callId?: string,
    workingDirectory?: string,
  ) => Promise<{ sessionId: string; questionCount: number }>;
  getAnsweredQuestions: (
    sessionId: string,
    blocking?: boolean,
    signal?: AbortSignal,
  ) => Promise<{
    formattedResponse: string;
    sessionId: string;
    status: string;
  }>;
  cleanupExpiredSessions: () => Promise<number>;
  ensureInitialized: () => Promise<void>;
  markAbandoned: (sessionId: string) => Promise<void>;
};

export type AskUserQuestionsCoreOptions = {
  baseDir?: string;
  sessionManager?: SessionManager;
};

export const createAskUserQuestionsCore = (
  options: AskUserQuestionsCoreOptions = {},
): AskUserQuestionsCore => {
  const baseDir = options.baseDir ?? getSessionDirectory();
  const sessionManager =
    options.sessionManager ?? new SessionManager({ baseDir });
  // ... normalizeQuestions, ask, askNonBlocking, getAnsweredQuestions, etc.
};
```

**`src/session/types.ts`** — Session type definitions (103 lines):

```typescript
export interface Option {
  description?: string;
  label: string;
}

export interface Question {
  options: Option[];
  prompt: string;
  title: string;
  multiSelect?: boolean;
}

export interface SessionAnswer {
  answers: UserAnswer[];
  sessionId: string;
  timestamp: string;
  callId?: string;
  workingDirectory?: string;
  lastReadAt?: string;
}

export interface SessionConfig {
  baseDir: string;
  maxSessions?: number;
  retentionPeriod?: number; // in milliseconds
  sessionTimeout?: number; // in milliseconds
}

export interface SessionRequest {
  questions: Question[];
  sessionId: string;
  status:
    | "completed"
    | "elaborate_requested"
    | "in-progress"
    | "pending"
    | "rejected"
    | "rephrase_requested"
    | "timed_out";
  timestamp: string;
  callId?: string;
  workingDirectory?: string;
}

export interface SessionStatus {
  createdAt: string;
  currentQuestionIndex?: number;
  lastModified: string;
  sessionId: string;
  status:
    | "abandoned"
    | "completed"
    | "elaborate_requested"
    | "in-progress"
    | "pending"
    | "rejected"
    | "rephrase_requested"
    | "timed_out";
  totalQuestions: number;
  callId?: string;
  rejectionReason?: string | null;
  workingDirectory?: string;
}

export interface UserAnswer {
  customText?: string;
  questionIndex: number;
  selectedOption?: string;
  selectedOptions?: string[];
  timestamp: string;
}

export const SESSION_FILES = {
  ANSWERS: "answers.json",
  REQUEST: "request.json",
  STATUS: "status.json",
} as const;

export const DEFAULT_SESSION_CONFIG: Partial<SessionConfig> = {
  baseDir: "~/.local/share/auq/sessions",
  maxSessions: 100,
  retentionPeriod: 604800000, // 7 days
  sessionTimeout: 0, // infinite
};
```

**`src/session/SessionManager.ts`** — Core session manager (855 lines):

```typescript
import { promises as fs } from "fs";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";
import type {
  Question,
  SessionAnswer,
  SessionConfig,
  SessionRequest,
  SessionStatus,
} from "./types.js";
import {
  atomicDeleteFile,
  AtomicOperationError,
  AtomicReadError,
  atomicReadFile,
  AtomicWriteError,
  atomicWriteFile,
} from "./atomic-operations.js";
import { ResponseFormatter } from "./ResponseFormatter.js";
import { DEFAULT_SESSION_CONFIG, SESSION_FILES } from "./types.js";
import {
  createSafeFilename,
  ensureDirectoryExists,
  fileExists,
  getCurrentTimestamp,
  isTimestampExpired,
  resolveSessionDirectory,
  sanitizeSessionId,
  validateSessionDirectory,
} from "./utils.js";

export class SessionManager {
  private baseDir: string;
  private config: SessionConfig;
  private sessionsDir: string;

  constructor(config: Partial<SessionConfig> = {}) {
    this.config = { ...DEFAULT_SESSION_CONFIG, ...config } as SessionConfig;
    this.baseDir = resolveSessionDirectory(this.config.baseDir);
    this.sessionsDir = this.baseDir;
  }
  // Key methods: initialize(), createSession(), startSession(), waitForAnswers(),
  // saveSessionAnswers(), cleanupExpiredSessions(), getSessionStatus(), etc.
}
```

**`src/session/atomic-operations.ts`** — Atomic file ops (385 lines):

```typescript
import { constants, copyFile, rename } from "fs";
import { promises as fs } from "fs";
import { tmpdir } from "os";
import { join } from "path";

export interface AtomicWriteOptions {
  encoding?: BufferEncoding;
  flag?: string;
  maxRetries?: number;
  mode?: number;
  retryDelay?: number;
  tmpDir?: string;
}

export class AtomicOperationError extends Error {
  /* ... */
}
export class AtomicReadError extends AtomicOperationError {
  /* ... */
}
export class AtomicWriteError extends AtomicOperationError {
  /* ... */
}
export class FileLockError extends AtomicOperationError {
  /* ... */
}

// atomicWriteFile: writes to temp file, then renames atomically
// atomicReadFile: reads with retry logic
// atomicDeleteFile: delete with error handling
```

**`src/session/utils.ts`** — Session utility functions (165 lines):

```typescript
// createSafeFilename, ensureDirectoryExists, fileExists,
// getCurrentTimestamp, isTimestampExpired, resolveSessionDirectory,
// sanitizeSessionId, validateSessionDirectory, getSessionDirectory
```

**`src/shared/schemas.ts`** — Zod validation schemas (174 lines):

```typescript
import { z } from "zod";

export const SCHEMA_LIMITS = {
  MAX_OPTIONS: 10,
  MAX_QUESTIONS: 10,
  MIN_OPTIONS: 2,
  MIN_QUESTIONS: 1,
};
export const DEFAULT_LIMITS = {
  maxOptions: 5,
  maxQuestions: 5,
  recommendedOptions: 4,
  recommendedQuestions: 4,
};

export const OptionSchema = z.object({
  label: z.string(),
  description: z.string().optional(),
});
export function createQuestionSchema(maxOptions) {
  /* ... */
}
export const QuestionSchema = createQuestionSchema();
export function createQuestionsSchema(maxQuestions, maxOptions) {
  /* ... */
}
export const QuestionsSchema = createQuestionsSchema();
export function createAskUserQuestionsParametersSchema(
  maxQuestions,
  maxOptions,
) {
  /* ... */
}
export const AskUserQuestionsParametersSchema =
  createAskUserQuestionsParametersSchema();
export type QuestionInput = z.infer<typeof QuestionSchema>;
```

**`src/session/ResponseFormatter.ts`** — Response formatting (374 lines):

```typescript
export class ResponseFormatter {
  // formatSuccessResponse(), formatNonBlockingResponse(),
  // formatGetAnsweredResponse(), formatRejectionResponse(), etc.
}
```

**`src/server.ts`** — Main MCP server (238 lines):

```typescript
// Uses FastMCP framework
// Implements ask_user_questions and get_answered_questions tools
// Handles blocking/non-blocking modes, AbortController for disconnect
```

**`src/config/`** directory files:

- `types.ts` — AUQConfig type (47 lines)
- `ConfigLoader.ts` — XDG-compliant config loading (159 lines)
- `defaults.ts` — Default config values (24 lines)
- `index.ts` — Module exports (10 lines)

### Key Source Files Staying in CLI

**`src/tui/`** directory (Ink/React TUI components):

- `components/` — UI components
- `shared/` — Shared utilities
- `themes/` — Theme definitions
- `notifications/` — Notification system
- `session-watcher.ts` — FileWatcher for detecting new sessions
- `ConfigContext.tsx`, `ThemeContext.tsx`, `ThemeProvider.tsx`
- `theme.ts`, `types.ts`, `constants/`

**`src/cli/`** directory:

- `commands/` — CLI commands (auq list, auq clear, etc.)
- `pagination.ts`, `utils.ts`

**`src/update/`** directory:

- `checker.ts`, `installer.ts`, `cache.ts`, `changelog.ts`, `version.ts`
- `package-manager.ts`, `types.ts`, `index.ts`

**`src/i18n/`** — Internationalization system

**`bin/`** directory:

- `auq.tsx` — Main CLI entry point
- `auq` — Executable script
- `tui-app.tsx` — TUI application entry point

### Design Decisions (from spec)

1. **StorageAdapter** interface with `create`, `read`, `update`, `list`, `delete`, `initialize`, `shutdown` methods
2. **FileStore** implements StorageAdapter using existing atomic file operations
3. **SQLiteStore** implements StorageAdapter using Drizzle ORM + better-sqlite3
4. **EventEmitter** for session lifecycle events (`session:created`, `session:answered`, `session:rejected`, `session:timeout`)
5. **SessionManager** refactored to accept `StorageAdapter` + `EventEmitter` in constructor
6. **MCP Transport**: Streamable HTTP via `@modelcontextprotocol/sdk` StreamableHTTPServerTransport
7. **SSE** for real-time browser notifications
8. **Web**: Next.js 15 + App Router + shadcn/ui + Tailwind CSS
9. **Monorepo**: Turborepo + Bun workspaces

### Constraints

- CLI package **must** keep `auq-mcp-server` npm name for backward compatibility
- Core package is `@auq/core` (internal workspace dependency, not published separately)
- No auth in web server initially (local/single-user)
- FileStore must preserve atomic rename-based writes
- SQLiteStore uses better-sqlite3 (single-threaded, no parallel inserts)
- Tests use Vitest throughout
- `turbo.json` does NOT exist yet — needs to be created
- Current SessionManager is 855 lines with tightly-coupled file I/O — major refactor needed

---

## Testing Plan (TDD — tests first)

### Phase 1: Core Package Tests

- [ ] **T1.1** Create `packages/core/__tests__/storage-adapter.test.ts` — reusable StorageAdapter compliance test suite that validates `create`, `read`, `update`, `list`, `delete`, `initialize`, `shutdown` against any implementation
- [ ] **T1.2** Create `packages/core/__tests__/file-store.test.ts` — run StorageAdapterTestSuite against FileStore; test atomic write preservation, error handling, directory creation
- [ ] **T1.3** Create `packages/core/__tests__/events.test.ts` — test `createSessionEventEmitter()` factory, verify typed events (`session:created`, `session:answered`, `session:rejected`, `session:timeout`) fire correctly
- [ ] **T1.4** Create `packages/core/__tests__/session-manager.test.ts` — test refactored SessionManager with mock StorageAdapter; verify `createSession`, `answerSession`, `rejectSession`, `listSessions`, `getSession` methods and event emission
- [ ] **T1.5** Create `packages/core/__tests__/schemas.test.ts` — verify all Zod schemas validate correctly after migration (OptionSchema, QuestionSchema, QuestionsSchema, AskUserQuestionsParametersSchema)
- [ ] **T1.6** Create `packages/core/__tests__/response-formatter.test.ts` — verify ResponseFormatter output matches existing behavior
- [ ] **T1.7** Create `packages/core/__tests__/config.test.ts` — verify ConfigLoader and defaults work after migration

### Phase 2: CLI Package Tests

- [ ] **T2.1** Create `packages/cli/__tests__/server.test.ts` — verify STDIO MCP server starts, registers tools (`ask_user_questions`, `get_answered_questions`), handles calls via `@auq/core` imports
- [ ] **T2.2** Migrate existing TUI tests from `src/tui/__tests__/` to `packages/cli/__tests__/tui/` — verify components render correctly with updated imports

### Phase 3: Web Package Tests

- [ ] **T3.1** Create `packages/web/__tests__/sqlite-store.test.ts` — run StorageAdapterTestSuite against SQLiteStore; test Drizzle ORM integration, serialization/deserialization
- [ ] **T3.2** Create `packages/web/__tests__/api/sessions.test.ts` — test `GET /api/sessions` (list, filter by status), `GET /api/sessions/[id]` (detail, 404), `POST /api/sessions/[id]/answer` (submit, validation), `DELETE /api/sessions/[id]`
- [ ] **T3.3** Create `packages/web/__tests__/api/sse.test.ts` — test SSE endpoint returns ReadableStream, emits events on session changes, handles client disconnect
- [ ] **T3.4** Create `packages/web/__tests__/api/mcp.test.ts` — test Streamable HTTP MCP transport handles POST requests, routes to correct tools
- [ ] **T3.5** Create `packages/web/__tests__/db-init.test.ts` — test database initialization creates tables, handles migration from file-based sessions

### Phase 4: Dashboard Tests

- [ ] **T4.1** Create `packages/web/__tests__/components/SessionList.test.tsx` — test rendering with mock data, filter interaction, SSE integration, row actions
- [ ] **T4.2** Create `packages/web/__tests__/components/QuestionStepper.test.tsx` — test question rendering (single-select, multi-select, custom), navigation, review screen, submission
- [ ] **T4.3** Create `packages/web/__tests__/components/SessionHistory.test.tsx` — test timeline rendering, answer display, JSON export

---

## Implementation Plan

### Phase 1: Core Package Extraction (Tasks 1.1–1.19)

#### Setup & Structure

- [ ] **1.1** Create `packages/core/` directory structure: `src/core/`, `src/session/`, `src/session/stores/`, `src/shared/`, `src/config/`, `__tests__/`
- [ ] **1.2** Create `packages/core/package.json` with name `@auq/core`, dependencies (`zod`, `uuid`), TypeScript config, exports field pointing to `src/index.ts`
- [ ] **1.3** Create `packages/core/tsconfig.json` extending root `@tsconfig/node22`, with `composite: true` for project references

#### Schemas, Types & Config (no dependencies, move first)

- [ ] **1.4** Copy `src/shared/schemas.ts` to `packages/core/src/shared/schemas.ts` — preserve all Zod schemas unchanged
- [ ] **1.5** Copy `src/session/types.ts` to `packages/core/src/shared/types.ts` — all session interfaces, types, constants (Option, Question, SessionAnswer, SessionConfig, SessionRequest, SessionStatus, UserAnswer, SESSION_FILES, DEFAULT_SESSION_CONFIG)
- [ ] **1.6** Create `packages/core/src/shared/index.ts` — re-export all from `./schemas` and `./types`
- [ ] **1.7** Copy `src/config/types.ts`, `src/config/defaults.ts`, `src/config/ConfigLoader.ts` to `packages/core/src/config/` — update internal imports
- [ ] **1.8** Create `packages/core/src/config/index.ts` — re-export config types and ConfigLoader

#### Storage Abstraction

- [ ] **1.9** Create `packages/core/src/session/StorageAdapter.ts` — define `StorageAdapter` interface with methods: `create(session): Promise<string>`, `read(sessionId): Promise<Session>`, `update(sessionId, updates): Promise<void>`, `list(filter?): Promise<Session[]>`, `delete(sessionId): Promise<void>`, `initialize(): Promise<void>`, `shutdown(): Promise<void>`
- [ ] **1.10** Create `packages/core/src/session/stores/FileStore.ts` — implement `StorageAdapter` by extracting file I/O logic from current `SessionManager.ts`; preserve atomic rename-based writes using `atomic-operations.ts`; handle `request.json`, `status.json`, `answers.json` per session directory
- [ ] **1.11** Copy `src/session/atomic-operations.ts` to `packages/core/src/session/atomic-operations.ts` — preserve all error classes and atomic read/write/delete functions
- [ ] **1.12** Copy `src/session/utils.ts` to `packages/core/src/session/utils.ts` — preserve all utility functions (resolveSessionDirectory, ensureDirectoryExists, fileExists, etc.)

#### Event System

- [ ] **1.13** Create `packages/core/src/session/events.ts` — typed `SessionEventEmitter` wrapping Node.js EventEmitter with events: `session:created`, `session:answered`, `session:rejected`, `session:timeout`; export `createSessionEventEmitter()` factory

#### Session Manager Refactor

- [ ] **1.14** Create `packages/core/src/session/SessionManager.ts` — refactor from 855-line monolith to accept `StorageAdapter` and `EventEmitter` in constructor; delegate all file I/O to StorageAdapter; emit events on state changes; preserve `createSession`, `waitForAnswers`, `saveSessionAnswers`, `cleanupExpiredSessions` business logic
- [ ] **1.15** Copy `src/session/ResponseFormatter.ts` to `packages/core/src/session/ResponseFormatter.ts` — preserve formatting logic unchanged

#### Core Business Logic

- [ ] **1.16** Copy `src/core/ask-user-questions.ts` to `packages/core/src/core/ask-user-questions.ts` — update imports to use local paths within packages/core; preserve `AskUserQuestionsCore` type and `createAskUserQuestionsCore` factory

#### Exports & Integration

- [ ] **1.17** Create `packages/core/src/index.ts` — export SessionManager, StorageAdapter, FileStore, createSessionEventEmitter, all schemas, all types, ResponseFormatter, ConfigLoader, createAskUserQuestionsCore
- [ ] **1.18** Update root `package.json` workspaces to `["packages/core", "packages/opencode-plugin"]`
- [ ] **1.19** Run `bun install` to link workspace; verify `tsc --noEmit` passes for packages/core

### Phase 2: CLI Package Separation (Tasks 2.1–2.15)

#### Setup

- [ ] **2.1** Create `packages/cli/` directory structure: `src/`, `src/tui/`, `src/cli/`, `src/i18n/`, `src/update/`, `bin/`, `__tests__/`
- [ ] **2.2** Create `packages/cli/package.json` with name `auq-mcp-server` version `4.0.0`, dependency on `@auq/core: "workspace:*"`, bin entry for `auq`, same runtime dependencies (ink, react, fastmcp, etc.)
- [ ] **2.3** Create `packages/cli/tsconfig.json` extending root config, with project reference to `packages/core`

#### Move CLI Code

- [ ] **2.4** Move `src/server.ts` to `packages/cli/src/server.ts` — update imports to `@auq/core` for SessionManager, FileStore, schemas, types
- [ ] **2.5** Move `src/tui/` directory to `packages/cli/src/tui/` — update all imports to `@auq/core` for shared types/schemas
- [ ] **2.6** Move `src/cli/` directory to `packages/cli/src/cli/` — update imports
- [ ] **2.7** Move `src/i18n/` directory to `packages/cli/src/i18n/`
- [ ] **2.8** Move `src/update/` directory to `packages/cli/src/update/`
- [ ] **2.9** Move `bin/auq.tsx`, `bin/auq`, `bin/tui-app.tsx` to `packages/cli/bin/`
- [ ] **2.10** Move `src/session/file-watcher.ts` to `packages/cli/src/session-watcher.ts` — this is CLI-specific (watches filesystem for TUI)
- [ ] **2.11** Move `src/add.ts` to `packages/cli/src/add.ts` if still used

#### Build & Config

- [ ] **2.12** Update `packages/cli/package.json` with build scripts, files array for npm publish, main/exports fields
- [ ] **2.13** Update root `package.json` workspaces to `["packages/core", "packages/cli", "packages/opencode-plugin"]`
- [ ] **2.14** Create `turbo.json` at project root with build pipeline: `core` → `cli` → `web`; define `build`, `test`, `lint` tasks with proper dependencies

#### Cleanup & Verification

- [ ] **2.15** Remove migrated source files from root `src/` and `bin/` (only after verifying packages/cli works)
- [ ] **2.16** Verify `bun install && bun run build` succeeds for both core and cli packages
- [ ] **2.17** Verify `auq` CLI command works identically to v3.x (STDIO server, TUI, `auq list`, `auq clear`)

### Phase 3: Web Server Package (Tasks 3.1–3.25)

#### Setup

- [ ] **3.1** Create `packages/web/` with Next.js 15 App Router structure: `src/app/`, `src/app/api/`, `src/lib/`, `src/components/`, `__tests__/`
- [ ] **3.2** Create `packages/web/package.json` with dependencies: `next`, `react`, `react-dom`, `@auq/core: "workspace:*"`, `better-sqlite3`, `drizzle-orm`, `drizzle-kit`, `@modelcontextprotocol/sdk`, `tailwindcss`, plus shadcn/ui dependencies
- [ ] **3.3** Create `packages/web/tsconfig.json` with Next.js settings, project reference to `packages/core`
- [ ] **3.4** Create `packages/web/next.config.ts` with required settings (transpilePackages for `@auq/core`)
- [ ] **3.5** Create `packages/web/tailwind.config.ts` with shadcn/ui preset and content paths
- [ ] **3.6** Create `packages/web/src/app/globals.css` with Tailwind directives
- [ ] **3.7** Initialize shadcn/ui in `packages/web/` — install needed components (Button, Table, Tabs, Badge, Input, RadioGroup, Checkbox, Progress, Card)

#### Database

- [ ] **3.8** Create `packages/web/src/lib/schema.ts` — Drizzle table definitions for `sessions` (id, request, status, answers, rejectReason, createdAt, updatedAt, expiresAt) and `session_history` (id, sessionId, event, timestamp, metadata)
- [ ] **3.9** Create `packages/web/src/lib/db.ts` — Drizzle client initialization with better-sqlite3; configurable DB path via env var `DATABASE_URL` (default: `~/.local/share/auq/sessions.db`)
- [ ] **3.10** Create `packages/web/src/lib/init.ts` — database initialization: run Drizzle migrations (push schema), optionally import old file-based sessions from FileStore
- [ ] **3.11** Create `packages/web/src/lib/stores/SQLiteStore.ts` — implement `StorageAdapter` interface using Drizzle ORM; handle JSON serialization for `request` and `answers` columns; write to `session_history` on state changes

#### MCP Transport

- [ ] **3.12** Create `packages/web/src/lib/mcp-transport.ts` — `createMcpServer(sessionManager)` factory that registers `ask_user_questions` (non-blocking, returns sessionId) and `get_answered_questions` tools using `@modelcontextprotocol/sdk` Server
- [ ] **3.13** Create `packages/web/src/app/api/mcp/route.ts` — POST handler using `StreamableHTTPServerTransport` to handle MCP requests

#### SSE

- [ ] **3.14** Create `packages/web/src/lib/sse-emitter.ts` — SSE connection manager that listens to SessionManager EventEmitter and broadcasts to all connected SSE clients; handle client tracking and cleanup
- [ ] **3.15** Create `packages/web/src/app/api/sse/route.ts` — GET handler returning ReadableStream with SSE events; 30s keepalive ping; handle abort/disconnect

#### REST API

- [ ] **3.16** Create `packages/web/src/app/api/sessions/route.ts` — `GET /api/sessions` with optional `?status=` filter; returns JSON array of session summaries
- [ ] **3.17** Create `packages/web/src/app/api/sessions/[id]/route.ts` — `GET /api/sessions/[id]` returns full session detail; 404 if not found
- [ ] **3.18** Create `packages/web/src/app/api/sessions/[id]/answer/route.ts` — `POST /api/sessions/[id]/answer` accepts answers JSON, updates session status to completed
- [ ] **3.19** Create `packages/web/src/app/api/sessions/[id]/route.ts` — add `DELETE` handler to delete a session

#### Shared State

- [ ] **3.20** Create `packages/web/src/lib/server-state.ts` — singleton pattern for shared SessionManager + EventEmitter + SQLiteStore instances; lazy initialization on first request

#### Build

- [ ] **3.21** Update root `package.json` workspaces to include `packages/web`
- [ ] **3.22** Update `turbo.json` to include web package in build pipeline
- [ ] **3.23** Add `dev`, `build`, `start` scripts to `packages/web/package.json`
- [ ] **3.24** Verify `turbo build` runs all packages; Next.js dev server starts without errors

### Phase 4: Dashboard UI (Tasks 4.1–4.23)

#### Layout & Navigation

- [ ] **4.1** Create `packages/web/src/app/layout.tsx` — root layout with html/body, import globals.css, minimal header with "AUQ Dashboard" title and nav links
- [ ] **4.2** Create `packages/web/src/components/Header.tsx` — header with navigation (Sessions link, logo/title)

#### Session List Page

- [ ] **4.3** Create `packages/web/src/app/page.tsx` — session list page rendering SessionList component
- [ ] **4.4** Create `packages/web/src/components/SessionList.tsx` — table with columns (Session ID, Status badge, Question Count, Created At, Actions); fetch from `GET /api/sessions`
- [ ] **4.5** Add status filter tabs to SessionList (All / Pending / Completed / Rejected) using shadcn Tabs; update API call with `?status=` parameter
- [ ] **4.6** Add SSE integration to SessionList — connect to `/api/sse`, refresh list on `session-created` and `session-answered` events; auto-reconnect
- [ ] **4.7** Add row actions to SessionList — View button (links to `/sessions/[id]`), Delete button (calls `DELETE /api/sessions/[id]`)

#### Question Answering Page

- [ ] **4.8** Create `packages/web/src/app/sessions/[id]/page.tsx` — fetch session from `GET /api/sessions/[id]`, render QuestionStepper if pending, show completed state if already answered
- [ ] **4.9** Create `packages/web/src/components/QuestionStepper.tsx` — stepper with progress bar ("Question 1 of N"), Back/Next navigation, Submit button on last step
- [ ] **4.10** Implement question type renderers in QuestionStepper — RadioGroup for single-select, Checkbox group for multi-select, Input for custom text ("Other" option)
- [ ] **4.11** Implement review screen in QuestionStepper — summary of all questions and selected answers, edit buttons to go back, final Submit button
- [ ] **4.12** Implement answer submission — POST to `/api/sessions/[id]/answer` with answers JSON; show success toast; redirect to session list

#### History View

- [ ] **4.13** Create `packages/web/src/app/sessions/[id]/history/page.tsx` — fetch session details, render SessionHistory component
- [ ] **4.14** Create `packages/web/src/components/SessionHistory.tsx` — timeline of events (created, answered, rejected) with timestamps; show question/answer details
- [ ] **4.15** Add JSON export button to SessionHistory — download session data as JSON file

#### Polish

- [ ] **4.16** Add loading states (skeleton screens for session list, spinner for form submission)
- [ ] **4.17** Add error states (failed API calls show error message with retry button, 404 for missing sessions)
- [ ] **4.18** Responsive design — mobile-friendly layout, scrollable tables, touch-friendly buttons
- [ ] **4.19** Keyboard navigation and basic accessibility (WCAG 2.1 AA)

### Phase 5: Cross-Phase Tasks (Tasks 5.1–5.17)

#### Build & Release

- [ ] **5.1** Finalize `turbo.json` with caching config, pipeline dependencies, output directories
- [ ] **5.2** Update root `package.json` scripts: `dev` (starts both CLI and web), `build` (turbo build), `test` (turbo test), `lint` (turbo lint)
- [ ] **5.3** Configure semantic-release for v4.0.0 — update to publish `auq-mcp-server` from `packages/cli` directory
- [ ] **5.4** Update GitHub CI/CD pipeline — run tests for all packages, lint, build

#### Quality

- [ ] **5.5** Verify `tsc --noEmit` passes for all packages (core, cli, web)
- [ ] **5.6** Verify all unit tests pass across all packages (>80% coverage)
- [ ] **5.7** Run full backward compatibility test — load v3.x session files in v4.x CLI
- [ ] **5.8** Manual QA: CLI TUI works, web dashboard loads, MCP client connects via HTTP, SSE updates in real-time

#### Documentation

- [ ] **5.9** Create migration guide for v3.x → v4.x users
- [ ] **5.10** Create web server setup documentation
- [ ] **5.11** Create API documentation for HTTP MCP and REST endpoints
- [ ] **5.12** Write architecture ADR in `openspec/`

---

## Parallelization Plan

### Batch 1 — Core Package Setup & Static Assets (parallel)

- [ ] **Coder A**: Tasks 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8 (setup dirs, package.json, tsconfig, copy schemas/types/config)
      → files: `packages/core/package.json`, `packages/core/tsconfig.json`, `packages/core/src/shared/*`, `packages/core/src/config/*`

- [ ] **Coder B**: Tasks T1.3, T1.5, T1.7 (write test stubs for events, schemas, config — can be written before implementation using spec interfaces)
      → files: `packages/core/__tests__/events.test.ts`, `packages/core/__tests__/schemas.test.ts`, `packages/core/__tests__/config.test.ts`

### Batch 2 — Core Storage & Events (parallel, after Batch 1)

- [ ] **Coder A**: Tasks 1.9, 1.10, 1.11, 1.12 (StorageAdapter interface, FileStore implementation, atomic-operations, utils)
      → files: `packages/core/src/session/StorageAdapter.ts`, `packages/core/src/session/stores/FileStore.ts`, `packages/core/src/session/atomic-operations.ts`, `packages/core/src/session/utils.ts`

- [ ] **Coder B**: Tasks 1.13, T1.1, T1.2 (EventEmitter wrapper, StorageAdapter test suite, FileStore tests)
      → files: `packages/core/src/session/events.ts`, `packages/core/__tests__/storage-adapter.test.ts`, `packages/core/__tests__/file-store.test.ts`

### Batch 3 — Core SessionManager & Business Logic (sequential, after Batch 2)

- [ ] **Coder A**: Tasks 1.14, 1.15, 1.16, 1.17, T1.4, T1.6 (SessionManager refactor, ResponseFormatter, ask-user-questions core, index.ts, remaining tests)
      → files: `packages/core/src/session/SessionManager.ts`, `packages/core/src/session/ResponseFormatter.ts`, `packages/core/src/core/ask-user-questions.ts`, `packages/core/src/index.ts`, `packages/core/__tests__/session-manager.test.ts`, `packages/core/__tests__/response-formatter.test.ts`

### Batch 4 — Core Integration & CLI Setup (parallel, after Batch 3)

- [ ] **Coder A**: Tasks 1.18, 1.19 (update root workspaces, verify core builds)
      → files: `package.json` (root — workspaces field only)

- [ ] **Coder B**: Tasks 2.1, 2.2, 2.3, 2.14 (CLI package setup, turbo.json)
      → files: `packages/cli/package.json`, `packages/cli/tsconfig.json`, `turbo.json`

### Batch 5 — CLI Migration (single agent, after Batch 4)

- [ ] **Coder A**: Tasks 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12, 2.13, T2.1, T2.2 (move all CLI code, update imports, build scripts, tests)
      → files: `packages/cli/src/**`, `packages/cli/bin/**`, `packages/cli/__tests__/**`, `package.json` (root — workspaces)

### Batch 6 — CLI Cleanup & Web Setup (parallel, after Batch 5)

- [ ] **Coder A**: Tasks 2.15, 2.16, 2.17 (remove old src files, verify CLI works)
      → files: `src/` (deletion), root build verification

- [ ] **Coder B**: Tasks 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7 (Next.js project setup, tailwind, shadcn)
      → files: `packages/web/package.json`, `packages/web/tsconfig.json`, `packages/web/next.config.ts`, `packages/web/tailwind.config.ts`, `packages/web/src/app/globals.css`

### Batch 7 — Web Database & MCP Transport (parallel, after Batch 6)

- [ ] **Coder A**: Tasks 3.8, 3.9, 3.10, 3.11, T3.1, T3.5 (Drizzle schema, db client, init, SQLiteStore, tests)
      → files: `packages/web/src/lib/schema.ts`, `packages/web/src/lib/db.ts`, `packages/web/src/lib/init.ts`, `packages/web/src/lib/stores/SQLiteStore.ts`, `packages/web/__tests__/sqlite-store.test.ts`, `packages/web/__tests__/db-init.test.ts`

- [ ] **Coder B**: Tasks 3.12, 3.13, 3.14, 3.15, 3.20, T3.3, T3.4 (MCP transport, SSE emitter, server state singleton, tests)
      → files: `packages/web/src/lib/mcp-transport.ts`, `packages/web/src/app/api/mcp/route.ts`, `packages/web/src/lib/sse-emitter.ts`, `packages/web/src/app/api/sse/route.ts`, `packages/web/src/lib/server-state.ts`, `packages/web/__tests__/api/sse.test.ts`, `packages/web/__tests__/api/mcp.test.ts`

### Batch 8 — Web REST API & Dashboard Layout (parallel, after Batch 7)

- [ ] **Coder A**: Tasks 3.16, 3.17, 3.18, 3.19, T3.2 (REST API routes, tests)
      → files: `packages/web/src/app/api/sessions/route.ts`, `packages/web/src/app/api/sessions/[id]/route.ts`, `packages/web/src/app/api/sessions/[id]/answer/route.ts`, `packages/web/__tests__/api/sessions.test.ts`

- [ ] **Coder B**: Tasks 4.1, 4.2, 4.3, 4.4, 4.5 (layout, header, session list page, filter tabs)
      → files: `packages/web/src/app/layout.tsx`, `packages/web/src/components/Header.tsx`, `packages/web/src/app/page.tsx`, `packages/web/src/components/SessionList.tsx`

### Batch 9 — Dashboard Features (parallel, after Batch 8)

- [ ] **Coder A**: Tasks 4.8, 4.9, 4.10, 4.11, 4.12, T4.2 (question answering page, QuestionStepper, submission)
      → files: `packages/web/src/app/sessions/[id]/page.tsx`, `packages/web/src/components/QuestionStepper.tsx`, `packages/web/__tests__/components/QuestionStepper.test.tsx`

- [ ] **Coder B**: Tasks 4.6, 4.7, 4.13, 4.14, 4.15, T4.1, T4.3 (SSE integration, row actions, history page, tests)
      → files: `packages/web/src/app/sessions/[id]/history/page.tsx`, `packages/web/src/components/SessionHistory.tsx`, `packages/web/__tests__/components/SessionList.test.tsx`, `packages/web/__tests__/components/SessionHistory.test.tsx`

### Batch 10 — Polish & Build (parallel, after Batch 9)

- [ ] **Coder A**: Tasks 4.16, 4.17, 4.18, 4.19 (loading states, error states, responsive, a11y)
      → files: `packages/web/src/components/*` (modifications only)

- [ ] **Coder B**: Tasks 3.21, 3.22, 3.23, 3.24, 5.1, 5.2 (web workspace integration, turbo pipeline, root scripts)
      → files: `package.json` (root), `turbo.json`, `packages/web/package.json` (scripts)

### Batch 11 — Final Verification & Docs (sequential, after Batch 10)

- [ ] **Coder A**: Tasks 5.3, 5.4, 5.5, 5.6, 5.7, 5.8 (semantic-release config, CI/CD, TypeScript verification, test coverage, backward compat, manual QA)
      → files: `package.json` (root — release config), `.github/workflows/*`

- [ ] **Coder B**: Tasks 5.9, 5.10, 5.11, 5.12 (documentation)
      → files: docs only (no source code)

### Dependencies

1. **Batch 1** has no dependencies (starting point)
2. **Batch 2** depends on Batch 1 (needs package structure and types)
3. **Batch 3** depends on Batch 2 (SessionManager needs StorageAdapter + EventEmitter)
4. **Batch 4** depends on Batch 3 (core must be complete before CLI/web start)
5. **Batch 5** depends on Batch 4 (CLI setup must exist before moving files)
6. **Batch 6** depends on Batch 5 (CLI must be verified; web setup is independent)
7. **Batch 7** depends on Batch 6 Coder B (web project structure must exist)
8. **Batch 8** depends on Batch 7 (API routes need database + transport)
9. **Batch 9** depends on Batch 8 (dashboard needs API routes)
10. **Batch 10** depends on Batch 9 (polish needs features)
11. **Batch 11** depends on Batch 10 (verification needs everything)

### Risk Areas

- **Batch 3 (SessionManager refactor)** is the highest risk — 855-line class being decomposed into StorageAdapter pattern. Must preserve all business logic, error handling, and edge cases. Run against existing test suite after refactor.
- **Batch 5 (CLI migration)** has risk of breaking imports across ~50+ files. Must update all relative imports to `@auq/core` workspace imports.
- **Batch 7 Coder B (MCP transport)** — Streamable HTTP is relatively new in the SDK. May need to reference `@modelcontextprotocol/sdk` source for correct usage pattern.
- **Batch 8 Coder A + Batch 9** share the `packages/web/src/app/api/sessions/[id]/route.ts` file — Batch 9 must not modify it.
- **File deletions in Batch 6 Coder A** — must only happen after Batch 5 confirms CLI works with new structure. Never delete files that haven't been verified as migrated.

---

## Done Criteria

- [ ] All packages build successfully: `turbo build` passes
- [ ] All tests pass: `turbo test` passes with >80% coverage per package
- [ ] TypeScript strict: `tsc --noEmit` passes for core, cli, and web packages
- [ ] No duplicate code: root `src/` and `bin/` directories removed after CLI migration
- [ ] CLI backward compatibility: `auq-mcp-server` CLI works identically to v3.x (STDIO, TUI, commands)
- [ ] Web server starts: `bun run web:dev` starts Next.js without errors
- [ ] Dashboard functional: session list, question answering, history all work end-to-end
- [ ] MCP over HTTP: MCP client can connect via `/api/mcp` and call tools successfully
- [ ] SSE real-time: browser receives real-time updates when sessions are created/answered
- [ ] SQLiteStore passes StorageAdapterTestSuite (same tests as FileStore)
- [ ] FileStore preserves atomic rename-based writes (no data corruption)
- [ ] OpenSpec tasks checked: all 99 tasks in `openspec/changes/web-mcp-transport/tasks.md` marked complete
