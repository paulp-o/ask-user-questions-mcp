---
created: 2026-03-15T14:00:00Z
last_updated: 2026-03-15T14:15:00Z
type: spec
change_id: auq-web-service
plan_number: 2
status: done
trigger: "Create packages/web-adapter with WebSessionManager class implementing HTTP-based session lifecycle"
depends_on: 001_shared-package-extraction.md
next: 003_web-adapter-resilience.md
---

# Plan: Web Adapter Package — Core

## Background & Research

### Scope
Phase 2 creates `packages/web-adapter` — an HTTP client package that implements the same core session lifecycle as `SessionManager` but communicates with a remote web API instead of the local filesystem. This phase covers:
- Package setup (package.json, tsconfig.json)
- `WebSessionManager` class with `createSession()`, `startSession()`, `waitForAnswers()`
- HTTP client with configurable base URL and API key
- AbortSignal propagation and timeout handling

Phase 3 (next session) will add error handling, fallback, config interface, retry logic, and unit tests.

### Key Decision: WebSessionManager is NOT a full SessionManager replacement
WebSessionManager implements only the **agent-side** session methods needed by the MCP server:
- `createSession()` — POST questions to web API
- `waitForAnswers()` — poll GET endpoint for answers
- `startSession()` — orchestrate create + wait + format response

It does NOT need to implement file-management methods (`deleteSession`, `getAllSessionIds`, `getPendingSessions`, etc.) because those are local file-based operations. The web API server handles its own session storage.

### API Endpoints (from design.md)
```
POST /api/v1/questions
  Request: { "questions": [...], "title": "optional" }
  Response: { "id": "requestId", "status": "pending" }
  Auth: Bearer <api-key>

GET /api/v1/questions/:id
  Response: { "status": "pending|in_progress|completed|rejected|timed_out|abandoned", "answers": [...] }
  Auth: Bearer <api-key>
```

### SessionManager.startSession() Pattern (src/session/SessionManager.ts lines 395-561)
The web adapter must replicate this orchestration flow:
```ts
async startSession(
  questions: Question[],
  callId?: string,
  workingDirectory?: string,
  signal?: AbortSignal,
): Promise<{ formattedResponse: string; sessionId: string }> {
  // Step 1: Create session (POST to web API)
  const sessionId = await this.createSession(questions, workingDirectory);

  // Step 1.5: Register abort handler
  if (signal) {
    if (signal.aborted) throw new Error("ABORTED");
    signal.addEventListener("abort", abortHandler, { once: true });
  }

  // Step 2-3: Wait for answers (poll GET endpoint)
  await this.waitForAnswers(sessionId, timeoutMs, callId, signal);

  // Step 4-5: Read and validate answers (from poll response)
  // Step 6: Format response using ResponseFormatter
  const formattedResponse = ResponseFormatter.formatUserResponse(answers, questions);

  // Step 7: Return results
  return { formattedResponse, sessionId };
}
```

### SessionManager.waitForAnswers() Pattern (src/session/SessionManager.ts lines 654-705)
```ts
async waitForAnswers(
  sessionId: string,
  timeoutMs?: number,
  expectedCallId?: string,
  signal?: AbortSignal,
): Promise<string> {
  const startTime = Date.now();
  const pollInterval = 200; // local uses 200ms, web should use 2000-5000ms

  while (true) {
    // Check for answers (GET /api/v1/questions/:id)
    // Check for rejection (status === "rejected")
    if (status && status.status === "rejected") throw new Error("SESSION_REJECTED");

    // Check for abort signal
    if (signal?.aborted) throw new Error("ABORTED");

    // Check for timeout
    if (timeoutMs && timeoutMs > 0 && Date.now() - startTime > timeoutMs)
      throw new Error("Timeout waiting for user response");

    // Sleep before next poll
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }
}
```

### AbortSignal Pattern in MCP Server (src/server.ts lines 65-98)
```ts
// MCP server creates AbortController per request
const controller = new AbortController();
activeRequests.set(callId, { controller });

// Passes signal to ask() → startSession()
const { formattedResponse, sessionId } = await askUserQuestionsCore.ask(
  args.questions, callId, workingDirectory, controller.signal,
);

// Disconnect handler calls controller.abort()
```

### Session Types (packages/shared/src/session/types.ts)
```ts
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

export interface UserAnswer {
  customText?: string;
  questionIndex: number;
  selectedOption?: string;
  selectedOptions?: string[];
  timestamp: string;
}

export type SessionStatusValue =
  | "abandoned" | "completed" | "elaborate_requested"
  | "in-progress" | "pending" | "rejected"
  | "rephrase_requested" | "timed_out";
```

