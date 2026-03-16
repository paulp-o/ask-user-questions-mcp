---
created: 2026-03-16T09:00:00Z
last_updated: 2026-03-16T09:00:00Z
type: spec
change_id: auq-web-service
plan_number: 4
status: pending
trigger: "Phase 4 — Config system web fields + MCP server web mode + CLI config integration"
depends_on: 003_web-adapter-resilience.md
next: 005_web-platform-setup.md
---

# Plan: MCP Server Web Mode + Config System Extension

## Background & Research

### Existing Config System (EXTEND, don't rebuild)

The project already has a complete config system. We need to **add web mode fields** to it.

**`src/config/types.ts`** — Zod schema for AUQConfig:
```ts
export const AUQConfigSchema = z.object({
  // Limits
  maxOptions: z.number().min(2).max(10).default(5),
  maxQuestions: z.number().min(1).max(10).default(5),
  recommendedOptions: z.number().min(1).max(10).default(4),
  recommendedQuestions: z.number().min(1).max(10).default(4),
  // Session
  sessionTimeout: z.number().min(0).default(0),
  retentionPeriod: z.number().min(0).default(604800000),
  // UI
  language: z.string().default("auto"),
  theme: z.string().default("system"),
  autoSelectRecommended: z.boolean().default(true),
  renderer: z.enum(["ink", "opentui"]).default("opentui"),
  // Stale/Orphan Session Detection
  staleThreshold: z.number().min(0).default(7200000),
  notifyOnStale: z.boolean().default(true),
  staleAction: z.enum(["warn", "remove", "archive"]).default("warn"),
  // Notifications (OSC 9/99)
  notifications: NotificationConfigSchema.default({ enabled: true, sound: true }),
  // Update
  updateCheck: z.boolean().default(true),
});
```

**We need to ADD these fields to AUQConfigSchema:**
```ts
// Web Mode
web: z.object({
  apiKey: z.string().optional(),
  apiUrl: z.string().url().optional(),
}).default({}),
```

**`src/config/ConfigLoader.ts`** — loads config with priority: local `.auqrc.json` > global `~/.config/auq/.auqrc.json` > defaults. Has `loadConfig()`, `getConfig()` (cached singleton), `reloadConfig()`, `getConfigPaths()`. **We need to add env var override layer for web fields (`AUQ_WEB_API_KEY`, `AUQ_WEB_API_URL`).**

**`src/config/defaults.ts`** — `DEFAULT_CONFIG` object. **Add `web: {}` default.**

### Existing CLI Config Command (EXTEND, don't rebuild)

**`src/cli/commands/config.ts`** — already has `runConfigCommand` dispatcher with `get` and `set` subcommands. Supports:
- `auq config get [key]` — shows config values, supports dot notation (e.g., `notifications.enabled`)
- `auq config set <key> <value> [--global] [--json]` — writes to `.auqrc.json`, validates with Zod
- Uses `parseFlags()` from `src/cli/utils.ts` for arg parsing
- Has `coerceValue()` for string→typed conversion
- Has `getValidConfigKeys()` that auto-discovers keys from Zod schema (including nested dot notation)

**Dot notation already works!** `auq config set web.apiKey xxx` will work automatically once we add the `web` object to the Zod schema. The existing `getValidConfigKeys()` traverses nested ZodObject shapes.

**We need to ADD:**
- `list` subcommand (that masks sensitive values like `web.apiKey`)
- `reset` subcommand (removes .auqrc file)
- Sensitive value masking for `get` when key is `web.apiKey`

### MCP Server Entry Point

**`src/server.ts`** — creates FastMCP server, line 9:
```ts
const askUserQuestionsCore = createAskUserQuestionsCore();
```

**`src/core/ask-user-questions.ts`** — `createAskUserQuestionsCore()` accepts options:
```ts
export type AskUserQuestionsCoreOptions = {
  baseDir?: string;
  sessionManager?: SessionManager;
};

export const createAskUserQuestionsCore = (
  options: AskUserQuestionsCoreOptions = {},
): AskUserQuestionsCore => {
  const baseDir = options.baseDir ?? getSessionDirectory();
  const sessionManager = options.sessionManager ?? new SessionManager({ baseDir });
  // ...
};
```

**Key insight:** `createAskUserQuestionsCore` already accepts a `sessionManager` option. We can pass a `WebSessionManager` when web mode is detected. The `WebSessionManager` and `SessionManager` both have `startSession` and `createSession` methods with similar signatures.

### Web Adapter Package (from Phase 1-3)

**`packages/web-adapter/src/index.ts`** exports:
```ts
export { WebSessionManager } from "./WebSessionManager.js";
export { AuqApiClient } from "./client.js";
export { WebAdapterError, ApiUnavailableError, NetworkError } from "./errors.js";
export { validateWebAdapterConfig } from "./config.js";
export type { WebSessionManagerConfig, AuqApiClientConfig } from "./config.js";
```

