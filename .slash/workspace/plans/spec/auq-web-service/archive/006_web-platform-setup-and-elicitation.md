---
created: 2026-03-16T00:00:00Z
last_updated: 2026-03-16T00:00:00Z
type: spec
change_id: auq-web-service
plan_number: 6
status: pending
trigger: "Phase 6 (Web Platform Setup & DB) + Phase 9 (MCP Elicitation Adapter) — parallel execution"
depends_on: 005_mcp-server-web-mode.md
next: 007_web-platform-api-endpoints.md
---

# Plan: Web Platform Project Setup & DB + MCP Elicitation Adapter

This session covers TWO independent phases in parallel:
- **Phase 6**: Initialize the `auq-web-platform` private GitHub repo, add as git submodule, scaffold SvelteKit + Drizzle + SQLite, define DB schema, run migrations
- **Phase 9**: Create MCP Elicitation adapter in `packages/shared/` for bidirectional AUQ ↔ MCP format conversion

## Background & Research

### AUQ Question/Answer Types (from `packages/shared/src/session/types.ts`)

```typescript
export interface Option {
  description?: string;
  label: string;
}

export interface Question {
  options: Option[];
  prompt: string;
  title: string; // Short 1-2 word summary for UI display
  multiSelect?: boolean; // Enable multi-select mode
}

export interface UserAnswer {
  customText?: string;
  questionIndex: number;
  selectedOption?: string; // For single-select questions
  selectedOptions?: string[]; // For multi-select questions
  timestamp: string;
}

export interface SessionRequest {
  questions: Question[];
  sessionId: string;
  status: 'completed' | 'elaborate_requested' | 'in-progress' | 'pending' | 'rejected' | 'rephrase_requested' | 'timed_out';
  timestamp: string;
  callId?: string;
  workingDirectory?: string;
}

export interface SessionAnswer {
  answers: UserAnswer[];
  sessionId: string;
  timestamp: string;
  callId?: string;
  workingDirectory?: string;
  lastReadAt?: string;
}
```

### AUQ Zod Schemas (from `packages/shared/src/schemas.ts`)

```typescript
export const OptionSchema = z.object({
  label: z.string(),
  description: z.string().optional(),
});

export function createQuestionSchema(maxOptions = 4) {
  return z.object({
    prompt: z.string(),
    title: z.string().min(1),
    options: z.array(OptionSchema).min(2).max(effectiveMax),
    multiSelect: z.boolean(),
  });
}

// Default exports:
export const QuestionSchema = createQuestionSchema();
export const QuestionsSchema = createQuestionsSchema();
export const AskUserQuestionsParametersSchema = createAskUserQuestionsParametersSchema();
```

### Shared Package Exports (`packages/shared/src/index.ts`)

```typescript
export * from './schemas.js';
export * from './session/types.js';
export { ResponseFormatter } from './response/format.js';
```

### Shared Package Config (`packages/shared/package.json`)

```json
{
  "name": "@paulp-o/auq-shared",
  "version": "1.0.0",
  "type": "module",
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" },
    "./schemas": { "types": "./dist/schemas.d.ts", "import": "./dist/schemas.js" },
    "./session/types": { "types": "./dist/session/types.d.ts", "import": "./dist/session/types.js" },
    "./response/format": { "types": "./dist/response/format.d.ts", "import": "./dist/response/format.js" }
  },
  "dependencies": { "zod": "^4.1.13" },
  "devDependencies": { "@tsconfig/node22": "^22.0.1" }
}
```

### Database Schema (from design.md)

```sql
CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE api_keys (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  key_hash TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER,
  last_used_at INTEGER
);

CREATE TABLE questions (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected', 'timed_out', 'abandoned')),
  title TEXT,
  questions_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE answers (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES questions(id),
  question_index INTEGER NOT NULL,
  selected_option TEXT,
  selected_options_json TEXT,
  custom_text TEXT,
  answered_at INTEGER NOT NULL
);

CREATE TABLE push_subscriptions (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at INTEGER NOT NULL,
  last_used_at INTEGER
);
```

### MCP Elicitation Protocol (from research)

MCP Elicitation uses `elicitation/create` method for servers to request user input through clients.

