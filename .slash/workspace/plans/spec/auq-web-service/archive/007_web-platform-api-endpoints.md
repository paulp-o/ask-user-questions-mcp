---
created: 2026-03-16T00:00:00Z
last_updated: 2026-03-16T00:00:00Z
type: spec
change_id: auq-web-service
plan_number: 7
status: pending
trigger: "Phase 7: Implement Web Platform REST API endpoints, auth middleware, workspace routing, SSE, and rate limiting"
depends_on: 006_web-platform-setup-and-elicitation.md
next: 008_web-platform-frontend-pwa.md
---

# Plan: Web Platform — API Endpoints

## Background & Research

### API Contract (from `packages/web-adapter/src/client.ts`)

The `AuqApiClient` makes exactly 2 HTTP calls that the server must implement:

```ts
// POST /api/v1/questions — Create session
async createSession(questions: Question[], title?: string): Promise<CreateSessionResponse> {
  const payload: { questions: Question[]; title?: string } = { questions };
  if (title) payload.title = title;
  return this.request<CreateSessionResponse>('POST', '/api/v1/questions', payload);
}

// GET /api/v1/questions/:id — Poll session status
async getSession(sessionId: string): Promise<GetSessionResponse> {
  return this.request<GetSessionResponse>('GET', `/api/v1/questions/${encodeURIComponent(sessionId)}`);
}
```

Response types expected by the client:
```ts
interface CreateSessionResponse { id: string; status: string; }
interface GetSessionResponse {
  status: SessionStatusValue | 'in_progress';
  answers?: UserAnswer[];
  rejectionReason?: string | null;
  callId?: string;
}
```

Auth header: `Authorization: Bearer <apiKey>` on every request.
Content-Type: `application/json` for POST bodies.
Client retries on 429/500/502/503/504. Reads `{ error: { message } }` from error responses.

### Additional endpoints from design.md (not called by AuqApiClient):

- **POST /api/v1/questions/:id/answer** — Web UI submits answers (no API key, session-based)
- **DELETE /api/v1/questions/:id** — Abandon question set (API key or session)
- **GET /api/v1/questions/stream** — SSE for real-time browser updates (session-based)

### Database Schema (`platforms/web/src/lib/db/schema.ts`)

```ts
// workspaces: id(PK), name, createdAt, updatedAt
// api_keys: id(PK), workspaceId(FK→workspaces), keyHash(unique), name, createdAt, expiresAt, lastUsedAt
// questions: id(PK), workspaceId(FK→workspaces), status, title, questionsJson, createdAt, updatedAt
//   status CHECK: 'pending'|'in_progress'|'completed'|'rejected'|'timed_out'|'abandoned'
// answers: id(PK), questionId(FK→questions), questionIndex, selectedOption, selectedOptionsJson, customText, answeredAt
// push_subscriptions: id(PK), workspaceId(FK→workspaces), endpoint, p256dh, auth, userAgent, createdAt, lastUsedAt
```

### Existing Utilities

**Error helpers** (`platforms/web/src/lib/api/errors.ts`):
```ts
apiError(status, code, message) → json({ error: { code, message } }, { status })
validationError(issues) → json({ error: { code: 'VALIDATION_ERROR', ... } }, { status: 400 })
unauthorizedError(message?) → apiError(401, 'UNAUTHORIZED', message)
notFoundError(resource) → apiError(404, 'NOT_FOUND', `${resource} not found`)
```

**Validation utils** (`platforms/web/src/lib/api/validation.ts`):
```ts
validateBody<T>(request, zodSchema): Promise<T>  // throws { status, code, message, issues? }
validateParams<T>(params, zodSchema): T            // throws { status, code, message, issues? }
```

**DB factory** (`platforms/web/src/lib/db/index.ts`):
```ts
export const createDb = (url: string) => { const sqlite = new Database(url); sqlite.pragma('foreign_keys = ON'); return drizzle(sqlite, { schema }); };
export const db = createDb(DEFAULT_DATABASE_URL);
```