**`WebSessionManager` constructor needs:**
```ts
new WebSessionManager({
  apiUrl: string,    // required
  apiKey: string,    // required
  pollInterval?: number,   // default 3000ms
  sessionTimeout?: number, // default 0
  maxPollErrors?: number,  // default 3
  maxRetries?: number,     // default 3
  retryBaseDelayMs?: number, // default 1000ms
  fetchFn?: typeof fetch,
});
```

**Default hosted URL:** `https://auq.paulp.dev` — used when `api_key` is set but `api_url` is not.

### Mode Resolution Logic

```ts
function resolveMode(config: AUQConfig): 'local' | 'web' {
  // Env vars override config (highest priority)
  const envApiKey = process.env.AUQ_WEB_API_KEY;
  const envApiUrl = process.env.AUQ_WEB_API_URL;
  const apiKey = envApiKey || config.web?.apiKey;
  const apiUrl = envApiUrl || config.web?.apiUrl || 'https://auq.paulp.dev';
  
  if (apiKey) return 'web';
  return 'local';
}
```

### CLI Entry Point

**`bin/auq.tsx`** — dispatches commands via if/else blocks. `config` command at line 339:
```ts
if (command === "config") {
  const { runConfigCommand } = await import("../src/cli/commands/config.js");
  await runConfigCommand(args.slice(1));
  await updateNotification;
  process.exit(0);
}
```

### Test Patterns

**ConfigLoader tests** (`src/config/__tests__/ConfigLoader.test.ts`):
- Mock `fs` and `os` modules with `vi.mock()`
- Use `vi.mocked(fs.existsSync).mockReturnValue()` / `mockImplementation()`
- Call `resetToDefaults()` in beforeEach
- Test: default config, global merge, local merge, invalid JSON, Zod validation, XDG_CONFIG_HOME

**CLI Config tests** (`src/cli/commands/__tests__/config.test.ts`):
- Same fs/os mocks
- Spy on `console.log` and `console.error`
- Test: get all, get specific, get nested dot notation, unknown key error, set values, Zod validation on set

---

## Testing Plan (TDD - tests first)

### Config System Extension Tests
- [ ] Add test in `src/config/__tests__/ConfigLoader.test.ts`: `loadConfig()` returns `web: {}` in defaults when no config files exist
- [ ] Add test: `loadConfig()` merges `web.apiKey` from config file
- [ ] Add test: `loadConfig()` merges `web.apiUrl` from config file
- [ ] Add test: env var `AUQ_WEB_API_KEY` overrides config file `web.apiKey`
- [ ] Add test: env var `AUQ_WEB_API_URL` overrides config file `web.apiUrl`
- [ ] Add test: env vars are highest priority (env > local > global > default)

### Mode Resolution Tests
- [ ] Create `src/config/__tests__/resolveWebMode.test.ts`: returns `'local'` when no apiKey present
- [ ] Add test: returns `'web'` when `config.web.apiKey` is set
- [ ] Add test: returns `'web'` when env `AUQ_WEB_API_KEY` is set
- [ ] Add test: uses default hosted URL `https://auq.paulp.dev` when apiKey set but no apiUrl
- [ ] Add test: uses custom apiUrl when both apiKey and apiUrl are set
- [ ] Add test: env var `AUQ_WEB_API_URL` overrides config file apiUrl

### CLI Config Extension Tests
- [ ] Add test in `src/cli/commands/__tests__/config.test.ts`: `config get web.apiKey` returns value with masking (shows `auq_...xxxx` format)
- [ ] Add test: `config set web.apiKey <value>` writes to .auqrc.json
- [ ] Add test: `config list` shows all values with `web.apiKey` masked
- [ ] Add test: `config reset` removes local .auqrc.json file
- [ ] Add test: `config list --json` returns structured JSON with masked sensitive values

### Server Web Mode Tests
- [ ] Create `src/__tests__/server-web-mode.test.ts`: when config has `web.apiKey`, server creates `WebSessionManager`-backed core
- [ ] Add test: when no apiKey, server creates default `SessionManager`-backed core
- [ ] Add test: fallback — when WebSessionManager throws `ApiUnavailableError`, falls back to local SessionManager
- [ ] Add test: health check helper — returns `{ ok: true }` when web API is reachable, `{ ok: false, error }` when not

---

## Implementation Plan

### 1. Extend Config Schema + Defaults
- [ ] In `src/config/types.ts`: add `WebConfigSchema = z.object({ apiKey: z.string().optional(), apiUrl: z.string().url().optional() })` and add `web: WebConfigSchema.default({})` to `AUQConfigSchema`
- [ ] In `src/config/defaults.ts`: add `web: {}` to `DEFAULT_CONFIG`
- [ ] In `.auqrc.example.json`: add `web` section with commented examples

### 2. Add Env Var Override Layer to ConfigLoader
- [ ] In `src/config/ConfigLoader.ts`: in `loadConfig()`, after merging local/global configs, apply env var overrides: if `AUQ_WEB_API_KEY` is set, override `config.web.apiKey`; if `AUQ_WEB_API_URL` is set, override `config.web.apiUrl`. Clean up env vars in `beforeEach` of tests.