```typescript
// MCP Elicitation Request Schema (Server → Client)
interface ElicitRequestParams {
  message: string;
  requestedSchema: {
    type: 'object';
    properties: Record<string, PrimitiveSchemaDefinition>;
    required?: string[];
  };
}

type PrimitiveSchemaDefinition =
  | { type: 'string'; title?: string; description?: string; enum?: string[]; enumNames?: string[] }
  | { type: 'number' | 'integer'; title?: string; description?: string; minimum?: number; maximum?: number }
  | { type: 'boolean'; title?: string; description?: string; default?: boolean };

// MCP Elicitation Response (Client → Server)
interface ElicitResult {
  action: 'accept' | 'decline' | 'cancel';
  content?: Record<string, string | number | boolean>;
}
```

**Key Conversion Mappings:**
- AUQ `Question` with `options[]` → MCP `string` with `enum` (option labels as enum values)
- AUQ `multiSelect: true` → MCP `array` type with `items: { type: 'string', enum: [...] }`
- AUQ `Question.title` → MCP `title` property on schema field
- AUQ `Question.prompt` → MCP `message` (top-level) or `description` on schema field
- MCP `enum` values → AUQ `options` with labels matching enum strings
- MCP `array` with enum items → AUQ `multiSelect: true`

### SvelteKit + Drizzle Setup Patterns

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';
export default defineConfig({
  out: './drizzle',
  schema: './src/lib/db/schema.ts',
  dialect: 'sqlite',
  dbCredentials: { url: process.env.DATABASE_URL || './local.db' },
});

// src/lib/db/index.ts
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
const sqlite = new Database(process.env.DATABASE_URL || './local.db');
export const db = drizzle(sqlite, { schema });