### Shared Package Barrel (packages/shared/src/index.ts)
```ts
export * from './schemas.js';
export * from './session/types.js';
export { ResponseFormatter } from './response/format.js';
```

### Existing Package Pattern (packages/opencode-plugin/package.json)
```json
{
  "name": "@paulp-o/opencode-auq",
  "version": "2.0.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist", "README.md", "LICENSE"],
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "prepublishOnly": "bun run build",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "publishConfig": { "access": "public" }
}
```

### tsconfig Pattern (packages/shared/tsconfig.json)
```json
{
  "extends": "@tsconfig/node22/tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src"]
}
```

### HTTP Client: Native fetch
The codebase uses native `fetch` (no external HTTP client libraries). Web-adapter should follow this pattern.

### Test Framework: Vitest
```ts
import { describe, expect, it } from "vitest";
// BDD structure with describe/it, vi.mock() for module mocking, vi.fn() for function mocks
```

### Root Workspace Config
```json
"workspaces": ["packages/opencode-plugin", "packages/shared"]
// Must add "packages/web-adapter"
```

---

## Testing Plan (TDD - tests first)

- [ ] Create `packages/web-adapter/src/__tests__/client.test.ts` — test `AuqApiClient` class:
  - Test constructor sets baseUrl, apiKey, and default headers
  - Test `createSession()` sends POST to `/api/v1/questions` with correct body and auth header, returns `{ id, status }`
  - Test `getSession()` sends GET to `/api/v1/questions/:id` with auth header, returns session data with status and answers
  - Test request includes `Authorization: Bearer <apiKey>` header
  - Test custom fetch function is used when provided (for testability)
  - Mock fetch using `vi.fn()` returning `Response` objects

- [ ] Create `packages/web-adapter/src/__tests__/WebSessionManager.test.ts` — test `WebSessionManager` class:
  - Test `createSession()` calls client.createSession and returns sessionId
  - Test `waitForAnswers()` polls client.getSession until status is `completed`, returns sessionId
  - Test `waitForAnswers()` throws `SESSION_REJECTED` when poll returns `rejected` status
  - Test `waitForAnswers()` throws `ABORTED` when AbortSignal is aborted
  - Test `waitForAnswers()` throws timeout error when timeoutMs exceeded
  - Test `waitForAnswers()` respects pollInterval config (default 3000ms)
  - Test `startSession()` orchestrates create → wait → format response
  - Test `startSession()` registers abort handler on signal and cleans up on completion
  - Test `startSession()` handles rejection with formatted rejection message
  - Mock `AuqApiClient` using `vi.mock()`

## Implementation Plan

### Package Infrastructure
- [ ] Create `packages/web-adapter/package.json` with name `@paulp-o/auq-web-adapter`, version `1.0.0`, type `module`, main `dist/index.js`, types `dist/index.d.ts`, files `["dist"]`, build script `tsc -p tsconfig.json`, publishConfig `{ "access": "public" }`, dependency on `@paulp-o/auq-shared: "workspace:*"`
- [ ] Create `packages/web-adapter/tsconfig.json` extending `@tsconfig/node22/tsconfig.json` with `outDir: "dist"`, `rootDir: "src"`, `declaration: true`, `declarationMap: true`, include `["src"]`. Add `@tsconfig/node22` to devDependencies.

### HTTP Client
- [ ] Create `packages/web-adapter/src/client.ts` — `AuqApiClient` class:
  - Constructor: `constructor(config: { baseUrl: string; apiKey: string; fetchFn?: typeof fetch })` — stores config, defaults fetchFn to global fetch
  - `async createSession(questions: Question[], title?: string): Promise<{ id: string; status: string }>` — POST to `${baseUrl}/api/v1/questions` with JSON body `{ questions, title }`, `Authorization: Bearer ${apiKey}` header, `Content-Type: application/json`
  - `async getSession(sessionId: string): Promise<{ status: SessionStatusValue; answers?: UserAnswer[]; rejectionReason?: string | null }>` — GET to `${baseUrl}/api/v1/questions/${sessionId}` with auth header
  - Private `async request<T>(method: string, path: string, body?: unknown): Promise<T>` — shared request helper with auth header, JSON serialization, response parsing

