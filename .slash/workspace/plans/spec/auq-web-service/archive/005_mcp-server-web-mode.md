---
created: 2026-03-16T15:00:00Z
last_updated: 2026-03-16T15:00:00Z
type: spec
change_id: auq-web-service
plan_number: 5
status: pending
trigger: "MCP Server Web Mode — auto-detect config, conditionally use WebSessionManager, fallback to local"
depends_on: 004_configuration-system.md
next: TBD
---

# Plan: MCP Server Web Mode

## Background & Research

### Current server.ts Architecture (src/server.ts)

The MCP server currently has NO config loading. It creates `askUserQuestionsCore` with defaults, which internally creates a `SessionManager` (local file-based IPC):

```ts
// src/server.ts lines 1-9, 235-237
import { FastMCP } from "fastmcp";
import { randomUUID } from "crypto";
import {
  AskUserQuestionsParametersSchema,
  createAskUserQuestionsCore,
} from "./core/ask-user-questions.js";

const askUserQuestionsCore = createAskUserQuestionsCore();
// ...
server.start({ transportType: "stdio" });
```

### createAskUserQuestionsCore (src/core/ask-user-questions.ts lines 43-55)

Accepts optional `sessionManager` injection — this is the key integration point:

```ts
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
  // ...
};
```

**Problem**: The `sessionManager` option is typed as `SessionManager` (the local file-based class), NOT a shared interface. `WebSessionManager` has the same method signatures (`createSession`, `startSession`, `waitForAnswers`) but is a different class. We need a shared interface or type union.

### WebSessionManager (packages/web-adapter/src/WebSessionManager.ts)

```ts
export class WebSessionManager {
  constructor(config: WebSessionManagerConfig) { ... }

  async createSession(questions: Question[], _workingDirectory?: string): Promise<string> { ... }

  async waitForAnswers(sessionId: string, timeoutMs?: number, expectedCallId?: string, signal?: AbortSignal): Promise<string> { ... }

  async startSession(questions: Question[], callId?: string, workingDirectory?: string, signal?: AbortSignal): Promise<{ formattedResponse: string; sessionId: string }> { ... }
}
```

### WebSessionManagerConfig (packages/web-adapter/src/config.ts)

```ts
export interface WebSessionManagerConfig {
  apiUrl: string;
  apiKey: string;
  pollInterval?: number;
  sessionTimeout?: number;
  maxPollErrors?: number;
  maxRetries?: number;
  retryBaseDelayMs?: number;
  fetchFn?: typeof fetch;
}
```

### Config System (src/config/)

```ts
// src/config/types.ts
export const WebConfigSchema = z.object({
  api_key: z.string().optional(),
  api_url: z.string().optional(),
  mode: z.enum(["local", "web"]).default("local"),
});

// src/config/ConfigLoader.ts — resolveWebConfig
export function resolveWebConfig(config: AUQConfig): AUQConfig {
  if (config.web.api_key && !config.web.api_url) {
    return { ...config, web: { ...config.web, api_url: "https://auq.paulp.dev" } };
  }
  return config;
}

// src/config/ConfigLoader.ts — loadConfig
export function loadConfig(): AUQConfig {
  let config = { ...DEFAULT_CONFIG };
  // global config → local config → env overrides → resolveWebConfig
  config = applyWebEnvOverrides(config);
  config = resolveWebConfig(config);
  return config;
}
```

Default config web section: `{ mode: "local" }` (no api_key, no api_url).

### Error Classes (packages/web-adapter/src/errors.ts)

```ts
export class WebAdapterError extends Error { ... }
export class ApiUnavailableError extends WebAdapterError {
  statusCode?: number;
  constructor(message: string, options?: { cause?: Error; statusCode?: number }) { ... }
}
export class NetworkError extends WebAdapterError { ... }
```

### Web Adapter Exports (packages/web-adapter/src/index.ts)

```ts
export { WebSessionManager } from "./WebSessionManager.js";
export { AuqApiClient } from "./client.js";
export { WebAdapterError, ApiUnavailableError, NetworkError } from "./errors.js";
export { validateWebAdapterConfig } from "./config.js";
export type { WebSessionManagerConfig, AuqApiClientConfig } from "./config.js";
```

### Existing Server Tests Pattern (src/__tests__/server.integration.test.ts)

Uses vitest, creates SessionManager directly, tests session lifecycle with file-based IPC. Tests should follow this pattern but mock WebSessionManager.

### Key Design Decisions

1. **Mode auto-detection**: If `config.web.api_key` is set → mode is `web`. No need for explicit `mode` field.
2. **Default URL**: `api_key` without `api_url` → uses `https://auq.paulp.dev` (already handled by `resolveWebConfig`).
3. **Fallback**: If `WebSessionManager` throws `ApiUnavailableError`, fall back to local `SessionManager` with a warning log.
4. **Interface alignment**: Need to make `createAskUserQuestionsCore` accept `WebSessionManager` as well. The easiest approach is a duck-typed interface or making the `sessionManager` option accept `any` with the correct method shape.

### Integration Strategy

The server.ts needs to:
1. Import and call `getConfig()` on startup
2. Check if `config.web.api_key` exists
3. If yes, create `WebSessionManager` with `{ apiUrl: config.web.api_url!, apiKey: config.web.api_key }`
4. Pass it to `createAskUserQuestionsCore({ sessionManager: webSessionManager })`
5. Wrap in try/catch — if WebSessionManager construction fails, fall back to default (local)
6. Add a `checkWebApiHealth()` helper that does a lightweight GET to verify connectivity

---

