---
created: 2026-03-15T00:00:00.000Z
last_updated: 2026-03-16T10:37:00Z
type: spec
change_id: auq-web-service
plan_number: 3
status: done
trigger: "Phase 3 — add resilience features (error handling, retry, fallback, config validation) to web-adapter package"
depends_on: 002_web-adapter-core.md
next: 004_mcp-server-web-mode.md
---

# Plan: Web Adapter Resilience & Tests

## Background & Research

### Current AuqApiClient (packages/web-adapter/src/client.ts)
The HTTP client currently has NO retry logic. The `request()` method fires a single `fetch` call and throws on non-OK responses:
```ts
private async request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const response = await this.fetchFn(`${this.baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${this.apiKey}`,
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (!response.ok) {
    let errorMessage = `Request failed (${response.status} ${response.statusText})`;
    try {
      const errorBody = await response.json();
      if (errorBody && typeof errorBody === "object" && "message" in errorBody && typeof errorBody.message === "string") {
        errorMessage = errorBody.message;
      }
    } catch { }
    throw new Error(errorMessage);
  }

  if (response.status === 204) { return undefined as T; }
  return (await response.json()) as T;
}
```

### Current WebSessionManager (packages/web-adapter/src/WebSessionManager.ts)
Config interface and constructor:
```ts
export interface WebSessionManagerConfig {
  apiUrl: string;
  apiKey: string;
  pollInterval?: number;
  sessionTimeout?: number;
  fetchFn?: typeof fetch;
}

export class WebSessionManager {
  private readonly client: AuqApiClient;
  private readonly pollInterval: number;
  private readonly sessionTimeout: number;
  private readonly sessionStates = new Map<string, GetSessionResponse>();

  constructor(config: WebSessionManagerConfig) {
    this.client = new AuqApiClient({
      baseUrl: config.apiUrl,
      apiKey: config.apiKey,
      fetchFn: config.fetchFn,
    });
    this.pollInterval = config.pollInterval ?? 3000;
    this.sessionTimeout = config.sessionTimeout ?? 0;
  }
}
```

waitForAnswers polling loop — currently NO retry on fetch failure:
```ts
async waitForAnswers(sessionId: string, timeoutMs?: number, expectedCallId?: string, signal?: AbortSignal): Promise<string> {
  const startedAt = Date.now();
  const effectiveTimeout = timeoutMs ?? this.sessionTimeout;
  while (true) {
    if (signal?.aborted) { throw new Error("ABORTED"); }
    const session = await this.client.getSession(sessionId); // <-- throws on ANY error
    this.sessionStates.set(sessionId, session);
    // ... status checks ...
    await this.sleep(this.pollInterval, signal);
  }
}
```

### Current Exports (packages/web-adapter/src/index.ts)
```ts
export { WebSessionManager } from "./WebSessionManager.js";
export { AuqApiClient } from "./client.js";
```

### Test Mocking Pattern (packages/web-adapter/src/__tests__/WebSessionManager.test.ts)
Tests use `vi.hoisted()` + `vi.mock()` for dependency injection:
```ts
const { mockCreateSession, mockGetSession, mockValidateAnswers, mockFormatUserResponse } = vi.hoisted(() => ({
  mockCreateSession: vi.fn(),
  mockFormatUserResponse: vi.fn(),
  mockGetSession: vi.fn(),
  mockValidateAnswers: vi.fn(),
}));
vi.mock("../client.js", () => ({ AuqApiClient: vi.fn(() => ({ createSession: mockCreateSession, getSession: mockGetSession })) }));
vi.mock("@paulp-o/auq-shared", async () => {
  const actual = await vi.importActual<typeof import("@paulp-o/auq-shared")>("@paulp-o/auq-shared");
  return { ...actual, ResponseFormatter: { formatUserResponse: mockFormatUserResponse, validateAnswers: mockValidateAnswers } };
});
```

### Client test pattern (packages/web-adapter/src/__tests__/client.test.ts)
Tests inject `fetchFn` mock directly:
```ts
const fetchFn = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ... }), { status: 200 }));
const client = new AuqApiClient({ apiKey: "test-key", baseUrl: "https://example.com", fetchFn: fetchFn as typeof fetch });
```

### Target Tasks (tasks.md lines 26-31)
- [ ] Line 26: Add error handling for network failures and API errors
- [ ] Line 27: Add fallback logic to detect API unavailability and throw specific error
- [ ] Line 28: Create config.ts — configuration interface for apiUrl, apiKey, pollInterval
- [ ] Line 29: Add TypeScript types and validation using shared package schemas
- [ ] Line 30: Create unit tests for WebSessionManager with mocked HTTP responses
- [ ] Line 31: Add retry logic for transient network failures

### Design Decisions
1. **Retry logic lives in AuqApiClient.request()** — wrap the fetch call with retry for transient failures (network errors, 5xx, 429). Use exponential backoff with jitter.
2. **Custom error classes** — `WebAdapterError` (base), `ApiUnavailableError extends WebAdapterError` (for fallback detection in Phase 4), `NetworkError extends WebAdapterError`.
3. **Config validation** — validate required fields (apiUrl, apiKey) in constructor. pollInterval min 1000ms, max 30000ms.
4. **Fallback detection** — `ApiUnavailableError` thrown on repeated 5xx or network failures after all retries exhausted. Phase 4 catches this to fall back to local mode.
5. **waitForAnswers resilience** — polling loop should catch transient errors from getSession and continue polling (not crash). Only throw after consecutive failures exceed threshold.
6. **Config file** — extract `WebSessionManagerConfig` and `AuqApiClientConfig` interfaces + validation into `config.ts`. Update imports.

---

## Testing Plan (TDD - tests first)

### Error classes tests
- [ ] Create `packages/web-adapter/src/__tests__/errors.test.ts` with tests:
  - `WebAdapterError` is instance of Error, has name `WebAdapterError`
  - `ApiUnavailableError` extends `WebAdapterError`, has name `ApiUnavailableError`, stores statusCode and original cause
  - `NetworkError` extends `WebAdapterError`, has name `NetworkError`, stores original cause

### Config validation tests
- [ ] Create `packages/web-adapter/src/__tests__/config.test.ts` with tests:
  - `validateWebAdapterConfig` returns validated config with defaults applied (pollInterval=3000, sessionTimeout=0, maxRetries=3, retryBaseDelayMs=1000)
  - Throws on empty/missing apiUrl
  - Throws on empty/missing apiKey
  - Throws on pollInterval < 1000 or > 30000
  - Strips trailing slash from apiUrl

### Client retry tests (new tests in existing client.test.ts)
- [ ] Add retry tests to `packages/web-adapter/src/__tests__/client.test.ts`:
  - Retries on network error (fetch throws TypeError) and succeeds on 2nd attempt
  - Retries on 500 response and succeeds on 2nd attempt
  - Retries on 503 response and succeeds on 2nd attempt
  - Retries on 429 response and succeeds on 2nd attempt
  - Does NOT retry on 400 (client error) — throws immediately
  - Does NOT retry on 401 (auth error) — throws immediately
  - Does NOT retry on 404 — throws immediately
  - Throws `ApiUnavailableError` after exhausting all retries on 5xx
  - Throws `NetworkError` after exhausting all retries on network failures
  - Respects maxRetries config option

### WebSessionManager resilience tests (new tests in existing WebSessionManager.test.ts)
- [ ] Add resilience tests to `packages/web-adapter/src/__tests__/WebSessionManager.test.ts`:
  - `waitForAnswers` continues polling after transient getSession failure, succeeds on recovery
  - `waitForAnswers` throws `ApiUnavailableError` after consecutive poll failures exceed threshold (3)
  - `createSession` propagates `ApiUnavailableError` from client
  - `startSession` propagates `ApiUnavailableError` from createSession

## Implementation Plan

### Error classes
- [ ] Create `packages/web-adapter/src/errors.ts`:
  - `export class WebAdapterError extends Error { constructor(message: string, options?: ErrorOptions) }` — set `this.name = 'WebAdapterError'`
  - `export class ApiUnavailableError extends WebAdapterError { statusCode?: number; constructor(message: string, options?: { cause?: Error; statusCode?: number }) }` — set `this.name = 'ApiUnavailableError'`
  - `export class NetworkError extends WebAdapterError { constructor(message: string, options?: { cause?: Error }) }` — set `this.name = 'NetworkError'`

### Config module
- [ ] Create `packages/web-adapter/src/config.ts`:
  - Move `WebSessionManagerConfig` and `AuqApiClientConfig` interfaces here
  - Add `maxRetries?: number` (default 3) and `retryBaseDelayMs?: number` (default 1000) to `AuqApiClientConfig`
  - Add `maxPollErrors?: number` (default 3) to `WebSessionManagerConfig`
  - Export `validateWebAdapterConfig(config: Partial<WebSessionManagerConfig>): WebSessionManagerConfig` — validates required fields, applies defaults, clamps pollInterval to [1000, 30000], strips trailing slash from apiUrl

### Client retry logic
- [ ] Update `packages/web-adapter/src/client.ts`:
  - Add imports for `ApiUnavailableError`, `NetworkError` from `./errors.js`
  - Import `AuqApiClientConfig` from `./config.js` (remove local interface definition)
  - Add `maxRetries` and `retryBaseDelayMs` fields to class, populated from config (defaults: 3, 1000)
  - Add private `isRetryable(status: number): boolean` method — returns true for 429, 500, 502, 503, 504
  - Add private `retryDelay(attempt: number): number` method — `Math.min(retryBaseDelayMs * 2 ** attempt, 10000) + Math.random() * 500`
  - Wrap `request()` body in retry loop: catch TypeError (network) → retry; check `isRetryable(response.status)` → retry; else throw immediately. After retries exhausted: throw `ApiUnavailableError` for 5xx/429, throw `NetworkError` for network failures

### WebSessionManager resilience
- [ ] Update `packages/web-adapter/src/WebSessionManager.ts`:
  - Import `WebSessionManagerConfig` from `./config.js` (remove local interface definition)
  - Import `ApiUnavailableError` from `./errors.js`
  - Add `maxPollErrors` field (default 3) from config
  - In `waitForAnswers`: wrap `this.client.getSession()` in try/catch. On transient error, increment `consecutiveErrors` counter. If `consecutiveErrors >= maxPollErrors`, re-throw. Otherwise log warning and continue polling. On success, reset `consecutiveErrors = 0`

### Config validation in constructor
- [ ] Update `WebSessionManager` constructor to use `validateWebAdapterConfig(config)` and pass validated config to `AuqApiClient`

### Export updates
- [ ] Update `packages/web-adapter/src/index.ts` to also export:
  - `export { WebAdapterError, ApiUnavailableError, NetworkError } from './errors.js';`
  - `export { validateWebAdapterConfig } from './config.js';`
  - `export type { WebSessionManagerConfig, AuqApiClientConfig } from './config.js';`

## Parallelization Plan

### Batch 1 (parallel — new files only, no conflicts)
- [ ] Programmer A: Create error classes + error tests → files: `packages/web-adapter/src/errors.ts`, `packages/web-adapter/src/__tests__/errors.test.ts`
- [ ] Programmer B: Create config module + config tests → files: `packages/web-adapter/src/config.ts`, `packages/web-adapter/src/__tests__/config.test.ts`

### Batch 2 (parallel — each programmer owns distinct files, but depends on Batch 1 for errors.ts and config.ts)
- [ ] Programmer C: Add retry logic to client + retry tests → files: `packages/web-adapter/src/client.ts`, `packages/web-adapter/src/__tests__/client.test.ts`
- [ ] Programmer D: Add resilience to WebSessionManager + resilience tests + update index.ts exports → files: `packages/web-adapter/src/WebSessionManager.ts`, `packages/web-adapter/src/__tests__/WebSessionManager.test.ts`, `packages/web-adapter/src/index.ts`

### Dependencies
- Batch 2 depends on Batch 1 because client.ts and WebSessionManager.ts import from errors.ts and config.ts.
- Within Batch 2, Programmer C and D work on entirely separate files — no conflict.
- Programmer D updates index.ts exports (Programmer C does NOT touch index.ts).

### Risk Areas
- **Config refactor** — moving interfaces from client.ts and WebSessionManager.ts to config.ts requires matching import updates in Batch 2. Batch 1 Programmer B must define the exact interface shapes so Batch 2 agents can import them correctly.
- **Retry timing in tests** — retry tests with exponential backoff need `vi.useFakeTimers()` or mocked delays to avoid slow tests. Use `vi.spyOn(client as any, 'retryDelay').mockReturnValue(0)` pattern to make retry tests instant.
- **WebSessionManager test mock updates** — Programmer D needs to add `ApiUnavailableError` import and mock `getSession` to throw it for resilience tests.

## Done Criteria
- [ ] All existing tests pass (11 tests in client.test.ts and WebSessionManager.test.ts)
- [ ] New error classes tests pass (errors.test.ts)
- [ ] New config validation tests pass (config.test.ts)
- [ ] New client retry tests pass (client.test.ts additions)
- [ ] New WebSessionManager resilience tests pass (WebSessionManager.test.ts additions)
- [ ] `bun run build:web-adapter` succeeds with no TypeScript errors
- [ ] `ApiUnavailableError` is exported and usable for Phase 4 fallback detection
- [ ] Diagnostics clean — no LSP errors in modified files