**CORS hooks** (`platforms/web/src/hooks.server.ts`): Already handles OPTIONS preflight and sets CORS headers for all `/api` routes.

### Shared Types (`packages/shared/src/session/types.ts`)

```ts
interface Question { options: Option[]; prompt: string; title: string; multiSelect?: boolean; }
interface Option { description?: string; label: string; }
interface UserAnswer { customText?: string; questionIndex: number; selectedOption?: string; selectedOptions?: string[]; timestamp: string; }
```

### SvelteKit Route Convention

SvelteKit API routes use `+server.ts` files in the routes directory:
- `src/routes/api/v1/questions/+server.ts` → `POST /api/v1/questions`
- `src/routes/api/v1/questions/[id]/+server.ts` → `GET /api/v1/questions/:id`, `DELETE /api/v1/questions/:id`
- `src/routes/api/v1/questions/[id]/answer/+server.ts` → `POST /api/v1/questions/:id/answer`
- `src/routes/api/v1/questions/stream/+server.ts` → `GET /api/v1/questions/stream` (SSE)

Each exports named functions: `GET`, `POST`, `DELETE`, etc. receiving `RequestEvent`.

### Test Pattern (from existing tests at `platforms/web/src/lib/db/__tests__/schema.test.ts`)

Tests use `bun:test` with `describe/it/expect`. DB tests use a BetterSqlite3Compat shim for bun:sqlite. For API route tests, we'll mock the DB module and call handler functions directly.

## Testing Plan (TDD - tests first)

### API Auth Middleware Tests
- [ ] Create `platforms/web/src/lib/api/__tests__/auth.test.ts`
  - [ ] Test: returns null workspace when no Authorization header
  - [ ] Test: returns null workspace when Authorization header is not Bearer format
  - [ ] Test: returns workspace when valid API key hash matches db record
  - [ ] Test: returns null workspace when API key hash not found in db
  - [ ] Test: returns null workspace when API key is expired
  - [ ] Test: updates `lastUsedAt` on successful auth

### POST /api/v1/questions Tests
- [ ] Create `platforms/web/src/routes/api/v1/questions/__tests__/post.test.ts`
  - [ ] Test: returns 401 when no API key provided
  - [ ] Test: returns 400 when body is missing or invalid JSON
  - [ ] Test: returns 400 when questions array is empty
  - [ ] Test: returns 200 with `{ id, status: 'pending' }` on success
  - [ ] Test: stores question record in DB with correct workspaceId and serialized questionsJson
  - [ ] Test: optional title is stored when provided

### GET /api/v1/questions/:id Tests
- [ ] Create `platforms/web/src/routes/api/v1/questions/[id]/__tests__/get.test.ts`
  - [ ] Test: returns 401 when no API key
  - [ ] Test: returns 404 when question ID doesn't exist
  - [ ] Test: returns 404 when question belongs to different workspace
  - [ ] Test: returns `{ status: 'pending' }` for pending question with no answers
  - [ ] Test: returns `{ status: 'completed', answers: [...] }` when completed
  - [ ] Test: answers include selectedOption, selectedOptions, customText fields

### POST /api/v1/questions/:id/answer Tests
- [ ] Create `platforms/web/src/routes/api/v1/questions/[id]/answer/__tests__/post.test.ts`
  - [ ] Test: returns 400 when body is invalid
  - [ ] Test: returns 404 when question ID doesn't exist
  - [ ] Test: returns 400 when question is not in answerable state (already completed)
  - [ ] Test: returns 200 and stores answers on success
  - [ ] Test: updates question status to 'completed' after answers stored

### DELETE /api/v1/questions/:id Tests
- [ ] Create `platforms/web/src/routes/api/v1/questions/[id]/__tests__/delete.test.ts`
  - [ ] Test: returns 401 when no API key
  - [ ] Test: returns 404 when question not found or wrong workspace
  - [ ] Test: returns 200 and updates status to 'abandoned' on success