## Testing Plan (TDD — tests first)

- [ ] Create `src/__tests__/server.web-mode.test.ts` with tests for:
  - [ ] Test: server initializes in local mode when no api_key is configured (default behavior unchanged)
  - [ ] Test: server initializes in web mode when api_key is present in config
  - [ ] Test: WebSessionManager is instantiated with correct apiUrl and apiKey from config
  - [ ] Test: default hosted URL is used when api_key present but no api_url
  - [ ] Test: fallback to local mode when WebSessionManager throws ApiUnavailableError during session
  - [ ] Test: logging occurs when switching modes (mode detection log, fallback warning log)
  - [ ] Test: health check function returns true for reachable API and false for unreachable

## Implementation Plan

- [ ] Create `src/core/types.ts` — define a `SessionManagerLike` interface that both `SessionManager` and `WebSessionManager` satisfy:
  ```ts
  export interface SessionManagerLike {
    initialize?(): Promise<void>;
    createSession(questions: Question[], workingDirectory?: string): Promise<string>;
    startSession(questions: Question[], callId?: string, workingDirectory?: string, signal?: AbortSignal): Promise<{ formattedResponse: string; sessionId: string }>;
    waitForAnswers(sessionId: string, timeoutMs?: number, expectedCallId?: string, signal?: AbortSignal): Promise<string>;
    getSessionStatus?(sessionId: string): Promise<any>;
    getSessionRequest?(sessionId: string): Promise<any>;
    getSessionAnswers?(sessionId: string): Promise<any>;
    getAllSessionIds?(): Promise<string[]>;
    cleanupExpiredSessions?(): Promise<number>;
    updateSessionStatus?(sessionId: string, status: string): Promise<void>;
    markSessionAsRead?(sessionId: string): Promise<void>;
  }
  ```
- [ ] Update `src/core/ask-user-questions.ts` — change `AskUserQuestionsCoreOptions.sessionManager` type from `SessionManager` to `SessionManagerLike`. Adjust internal calls to use optional chaining for methods only on `SessionManager` (like `getSessionStatus`, `getAllSessionIds`, etc). For web mode, `getAnsweredQuestions` should throw "not supported in web mode" or gracefully degrade.
- [ ] Create `src/server/web-mode.ts` — new module with:
  - `createSessionManagerForMode(config: AUQConfig, logger?: Logger)` — returns `SessionManagerLike` (WebSessionManager or SessionManager)
  - `checkWebApiHealth(apiUrl: string, apiKey: string)` — lightweight GET to verify connectivity, returns `{ healthy: boolean; latencyMs: number; error?: string }`
  - Mode detection logic: `config.web.api_key` present → web mode, else local
  - Fallback wrapper: wraps WebSessionManager, catches `ApiUnavailableError`, logs warning, creates local SessionManager as fallback
- [ ] Update `src/server.ts` — import `getConfig` and `createSessionManagerForMode`, load config on startup, pass resulting sessionManager to `createAskUserQuestionsCore()`
- [ ] Add mode and health logging to server startup (log detected mode, if web mode log health check result)
- [ ] Update `README.md` — add Web Mode Configuration section documenting env vars, .auqrc config, and fallback behavior

## Parallelization Plan

### Batch 1 (parallel)
- [ ] **Programmer A**: Create test file + SessionManagerLike interface
  - Files: `src/__tests__/server.web-mode.test.ts`, `src/core/types.ts`
  - Tasks: Write all test cases (mocking getConfig, WebSessionManager, SessionManager). Define `SessionManagerLike` interface.
- [ ] **Programmer B**: Create web-mode module + update ask-user-questions core
  - Files: `src/server/web-mode.ts`, `src/core/ask-user-questions.ts`
  - Tasks: Create `createSessionManagerForMode()`, `checkWebApiHealth()`, fallback wrapper. Update `AskUserQuestionsCoreOptions` to accept `SessionManagerLike`.

### Batch 2 (after Batch 1)
- [ ] **Programmer C**: Wire server.ts + README + verify tests
  - Files: `src/server.ts`, `README.md`
  - Tasks: Update server.ts to use config + web-mode module. Add README web mode docs. Run build + tests to verify everything passes.

### Dependencies
- Batch 1 agents work on separate files, no conflicts.
- Batch 2 depends on both Batch 1 outputs: server.ts needs the web-mode module (Programmer B) and the SessionManagerLike type (Programmer A).
- Programmer B needs to know the SessionManagerLike interface shape to use it, but can work with a locally-defined version and Programmer A finalizes the canonical one.

### Risk Areas
- **Type compatibility**: `SessionManager` has many methods (getSessionStatus, getAllSessionIds, etc.) that `WebSessionManager` lacks. The `getAnsweredQuestions` flow in ask-user-questions.ts calls these extensively. The `SessionManagerLike` interface must mark these as optional, and `getAnsweredQuestions` must degrade gracefully in web mode.
- **Import paths**: `WebSessionManager` is in `@paulp-o/auq-web-adapter` package. Ensure it's in workspace dependencies.
- **Fallback timing**: The fallback from web→local should happen per-session (on `ApiUnavailableError` during `startSession`), not at startup. This preserves the ability to retry web mode on subsequent calls.

## Done Criteria
- [ ] All new tests in `server.web-mode.test.ts` pass
- [ ] Existing tests still pass (no regressions)
- [ ] Build succeeds (`bun run build`)
- [ ] Server starts in local mode by default (no api_key = local)
- [ ] Server uses WebSessionManager when api_key is configured
- [ ] Fallback to local mode works when web API is unreachable
- [ ] README documents web mode configuration