### WebSessionManager
- [ ] Create `packages/web-adapter/src/WebSessionManager.ts` — `WebSessionManager` class:
  - Constructor: `constructor(config: { apiUrl: string; apiKey: string; pollInterval?: number; sessionTimeout?: number; fetchFn?: typeof fetch })` — creates internal `AuqApiClient`, stores config with defaults (pollInterval=3000, sessionTimeout=0)
  - `async createSession(questions: Question[], workingDirectory?: string): Promise<string>` — calls `client.createSession(questions)`, returns the `id` from response
  - `async waitForAnswers(sessionId: string, timeoutMs?: number, expectedCallId?: string, signal?: AbortSignal): Promise<string>` — polling loop: GET session status every `pollInterval` ms, check for `completed` → return sessionId, check for `rejected` → throw `SESSION_REJECTED`, check `signal?.aborted` → throw `ABORTED`, check timeout → throw timeout error
  - `async startSession(questions: Question[], callId?: string, workingDirectory?: string, signal?: AbortSignal): Promise<{ formattedResponse: string; sessionId: string }>` — full orchestration: create session, register abort handler on signal, wait for answers, read answers from final poll response, validate with `ResponseFormatter.validateAnswers()`, format with `ResponseFormatter.formatUserResponse()`, handle rejection with formatted message, clean up abort handler

### Barrel Export
- [ ] Create `packages/web-adapter/src/index.ts` — export `WebSessionManager` class and `AuqApiClient` class: `export { WebSessionManager } from './WebSessionManager.js'; export { AuqApiClient } from './client.js';`

### Workspace Integration
- [ ] Update root `package.json` workspaces array to include `packages/web-adapter`: `["packages/opencode-plugin", "packages/shared", "packages/web-adapter"]`
- [ ] Add build script `"build:web-adapter": "cd packages/web-adapter && tsc -p tsconfig.json"` to root package.json
- [ ] Update root build script to include web-adapter: `"build": "bun run build:shared && bun run build:web-adapter && bun run sync-plugin-schemas && bun run generate:skill && tsc && tsc -p tsconfig.opentui.json"`
- [ ] Run `bun install` to link workspace packages

### Verification
- [ ] Run `bun run build:web-adapter` to verify web-adapter compiles
- [ ] Run `bun run build` to verify full build succeeds
- [ ] Run `cd packages/web-adapter && bunx vitest run` to verify web-adapter tests pass
- [ ] Run `bun run test` to verify existing tests still pass

---

## Parallelization Plan

### Batch 1 (parallel) — Package setup + source + tests
- [ ] Programmer A: Create package infrastructure + source files
  - `packages/web-adapter/package.json`
  - `packages/web-adapter/tsconfig.json`
  - `packages/web-adapter/src/client.ts`
  - `packages/web-adapter/src/WebSessionManager.ts`
  - `packages/web-adapter/src/index.ts`
  - Files: `packages/web-adapter/**` (all new files)

- [ ] Programmer B: Create test files
  - `packages/web-adapter/src/__tests__/client.test.ts`
  - `packages/web-adapter/src/__tests__/WebSessionManager.test.ts`
  - Files: `packages/web-adapter/src/__tests__/**` (all new files)

### Batch 2 (after Batch 1) — Workspace integration + verify
- [ ] Programmer C: Update root config + build + test
  - Update root `package.json` (workspaces, build scripts)
  - Run `bun install`
  - Run `bun run build:web-adapter && bun run build`
  - Run `cd packages/web-adapter && bunx vitest run`
  - Run `bun run test`
  - Files: `package.json` (root only)

### Dependencies
Batch 2 must run after Batch 1 because:
- Workspace config needs the package to exist before `bun install`
- Build verification requires source files and tsconfig to exist
- Test verification requires both source and test files

### Risk Areas
- **Shared package import paths**: `@paulp-o/auq-shared` must be importable. Verify `packages/shared/dist/` exists or that workspace linking resolves correctly.
- **fetch mocking in tests**: Native `fetch` can be tricky to mock. Use the `fetchFn` constructor parameter for dependency injection instead of mocking global fetch.
- **Poll interval timing in tests**: Use `vi.useFakeTimers()` and `vi.advanceTimersByTime()` to avoid slow tests waiting for real poll intervals.
- **ResponseFormatter import**: WebSessionManager imports `ResponseFormatter` from `@paulp-o/auq-shared`. Verify the shared package exports it.
- **AbortSignal cleanup**: Must remove event listeners on both success and error paths to prevent memory leaks.

---

## Done Criteria
- [ ] `packages/web-adapter/` exists with package.json, tsconfig.json, src/ with client, WebSessionManager, barrel export, and tests
- [ ] `bun run build:web-adapter` compiles without errors
- [ ] `bun run build` (full build) succeeds
- [ ] Web-adapter tests pass: `cd packages/web-adapter && bunx vitest run`
- [ ] Existing tests still pass: `bun run test`
- [ ] WebSessionManager correctly: creates sessions via POST, polls for answers via GET, handles AbortSignal/timeout/rejection, formats responses using ResponseFormatter