## Implementation Plan

### Auth Middleware
- [ ] Create `platforms/web/src/lib/api/auth.ts`
  - [ ] Export `authenticateApiKey(request, db)` → `{ workspace, apiKeyRecord } | null`
  - [ ] Extract Bearer token from Authorization header
  - [ ] Hash the raw API key (SHA-256 hex)
  - [ ] Query `api_keys` table by `keyHash`, joining `workspaces`
  - [ ] Check expiry: if `expiresAt` is set and past, return null
  - [ ] Update `lastUsedAt` timestamp on the api_key record
  - [ ] Return `{ workspace, apiKeyRecord }` on success

### Request Schemas
- [ ] Create `platforms/web/src/lib/api/schemas.ts`
  - [ ] `CreateQuestionsBodySchema` — Zod schema: `{ questions: z.array(QuestionZodSchema).min(1), title: z.string().optional() }`
  - [ ] `SubmitAnswersBodySchema` — Zod schema: `{ answers: z.array(z.object({ questionIndex: z.number(), selectedOption: z.string().optional(), selectedOptions: z.array(z.string()).optional(), customText: z.string().optional() })).min(1) }`
  - [ ] Import `OptionSchema` from `@paulp-o/auq-shared` for question validation

### Route: POST /api/v1/questions
- [ ] Create `platforms/web/src/routes/api/v1/questions/+server.ts`
  - [ ] Export `POST` handler
  - [ ] Call `authenticateApiKey(event.request, db)` → 401 if null
  - [ ] Call `validateBody(event.request, CreateQuestionsBodySchema)` → 400 on failure
  - [ ] Generate UUID for question ID
  - [ ] Insert into `questions` table: id, workspaceId, status='pending', title, questionsJson=JSON.stringify(questions), createdAt, updatedAt
  - [ ] Return `json({ id, status: 'pending' })`

### Route: GET /api/v1/questions/:id
- [ ] Create `platforms/web/src/routes/api/v1/questions/[id]/+server.ts`
  - [ ] Export `GET` handler
  - [ ] Call `authenticateApiKey` → 401 if null
  - [ ] Query `questions` table by id
  - [ ] Verify question.workspaceId matches authenticated workspace → 404 if mismatch
  - [ ] If status is 'completed', query `answers` table for this questionId
  - [ ] Map answer rows to UserAnswer format: `{ questionIndex, selectedOption, selectedOptions: JSON.parse(selectedOptionsJson), customText, timestamp: answeredAt.toISOString() }`
  - [ ] Return `json({ status, answers?, rejectionReason? })`

### Route: POST /api/v1/questions/:id/answer
- [ ] Add to `platforms/web/src/routes/api/v1/questions/[id]/answer/+server.ts`
  - [ ] Export `POST` handler
  - [ ] Validate body with `SubmitAnswersBodySchema`
  - [ ] Query question record, verify exists and status is 'pending' or 'in_progress'
  - [ ] Insert each answer into `answers` table with generated ID
  - [ ] Update question status to 'completed' and updatedAt
  - [ ] Return `json({ success: true })`

### Route: DELETE /api/v1/questions/:id
- [ ] Add `DELETE` export to `platforms/web/src/routes/api/v1/questions/[id]/+server.ts`
  - [ ] Call `authenticateApiKey` → 401 if null
  - [ ] Query question, verify workspace ownership → 404 if not found/mismatch
  - [ ] Update status to 'abandoned', updatedAt to now
  - [ ] Return `json({ success: true })`

