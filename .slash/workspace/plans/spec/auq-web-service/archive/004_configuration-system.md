---
created: 2026-03-16T00:00:00Z
last_updated: 2026-03-16T11:00:00Z
type: spec
change_id: auq-web-service
plan_number: 4
status: done
trigger: "Phase 4: Configuration System — extend existing config with web mode keys, add list/reset/unset CLI subcommands, default hosted URL behavior"
depends_on: 003_web-adapter-resilience.md
next: 005_mcp-server-web-mode.md
---

# Plan: Configuration System (.auqrc Web Mode + CLI Extensions)

## Background & Research

### Existing Config Infrastructure (ALREADY IMPLEMENTED)

The project already has a robust config system. We are EXTENDING it, not building from scratch.

**File: `src/config/types.ts` — Zod schema for AUQConfig:**
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

**File: `src/config/defaults.ts` — Default values:**
```ts
export const DEFAULT_CONFIG: AUQConfig = {
  maxOptions: 5, maxQuestions: 5, recommendedOptions: 4, recommendedQuestions: 4,
  sessionTimeout: 0, retentionPeriod: 604800000,
  language: "auto", theme: "system", autoSelectRecommended: true,
  renderer: "opentui" as const,
  staleThreshold: 7200000, notifyOnStale: true, staleAction: "warn" as const,
  notifications: { enabled: true, sound: true },
  updateCheck: true,
};
```

**File: `src/config/ConfigLoader.ts` — Load/merge logic:**
```ts
function getXDGConfigHome(): string {
  return process.env.XDG_CONFIG_HOME || join(homedir(), ".config");
}
function getGlobalConfigPath(): string {
  return join(getXDGConfigHome(), "auq", ".auqrc.json");
}
function getLocalConfigPath(): string {
  return resolve(process.cwd(), ".auqrc.json");
}
export function loadConfig(): AUQConfig {
  let config: AUQConfig = { ...DEFAULT_CONFIG };
  const globalConfig = readConfigFile(getGlobalConfigPath());
  if (globalConfig) config = { ...config, ...globalConfig };
  const localConfig = readConfigFile(getLocalConfigPath());
  if (localConfig) config = { ...config, ...localConfig };
  return config;
}
// Also exports: getConfigPaths(), getConfig() (cached), reloadConfig(), resetToDefaults()
```

**File: `src/cli/commands/config.ts` — Existing CLI (get/set only, NO list/reset/unset):**
```ts
export async function runConfigCommand(args: string[]): Promise<void> {
  const subcommand = args[0];
  switch (subcommand) {
    case "get": return configGet(args.slice(1));
    case "set": return configSet(args.slice(1));
    default:
      console.log(`Usage: auq config <subcommand>`);
      // ... help text ...
  }
}
// configSet supports --global flag, coerceValue(), buildPartialConfig(), Zod validation
// configGet supports --json flag, handles dot-notated nested keys
// Helper functions: getValidConfigKeys(), getNestedValue(), setNestedValue(), coerceValue()
```

**CLI Entry Point: `bin/auq.tsx` lines 338-344:**
```tsx
if (command === "config") {
  const { runConfigCommand } = await import("../src/cli/commands/config.js");
  await runConfigCommand(args.slice(1));
  await updateNotification;
  process.exit(0);
}
```

**File: `packages/web-adapter/src/config.ts` — Web adapter config (separate from main config):**
```ts
export interface AuqApiClientConfig {
  baseUrl: string;
  apiKey: string;
  maxRetries?: number;
  retryBaseDelayMs?: number;
  fetchFn?: typeof fetch;
}
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

### Design Requirements (from design.md)

**New config keys to add to AUQConfigSchema:**
- `web.api_key` — string, optional (triggers web mode when present)
- `web.api_url` — string, optional (default: `https://auq.paulp.dev`)
- `web.mode` — enum `'local' | 'web'`, default `'local'`

**Env var overrides (highest priority):**
- `AUQ_WEB_API_KEY` → `web.api_key`
- `AUQ_WEB_API_URL` → `web.api_url`
- `AUQ_WEB_MODE` → `web.mode`

**Default hosted URL behavior:**
- If `api_key` is set but `api_url` is NOT → use `https://auq.paulp.dev`
- If both set → use provided `api_url` (self-hosting)

**Config resolution order:** Env vars > Project .auqrc.json > Home .auqrc.json > Defaults

**New CLI subcommands to add:**
- `auq config list` — show all config (mask sensitive values like api_key)
- `auq config reset` — remove project-level .auqrc file
- `auq config unset <key>` — remove a single key from .auqrc

### Test Patterns (from existing tests)
```ts
// src/config/__tests__/ConfigLoader.test.ts
vi.mock("fs", () => ({ existsSync: vi.fn(), readFileSync: vi.fn() }));
vi.mock("os", () => ({ homedir: vi.fn(() => "/home/testuser") }));
// Pattern: mock fs, load config, assert values
vi.mocked(fs.existsSync).mockReturnValue(true);
vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ maxOptions: 6 }));
const config = loadConfig();
expect(config.maxOptions).toBe(6);
```

## Testing Plan (TDD — tests first)

- [ ] **T1**: Add tests for new `web` config schema fields in `src/config/__tests__/ConfigLoader.test.ts`:
  - Test default values (`web.mode: 'local'`, no api_key, api_url defaults to `https://auq.paulp.dev`)
  - Test loading `web.api_key` from .auqrc.json file
  - Test loading `web.api_url` from .auqrc.json file
  - Test `web.mode` enum validation (only 'local' or 'web' accepted)
  - Test default hosted URL: when api_key set but no api_url, resolved config uses `https://auq.paulp.dev`

