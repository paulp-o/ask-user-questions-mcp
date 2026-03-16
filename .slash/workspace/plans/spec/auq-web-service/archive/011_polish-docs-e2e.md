---
created: 2026-03-16T00:00:00Z
last_updated: 2026-03-16T00:00:00Z
type: spec
change_id: auq-web-service
plan_number: 11
status: pending
trigger: "Phase 11: Polish, Docs & E2E — final phase covering logging, data cleanup, error messages, deployment guides, E2E test, README architecture overview, OpenAPI spec"
depends_on: "010_auth-workspace-management.md"
next: "none — final phase"
---

# Plan: Polish, Docs & E2E (Phase 11 — Final)

## Background & Research

### Current State
- **Main repo**: 864-line README already covers Web Mode config (lines 230-261), but lacks architecture overview and self-hosting/deployment docs
- **Web platform**: Default SvelteKit README only — needs full project docs
- **No deployment configs**: No Dockerfile, vercel.json, or .env.example in platforms/web/
- **No E2E tests**: Unit/integration tests exist (70+ in web platform, 37+ in shared) but no end-to-end flow test
- **No OpenAPI spec**: API routes defined in SvelteKit but undocumented
- **No data cleanup**: DB schema has `createdAt` on questions table but no cleanup utility
- **No logging**: API routes have error responses but no structured request logging

### API Routes (for OpenAPI spec)
All routes under `platforms/web/src/routes/api/v1/`:
- `POST /questions` — Create question session (auth + rate limit)
- `GET /questions/[id]` — Get question + answers
- `DELETE /questions/[id]` — Delete question
- `POST /questions/[id]/answer` — Submit answers
- `GET /questions/stream` — SSE stream for real-time updates
- `POST /workspaces` — Create workspace
- `GET /workspaces/[id]/keys` — List API keys
- `POST /workspaces/[id]/keys` — Generate API key
- `DELETE /workspaces/[id]/keys/[keyId]` — Revoke key
- `POST /push/subscribe` — Subscribe to push notifications
- `POST /push/unsubscribe` — Unsubscribe
- `GET /push/vapid-key` — Get VAPID public key

### Error Helpers (platforms/web/src/lib/api/errors.ts)
```ts
export function apiError(status: number, code: string, message: string) {
  return json({ error: { code, message } }, { status });
}
export function validationError(issues: Array<{ path: (string | number)[]; message: string }>) { ... }
export function unauthorizedError(message = 'Invalid or missing API key') { ... }
export function expiredKeyError() { ... }
export function notFoundError(resource: string) { ... }
```

### DB Schema (platforms/web/src/lib/db/schema.ts)
- `questions` table has `createdAt` (integer timestamp) and `status` (check constraint with 'pending', 'in_progress', 'completed', 'rejected', 'timed_out', 'abandoned')
- `apiKeys` table has `expiresAt` and `lastUsedAt`
- `pushSubscriptions` table has `createdAt` and `lastUsedAt`
- No existing cleanup/cron logic

### Web Mode Flow (src/server/web-mode.ts)
```ts
export interface SessionManagerLike {
  initialize?(): Promise<void>;
  createSession(questions: Question[], workingDirectory?: string): Promise<string>;
  startSession(questions: Question[], callId?: string, workingDirectory?: string, signal?: AbortSignal): Promise<{ formattedResponse: string; sessionId: string }>;
  waitForAnswers(sessionId: string, timeoutMs?: number, expectedCallId?: string, signal?: AbortSignal): Promise<string>;
  cleanupExpiredSessions?(): Promise<number>;
  // ... optional methods
}
```

### Server Entry (src/server.ts lines 11-16)
```ts
const config = getConfig();
const sessionManager = createSessionManagerForMode(config);
const askUserQuestionsCore = createAskUserQuestionsCore({ sessionManager });
if (config.web.api_key) {
  console.error(`[AUQ] Web mode enabled, API: ${config.web.api_url}`);
}
```

### AuqApiClient (packages/web-adapter/src/client.ts)
```ts
export class AuqApiClient {
  constructor(config: AuqApiClientConfig) { ... }
  async createSession(questions: Question[], title?: string): Promise<CreateSessionResponse> { ... }
  // getSession, deleteSession methods with retry logic
}
```

## Testing Plan (TDD — tests first)

- [ ] Create E2E integration test at `platforms/web/src/__tests__/e2e-flow.test.ts` that tests complete question lifecycle: create question → verify pending → submit answers → verify completed → delete. Uses in-memory SQLite DB, direct handler function calls (not HTTP — SvelteKit test pattern), and shared package types for schema validation.
- [ ] Create data cleanup test at `platforms/web/src/lib/db/__tests__/cleanup.test.ts` that verifies: cleanup deletes completed questions older than threshold, cleanup deletes abandoned/timed_out questions older than shorter threshold, cleanup preserves pending/in_progress questions, cleanup cascades to answers table, cleanup returns count of deleted records.
- [ ] Create API request logging test at `platforms/web/src/lib/api/__tests__/logger.test.ts` that verifies: logger formats request method + path + status + duration, logger masks API keys in output, logger includes workspace ID when available.