### Route: GET /api/v1/questions/stream (SSE)
- [ ] Create `platforms/web/src/routes/api/v1/questions/stream/+server.ts`
  - [ ] Export `GET` handler returning a `ReadableStream` as SSE
  - [ ] Accept `workspaceId` query param (from web UI session)
  - [ ] Set headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`
  - [ ] Poll DB every 2s for questions with matching workspaceId and status='pending'
  - [ ] Send `data: {json}` events when new/updated questions detected
  - [ ] Clean up on stream close

### Rate Limiting
- [ ] Create `platforms/web/src/lib/api/rate-limit.ts`
  - [ ] Export `createRateLimiter(opts: { windowMs, maxRequests })` → returns `checkRateLimit(key: string): { allowed: boolean, retryAfter?: number }`
  - [ ] In-memory Map<string, { count, resetAt }> implementation
  - [ ] Apply in auth middleware or per-route: 60 requests/min per API key

## Parallelization Plan

### Batch 1 (parallel — shared infrastructure)
- [ ] Coder A: Auth middleware + request schemas + tests
  - Files: `platforms/web/src/lib/api/auth.ts`, `platforms/web/src/lib/api/schemas.ts`, `platforms/web/src/lib/api/__tests__/auth.test.ts`
- [ ] Coder B: Rate limiting module + tests
  - Files: `platforms/web/src/lib/api/rate-limit.ts`, `platforms/web/src/lib/api/__tests__/rate-limit.test.ts`

### Batch 2 (parallel — routes, after Batch 1)
- [ ] Coder C: POST /api/v1/questions + GET /api/v1/questions/:id + tests
  - Files: `platforms/web/src/routes/api/v1/questions/+server.ts`, `platforms/web/src/routes/api/v1/questions/[id]/+server.ts`, `platforms/web/src/routes/api/v1/questions/__tests__/post.test.ts`, `platforms/web/src/routes/api/v1/questions/[id]/__tests__/get.test.ts`
- [ ] Coder D: POST /:id/answer + DELETE /:id + tests
  - Files: `platforms/web/src/routes/api/v1/questions/[id]/answer/+server.ts`, `platforms/web/src/routes/api/v1/questions/[id]/__tests__/delete.test.ts`, `platforms/web/src/routes/api/v1/questions/[id]/answer/__tests__/post.test.ts`

### Batch 3 (after Batch 2)
- [ ] Coder E: SSE stream endpoint + integration verification
  - Files: `platforms/web/src/routes/api/v1/questions/stream/+server.ts`, `platforms/web/src/routes/api/v1/questions/stream/__tests__/sse.test.ts`

### Dependencies
- Batch 2 depends on Batch 1 because routes import `authenticateApiKey` from auth.ts and schemas from schemas.ts
- Batch 3 depends on Batch 2 because SSE needs the question data flow established
- Within each batch, coders work on completely separate files

### Risk Areas
- The answer route (POST /:id/answer) doesn't use API key auth (it's for the web UI) — need different auth strategy (or no auth for now, add session auth in Phase 10)
- The GET handler and DELETE handler share the same `[id]/+server.ts` file — Coder C writes GET, Coder D writes DELETE in separate file initially, then merge (or assign both to same coder)
- SSE requires careful stream cleanup to avoid memory leaks
- DB schema uses `integer` timestamps (unix epoch) but UserAnswer expects ISO string — need conversion in GET response

## Done Criteria
- [ ] All 6 route handlers implemented and exported correctly
- [ ] Auth middleware validates API keys via SHA-256 hash lookup
- [ ] POST /api/v1/questions creates DB records and returns `{ id, status }` matching client expectations
- [ ] GET /api/v1/questions/:id returns status + answers matching `GetSessionResponse` shape
- [ ] POST /:id/answer stores answers and updates question status to 'completed'
- [ ] DELETE /:id marks question as 'abandoned'
- [ ] SSE endpoint streams question updates
- [ ] Rate limiter prevents abuse (60 req/min default)
- [ ] All tests pass (`bun test` in `platforms/web/`)
- [ ] No TypeScript errors (`bun run check` passes)