// src/lib/db/schema.ts (pattern)
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const workspaces = sqliteTable('workspaces', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// SvelteKit CORS hooks (src/hooks.server.ts)
export const handle: Handle = async ({ event, resolve }) => {
  if (event.url.pathname.startsWith('/api')) {
    if (event.request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }
    const response = await resolve(event);
    response.headers.set('Access-Control-Allow-Origin', '*');
    return response;
  }
  return resolve(event);
};
```

### Current State

- `platforms/` directory does NOT exist yet
- `.gitmodules` file does NOT exist yet
- `.gitignore` does NOT have a `platforms/web/` entry yet
- `packages/shared/src/adapters/` directory does NOT exist yet
- Phases 1-5 are fully completed (shared package, web-adapter, config, MCP server web mode)

---

## Testing Plan (TDD - tests first)

### Phase 9: MCP Elicitation Adapter Tests

- [ ] Create `packages/shared/src/adapters/__tests__/mcp-elicitation.test.ts` with test suite:
  - [ ] Test `auqToMcpElicitation()` converts single Question with options → MCP schema with string enum
  - [ ] Test `auqToMcpElicitation()` converts multiSelect Question → MCP schema with array type and enum items
  - [ ] Test `auqToMcpElicitation()` converts multiple Questions → MCP schema with multiple properties
  - [ ] Test `auqToMcpElicitation()` preserves option descriptions in schema descriptions
  - [ ] Test `auqToMcpElicitation()` generates correct `required` array for all questions
  - [ ] Test `mcpElicitationToAuq()` converts MCP string enum → single-select AUQ Question
  - [ ] Test `mcpElicitationToAuq()` converts MCP array with enum items → multiSelect AUQ Question
  - [ ] Test `mcpElicitationToAuq()` generates titles from schema title or property name
  - [ ] Test `mcpElicitationToAuq()` uses message as prompt, falls back to description
  - [ ] Test bidirectional round-trip: AUQ → MCP → AUQ preserves semantics
  - [ ] Test `mcpElicitationResultToAuqAnswers()` converts accept result → UserAnswer[]
  - [ ] Test `mcpElicitationResultToAuqAnswers()` handles decline/cancel actions
  - [ ] Test validation rejects unsupported MCP schema types (number, boolean without enum)

### Phase 6: Web Platform DB Schema Tests

- [ ] Create `platforms/web/src/lib/db/__tests__/schema.test.ts` with test suite:
  - [ ] Test workspaces table: insert and retrieve workspace
  - [ ] Test api_keys table: insert key with workspace FK, unique key_hash constraint
  - [ ] Test questions table: insert with valid status, reject invalid status values
  - [ ] Test answers table: insert answer with question FK, question_index
  - [ ] Test push_subscriptions table: insert subscription with workspace FK
  - [ ] Test cascading: deleting workspace behavior (foreign key constraints)

---

## Implementation Plan

### Batch 1: Repository & Project Setup (sequential, must come first)

- [ ] Create private GitHub repo `paulp-o/auq-web-platform` via `gh repo create`
- [ ] Add `platforms/web/` to main repo `.gitignore`
- [ ] Add git submodule: `git submodule add git@github.com:paulp-o/auq-web-platform.git platforms/web`
- [ ] Initialize SvelteKit skeleton project inside `platforms/web/`:
  - Run `bun create svelte@latest .` (skeleton, TypeScript)
  - Run `bun install`
- [ ] Install Drizzle + SQLite deps in `platforms/web/`:
  - `bun add drizzle-orm better-sqlite3 @paulp-o/auq-shared`
  - `bun add -D drizzle-kit @types/better-sqlite3`
- [ ] Create `platforms/web/drizzle.config.ts` with SQLite dialect pointing to `./src/lib/db/schema.ts`
- [ ] Add `platforms/web/.env` with `DATABASE_URL=./data/local.db`
- [ ] Add `data/` and `.env` to `platforms/web/.gitignore`

### Batch 2: DB Schema + MCP Elicitation Adapter (parallel — different repos)

#### Coder A: Database Schema & Connection (`platforms/web/`)

- [ ] Create `platforms/web/src/lib/db/schema.ts` with Drizzle table definitions:
  - `workspaces` table: id (TEXT PK), name (TEXT NOT NULL), created_at (INTEGER), updated_at (INTEGER)
  - `apiKeys` table: id (TEXT PK), workspace_id (TEXT FK→workspaces), key_hash (TEXT UNIQUE), name (TEXT), created_at, expires_at, last_used_at
  - `questions` table: id (TEXT PK), workspace_id (TEXT FK→workspaces), status (TEXT), title (TEXT), questions_json (TEXT), created_at, updated_at
  - `answers` table: id (TEXT PK), question_id (TEXT FK→questions), question_index (INTEGER), selected_option (TEXT), selected_options_json (TEXT), custom_text (TEXT), answered_at (INTEGER)
  - `pushSubscriptions` table: id (TEXT PK), workspace_id (TEXT FK→workspaces), endpoint (TEXT), p256dh (TEXT), auth (TEXT), user_agent (TEXT), created_at, last_used_at
  - Export inferred types: `type Workspace`, `type NewWorkspace`, etc.
- [ ] Create `platforms/web/src/lib/db/index.ts` — database connection with better-sqlite3 + drizzle
- [ ] Run `bunx drizzle-kit generate` to generate initial migration
- [ ] Run `bunx drizzle-kit push` to apply schema to local DB
- [ ] Create `platforms/web/src/lib/db/__tests__/schema.test.ts` — run the DB schema tests defined above

#### Coder B: MCP Elicitation Adapter (`packages/shared/`)

- [ ] Create `packages/shared/src/adapters/mcp-elicitation.ts` with:
  - Type definitions for MCP Elicitation structures (`McpElicitationSchema`, `McpElicitationResult`, `PrimitiveSchemaDefinition`)
  - `auqToMcpElicitation(questions: Question[], message?: string): McpElicitationSchema` — converts AUQ questions array to MCP JSON Schema format
    - Each Question becomes a property keyed by `q_{index}` (or title-slug)
    - Single-select: `{ type: 'string', title, description: prompt, enum: optionLabels }`
    - MultiSelect: `{ type: 'array', title, description: prompt, items: { type: 'string', enum: optionLabels } }`
    - All questions added to `required` array
  - `mcpElicitationToAuq(schema: McpElicitationSchema, message?: string): Question[]` — converts MCP schema back to AUQ Question array
    - String with enum → single-select Question, enum values as option labels
    - Array with enum items → multiSelect Question
    - Title from `title` field, prompt from `description` or `message`
  - `mcpElicitationResultToAuqAnswers(result: McpElicitationResult, questions: Question[]): UserAnswer[]` — converts elicitation result to AUQ answer format
    - Maps `content` fields to `selectedOption`/`selectedOptions` by question index
    - Handles `decline`/`cancel` actions (return empty answers or throw)
  - Validation: reject unsupported schema types (pure number/boolean without enum context)
- [ ] Create `packages/shared/src/adapters/__tests__/mcp-elicitation.test.ts` — run all MCP adapter tests defined above
- [ ] Update `packages/shared/src/index.ts` — add `export * from './adapters/mcp-elicitation.js'`
- [ ] Update `packages/shared/package.json` — add subpath export `"./adapters/mcp-elicitation"` pointing to `dist/adapters/mcp-elicitation.js`

### Batch 3: Web Platform Infrastructure (after Batch 2, `platforms/web/` only)

- [ ] Create `platforms/web/src/hooks.server.ts` — CORS middleware for `/api/` routes (allow all origins for now, OPTIONS handling)
- [ ] Create `platforms/web/src/lib/api/errors.ts` — consistent error response helpers:
  - `apiError(status: number, code: string, message: string)` returns JSON Response
  - `validationError(issues: ZodIssue[])` returns 400 with formatted issues
  - `unauthorizedError()` returns 401
  - `notFoundError(resource: string)` returns 404
- [ ] Create `platforms/web/src/lib/api/validation.ts` — Zod validation helper:
  - `validateBody<T>(request: Request, schema: ZodSchema<T>): Promise<T>` — parses JSON body with Zod, throws apiError on failure
  - `validateParams(params: Record<string, string>, schema: ZodSchema): Record<string, unknown>` — validates route params
- [ ] Verify `bun run build` succeeds in `platforms/web/`
- [ ] Verify `bun test` passes in `platforms/web/`

---

## Parallelization Plan

### Batch 1 (sequential — setup)
- [ ] Single agent: Create GitHub repo, add submodule, init SvelteKit, install deps, create config files
  - Files: `.gitignore`, `.gitmodules`, `platforms/web/*` (scaffolding)

### Batch 2 (parallel — 2 coders)
- [ ] Coder A: DB schema, connection, migration, schema tests
  - Files: `platforms/web/src/lib/db/schema.ts`, `platforms/web/src/lib/db/index.ts`, `platforms/web/src/lib/db/__tests__/schema.test.ts`, `platforms/web/drizzle/*`
- [ ] Coder B: MCP Elicitation adapter + tests + exports update
  - Files: `packages/shared/src/adapters/mcp-elicitation.ts`, `packages/shared/src/adapters/__tests__/mcp-elicitation.test.ts`, `packages/shared/src/index.ts`, `packages/shared/package.json`

### Batch 3 (sequential — after Batch 2)
- [ ] Single agent: CORS hooks, error helpers, validation utils, build verification
  - Files: `platforms/web/src/hooks.server.ts`, `platforms/web/src/lib/api/errors.ts`, `platforms/web/src/lib/api/validation.ts`

### Dependencies
- Batch 1 must complete before Batch 2 (SvelteKit project must exist for Coder A to work in)
- Batch 2 coders are fully independent (different repos: `platforms/web/` vs `packages/shared/`)
- Batch 3 depends on Batch 2 Coder A (DB connection must exist for API helpers to reference)
- Coder B (MCP adapter) has NO dependency on the web platform — purely in shared package

### Risk Areas
- `gh repo create` may fail if repo already exists or auth issues — check with `gh auth status` first
- `bun create svelte@latest .` may prompt interactively — may need `--template skeleton` flag or manual creation
- SvelteKit project init inside submodule may need the submodule to be initialized first
- Drizzle `generate` / `push` commands need the DB file directory to exist (`data/`)
- `@paulp-o/auq-shared` must be published to npm OR linked locally for `platforms/web/` to use it as a dependency — check if it's published, otherwise use `bun link` or workspace path
- MCP Elicitation types are based on the MCP spec — use our own type definitions rather than importing from `@modelcontextprotocol/sdk` to avoid adding a heavy dependency to the shared package

---

## Done Criteria

- [ ] Private GitHub repo `paulp-o/auq-web-platform` exists
- [ ] Git submodule properly linked at `platforms/web/`
- [ ] `platforms/web/` is in main repo `.gitignore`
- [ ] SvelteKit project builds successfully (`bun run build` in `platforms/web/`)
- [ ] All 5 Drizzle tables created with correct columns, FKs, and constraints
- [ ] DB migration generated and applied
- [ ] Schema tests pass (insert/retrieve for all tables)
- [ ] MCP Elicitation adapter `auqToMcpElicitation()` converts all question types correctly
- [ ] MCP Elicitation adapter `mcpElicitationToAuq()` converts back correctly
- [ ] MCP Elicitation adapter `mcpElicitationResultToAuqAnswers()` handles all action types
- [ ] Round-trip conversion preserves question semantics
- [ ] Adapter tests pass (`bun test` in packages/shared)
- [ ] CORS hooks handle OPTIONS and add headers to API responses
- [ ] Error/validation helpers provide consistent API response format
- [ ] Shared package exports updated to include adapter module
- [ ] Diagnostics clean in both `platforms/web/` and `packages/shared/`