## Implementation Plan

### Data Cleanup Utility
- [ ] Create `platforms/web/src/lib/db/cleanup.ts` — `cleanupOldQuestions(db, options: { completedMaxAgeDays?: number, abandonedMaxAgeDays?: number })` function that deletes completed questions older than N days (default 30) and abandoned/timed_out questions older than N days (default 7). Cascade deletes answers. Returns `{ deletedQuestions: number, deletedAnswers: number }`. Uses drizzle-orm `lt()` + `and()` + `inArray()` on status.

### API Request Logger
- [ ] Create `platforms/web/src/lib/api/logger.ts` — Lightweight structured logger: `logApiRequest(method: string, path: string, status: number, durationMs: number, workspaceId?: string)` that writes to console.log in JSON format. `maskApiKey(key: string): string` helper that shows first 4 + last 4 chars. No external dependencies.
- [ ] Create SvelteKit hooks file `platforms/web/src/hooks.server.ts` — Use `handle` hook to add request timing + logging for all `/api/` routes. Call `logApiRequest` after response is generated.

### OpenAPI Spec
- [ ] Create `platforms/web/static/openapi.yaml` — Full OpenAPI 3.0 spec covering all 12 API endpoints. Include request/response schemas matching Zod schemas, auth header (X-API-Key), error response format, rate limit headers. Reference the shared package types for Question/Answer schemas.

### Deployment Guides & Configs
- [ ] Create `platforms/web/.env.example` — Document all env vars: `DATABASE_PATH`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_CONTACT`, `ORIGIN` (SvelteKit), `PORT`.
- [ ] Create `platforms/web/Dockerfile` — Multi-stage build: bun install → bun run build → production stage with node adapter. Expose port 3000. Copy static assets + built output.
- [ ] Create `platforms/web/docker-compose.yml` — Simple compose with web service, volume mount for SQLite DB, env_file reference.

### Documentation
- [ ] Create `platforms/web/README.md` (replace SvelteKit default) — Project overview, architecture (SvelteKit + Drizzle + SQLite + Web Push), quick start (dev + production), environment variables table, API overview (link to OpenAPI), deployment section (Vercel + Docker + self-hosted), contributing notes.
- [ ] Update main repo `README.md` — Add "Architecture" section after "What does it do?" explaining the three-layer architecture: MCP Server (main repo) → Web Adapter (packages/web-adapter) → Web Platform (platforms/web). Add a simple ASCII diagram. Add "Self-Hosting" subsection under Web Mode with link to platforms/web/README.md. Add "API Documentation" link to OpenAPI spec.

## Parallelization Plan

### Batch 1 (parallel — 3 coders, no file conflicts)
- [ ] Coder A: Data cleanup utility + tests → files: `platforms/web/src/lib/db/cleanup.ts`, `platforms/web/src/lib/db/__tests__/cleanup.test.ts`
- [ ] Coder B: API request logger + hooks + tests → files: `platforms/web/src/lib/api/logger.ts`, `platforms/web/src/lib/api/__tests__/logger.test.ts`, `platforms/web/src/hooks.server.ts`
- [ ] Coder C: OpenAPI spec → files: `platforms/web/static/openapi.yaml`

### Batch 2 (parallel — 2 coders, no file conflicts)
- [ ] Coder D: E2E integration test → files: `platforms/web/src/__tests__/e2e-flow.test.ts`
- [ ] Coder E: Deployment configs → files: `platforms/web/.env.example`, `platforms/web/Dockerfile`, `platforms/web/docker-compose.yml`

### Batch 3 (parallel — 2 coders, no file conflicts)
- [ ] Coder F: Web platform README → files: `platforms/web/README.md`
- [ ] Coder G: Main repo README architecture section → files: `README.md` (lines ~30-50 area, add after "What does it do?" section)

### Dependencies
- Batch 1 must complete before Batch 2 (E2E test may reference cleanup; deployment configs need final file list)
- Batch 2 must complete before Batch 3 (README references need to know final file paths)
- Within each batch, coders touch completely separate files

### Risk Areas
- E2E test (Coder D) needs to import from multiple handler files — ensure all imports resolve correctly
- README updates (Coder G) must not break existing content — use append/prepend, not wholesale replace
- OpenAPI spec (Coder C) must match actual API response shapes from route handlers

## Done Criteria
- [ ] All existing tests still pass (70+ web platform, 37+ shared)
- [ ] New tests pass (E2E flow, cleanup, logger)
- [ ] `bun run build` passes in platforms/web/
- [ ] OpenAPI spec is valid YAML and served at /openapi.yaml
- [ ] Deployment configs are complete (.env.example, Dockerfile, docker-compose.yml)
- [ ] Both READMEs updated with architecture overview
- [ ] No TypeScript diagnostics in new files