- [ ] **T2**: Add tests for env var override in `src/config/__tests__/ConfigLoader.test.ts`:
  - Test `AUQ_WEB_API_KEY` env var overrides .auqrc `web.api_key`
  - Test `AUQ_WEB_API_URL` env var overrides .auqrc `web.api_url`
  - Test `AUQ_WEB_MODE` env var overrides .auqrc `web.mode`
  - Test env var takes priority over both local AND global .auqrc

- [ ] **T3**: Add tests for new CLI subcommands in `src/cli/commands/__tests__/config-cli.test.ts` (new file):
  - Test `auq config list` outputs all keys including web.* keys
  - Test `auq config list` masks `web.api_key` value (shows `auq_sk_****xxxx` pattern)
  - Test `auq config list --json` returns full JSON with masked api_key
  - Test `auq config reset` removes project-level .auqrc.json
  - Test `auq config reset --global` removes global .auqrc.json
  - Test `auq config unset <key>` removes single key from .auqrc.json
  - Test `auq config unset <key> --global` removes key from global .auqrc.json
  - Test `auq config set web.api_key <key>` stores key
  - Test `auq config get web.api_key` returns masked value
  - Test `auq config get web.api_url` returns default URL when api_key set but no api_url

## Implementation Plan

- [ ] **I1**: Extend `src/config/types.ts` — add `WebConfigSchema` nested object to `AUQConfigSchema`:
  - Add `web: WebConfigSchema.default({...})` with fields: `api_key` (string optional), `api_url` (string optional), `mode` (enum 'local'|'web')
  - Keep backward compatible — `web` key defaults to `{ mode: 'local' }`

- [ ] **I2**: Extend `src/config/defaults.ts` — add `web` defaults:
  - `web: { mode: 'local' as const }` (no api_key or api_url by default)

- [ ] **I3**: Extend `src/config/ConfigLoader.ts` — add env var override layer:
  - After merging global + local configs, apply env var overrides:
    - `AUQ_WEB_API_KEY` → `config.web.api_key`
    - `AUQ_WEB_API_URL` → `config.web.api_url`
    - `AUQ_WEB_MODE` → `config.web.mode`
  - Add `resolveWebConfig()` helper that applies default hosted URL logic:
    - If `web.api_key` is set AND `web.api_url` is NOT set → set `web.api_url = 'https://auq.paulp.dev'`

- [ ] **I4**: Extend `src/cli/commands/config.ts` — add `list`, `reset`, `unset` subcommands:
  - `configList()`: reuse existing `configGet()` logic for showing all keys, add masking for `web.api_key` (show first 6 + last 4 chars)
  - `configReset()`: delete project .auqrc.json (or global with --global flag), with confirmation message
  - `configUnset()`: read .auqrc.json, delete specified key, write back; support --global
  - Update `runConfigCommand()` switch to add `list`, `reset`, `unset` cases
  - Update help text to show all subcommands

- [ ] **I5**: Update `packages/shared/src/index.ts` — export `ConfigSource` type if needed for cross-package config access

- [ ] **I6**: Run `bun run build && bun test` to verify all tests pass and build succeeds

## Parallelization Plan

### Batch 1 (parallel — tests + schema changes)
- [ ] **Programmer A**: T1 + T2 + I1 + I2 — Schema extension + env var override tests + types + defaults
  - Files: `src/config/types.ts`, `src/config/defaults.ts`, `src/config/__tests__/ConfigLoader.test.ts`
- [ ] **Programmer B**: T3 — CLI subcommand tests (new test file)
  - Files: `src/cli/commands/__tests__/config-cli.test.ts` (new file)

### Batch 2 (after Batch 1 — implementation)
- [ ] **Programmer C**: I3 — ConfigLoader env var override + resolveWebConfig()
  - Files: `src/config/ConfigLoader.ts`
- [ ] **Programmer D**: I4 — CLI subcommands (list, reset, unset) + help text update
  - Files: `src/cli/commands/config.ts`

### Batch 3 (after Batch 2 — integration + verify)
- [ ] **Programmer E**: I5 + I6 — Shared package export + build + full test run
  - Files: `packages/shared/src/index.ts`, verify only

### Dependencies
- Batch 1 agents work on separate files (no conflict)
- Batch 2 depends on Batch 1: I3 needs the new schema from I1; I4 needs test expectations from T3
- Batch 3 depends on Batch 2: final integration and verification

### Risk Areas
- **Nested object merging**: The current `loadConfig()` uses shallow spread (`{ ...config, ...localConfig }`). Adding nested `web` object means we need deep merge for the `web` key. Programmer C must handle this in I3.
- **Zod v4 optional fields**: `web.api_key` and `web.api_url` should be truly optional (not just defaulted). Use `z.string().optional()` not `z.string().default('')`.
- **Masking logic**: `web.api_key` masking in `list` and `get` must handle short keys gracefully (< 10 chars → mask entirely).
- **Existing test compatibility**: Adding new fields to schema must not break existing tests that check `DEFAULT_CONFIG`.

## Done Criteria
- [ ] All existing config tests still pass (no regression)
- [ ] New web config schema tests pass (T1, T2)
- [ ] New CLI subcommand tests pass (T3)
- [ ] `auq config set web.api_key <key>` writes to .auqrc.json correctly
- [ ] `auq config get web.api_key` returns masked value
- [ ] `auq config list` shows all keys with web.api_key masked
- [ ] `auq config reset` removes .auqrc.json
- [ ] `auq config unset web.api_key` removes only that key
- [ ] Env vars override .auqrc values
- [ ] Default URL `https://auq.paulp.dev` auto-applied when api_key set without api_url
- [ ] `bun run build` succeeds
- [ ] `bun test` passes (all suites)