### 3. Create Mode Resolution Utility
- [ ] Create `src/config/resolveWebMode.ts` with `resolveWebMode(config: AUQConfig): { mode: 'local' | 'web'; apiKey?: string; apiUrl?: string }`. Logic: check env vars first, then config. If apiKey exists → mode='web'. Apply default hosted URL `https://auq.paulp.dev` when apiUrl missing.

### 4. Extend CLI Config Command
- [ ] In `src/cli/commands/config.ts`: add `list` subcommand that calls `configGet` but masks `web.apiKey` (show first 4 + last 4 chars with `***` in middle). Add `reset` subcommand that calls `unlinkSync` on local .auqrc.json path.
- [ ] Update help text in default switch case to include `list` and `reset` subcommands
- [ ] Add sensitive key masking: when displaying `web.apiKey` via `get` or `list`, mask the middle portion

### 5. Wire Web Mode into MCP Server
- [ ] In `src/server.ts`: import `getConfig` from `./config/index.js` and `resolveWebMode` from `./config/resolveWebMode.js`. Before creating `askUserQuestionsCore`, call `resolveWebMode(getConfig())`. If mode='web', import `WebSessionManager` from `@anthropic/auq-web-adapter` (or `../../packages/web-adapter`) and pass it to `createAskUserQuestionsCore({ sessionManager: webSessionManager })`.
- [ ] Add try/catch around web mode init — if `WebSessionManager` constructor throws, log warning and fall back to local mode
- [ ] Add fallback wrapper: create a proxy `SessionManager` that tries web first, catches `ApiUnavailableError`, and retries with local `SessionManager`

### 6. Add Health Check Utility
- [ ] Create `src/config/healthCheck.ts` with `checkWebApiHealth(config: { apiUrl: string; apiKey: string }): Promise<{ ok: boolean; error?: string }>` — makes GET request to `{apiUrl}/api/v1/health` with API key header

### 7. Update README
- [ ] Add "Web Mode" section to README.md documenting: env vars (`AUQ_WEB_API_KEY`, `AUQ_WEB_API_URL`), `.auqrc.json` config, `auq config set/get/list/reset`, default hosted URL behavior, fallback behavior

---

## Parallelization Plan

### Batch 1 (parallel — config foundation)
- [ ] **Programmer A**: Config schema + defaults + env var override + mode resolution + tests
  - Files: `src/config/types.ts`, `src/config/defaults.ts`, `src/config/ConfigLoader.ts`, `src/config/resolveWebMode.ts` (new), `src/config/__tests__/ConfigLoader.test.ts`, `src/config/__tests__/resolveWebMode.test.ts` (new), `.auqrc.example.json`
- [ ] **Programmer B**: CLI config extensions (list, reset, masking) + tests
  - Files: `src/cli/commands/config.ts`, `src/cli/commands/__tests__/config.test.ts`

### Batch 2 (after Batch 1 — server integration)
- [ ] **Programmer C**: Wire web mode into server.ts + health check + fallback + server tests + README
  - Files: `src/server.ts`, `src/core/ask-user-questions.ts`, `src/config/healthCheck.ts` (new), `src/__tests__/server-web-mode.test.ts` (new), `README.md`

### Dependencies
- Batch 2 depends on Batch 1 because server.ts needs `resolveWebMode()` and the extended `AUQConfig` type with `web` field
- Programmer A and B are independent: A modifies config internals, B modifies CLI command layer — no file overlap

### Risk Areas
- `src/config/types.ts` is modified by A but imported by B's code (`src/cli/commands/config.ts` imports `AUQConfigSchema`). However, B only extends CLI behavior — the schema import is read-only in B's files. The new `web.apiKey` / `web.apiUrl` keys will automatically appear in `getValidConfigKeys()` due to existing introspection logic.
- `WebSessionManager` interface compatibility with `SessionManager` — they share `startSession`/`createSession` patterns but are not formally interface-compatible. Programmer C needs to create a thin adapter or use duck typing.
- The existing `createAskUserQuestionsCore` accepts `sessionManager?: SessionManager` typed to the local class. May need type widening or a union type.

---

## Done Criteria
- [ ] `auq config get web.apiKey` returns the configured API key (masked in terminal)
- [ ] `auq config set web.apiKey test123` writes to `.auqrc.json` with `web.apiKey` field
- [ ] `auq config list` shows all config including web fields with apiKey masked
- [ ] `auq config reset` removes local `.auqrc.json`
- [ ] `AUQ_WEB_API_KEY=xxx` env var overrides config file value
- [ ] When `web.apiKey` is set, MCP server instantiates `WebSessionManager` with default URL `https://auq.paulp.dev`
- [ ] When web API is unreachable, server falls back to local `SessionManager` with logged warning
- [ ] All new tests pass (`bun run test`)
- [ ] Build succeeds (`bun run build`)
- [ ] No regressions in existing tests