---
created: 2026-03-17T00:30:00.000Z
last_updated: 2026-03-17T00:30:00.000Z
type: nonspec
plan_number: 1
status: pending
trigger: "Comprehensive rewrite — audit every frontend file against actual backend API and fix all mismatches until the app works end-to-end"
depends_on: "none"
next: "TBD"
---

# Plan: Comprehensive Frontend Audit & Fix

## Background & Research

### DEFINITIVE API CONTRACT (Source of Truth)

Every frontend file must conform to these exact contracts. Any deviation is a bug.

#### 1. POST /api/v1/workspaces (NO AUTH)

**Request**: `{ name: string }`
**Response 200**: `{ workspace: { id, name }, apiKey: { id, name, rawKey } }`
**Auth**: NONE — this is the only unauthenticated endpoint (besides vapid-key)

#### 2. GET /api/v1/workspaces/[id]/keys (Bearer token)

**Request**: no body
**Response 200**: `{ keys: [{ id, name, createdAt, expiresAt, lastUsedAt }] }`
**Auth**: `Authorization: Bearer <rawKey>` — authenticateApiKey hashes and matches against api_keys.keyHash
**Note**: Response does NOT include `prefix` or `rawKey` — only metadata

#### 3. POST /api/v1/workspaces/[id]/keys (Bearer token)

**Request**: `{ name: string, expiresInDays?: number }`
**Response 200**: `{ id, name, rawKey, expiresAt }`
**Auth**: Bearer token — workspace.id must match params.id

#### 4. DELETE /api/v1/workspaces/[id]/keys/[keyId] (Bearer token)

**Response 200**: `{ success: true }`
**Error 400**: `{ code: 'LAST_API_KEY', message: 'Cannot revoke the last API key' }`

#### 5. POST /api/v1/questions (Bearer token)

**Request**: `{ questions: [{ prompt, title, options: [{label,value}], multiSelect? }], title? }`
**Response 200**: `{ id, status: 'pending' }`

#### 6. GET /api/v1/questions/[id] (Bearer token)

**Response 200**: `{ status, answers?: [{ questionIndex, selectedOption?, selectedOptions?, customText?, timestamp }], rejectionReason: null }`
**Note**: status is one of: `pending`, `in_progress`, `completed`, `rejected`, `timed_out`, `abandoned`

#### 7. DELETE /api/v1/questions/[id] (Bearer token)

Delegated to handler. Returns success.

#### 8. POST /api/v1/questions/[id]/answer (Bearer token)

**Request**: `{ answers: [{ questionIndex, selectedOption?, selectedOptions?, customText? }] }`
**Response 200**: `{ success: true }`
**Note**: NOT the question object — just `{ success: true }`

#### 9. GET /api/v1/questions/stream (NO Bearer — uses query param)

**URL**: `/api/v1/questions/stream?workspaceId=<id>`
**Auth**: NONE (no bearer token — just workspaceId query param)
**SSE events**: `data: { type: 'questions', data: <question_rows> }` (full question DB rows with questionsJson, status, etc.)
**Note**: Does NOT send named events like 'connected', 'question-created', 'question-answered'. Only sends generic `data:` messages.

#### 10. GET /api/v1/analytics (Bearer token)

**Response 200**: `{ questionsPerDay: [{date,count}], avgResponseTimeMs, pendingCount, answeredCount, totalCount, pendingRatio }`

#### 11. POST /api/v1/push/subscribe (Bearer token)

**Request**: `{ endpoint: string, keys: { p256dh: string, auth: string } }`
**Note**: expects `keys.p256dh` and `keys.auth` directly — NOT `{ subscription: sub.toJSON(), workspaceId }`

#### 12. POST /api/v1/push/unsubscribe (Bearer token)

**Request**: `{ endpoint: string }`

#### 13. GET /api/v1/push/vapid-key (NO AUTH)

**Response 200**: `{ publicKey: string }`

#### Authentication Mechanism

`authenticateApiKey()` in `src/lib/api/auth.ts`:

- Reads `Authorization: Bearer <rawKey>` header
- SHA-256 hashes the rawKey
- Matches against `api_keys.keyHash` in DB
- Returns `{ workspace, apiKeyRecord }` on success
- The rawKey is generated during workspace creation or key creation and MUST be stored by the client

### DB Schema (questions table statuses)

Valid statuses: `pending`, `in_progress`, `completed`, `rejected`, `timed_out`, `abandoned`
(NOT `answered` or `expired` — the frontend Question type has wrong status values)

### CRITICAL BUG CATALOG

#### BUG 1: Questions store — wrong SSE protocol

**File**: `src/lib/stores/questions.svelte.ts`
**Issue**: Store listens for named events (`connected`, `questions`, `question-created`, `question-answered`) but the SSE endpoint sends generic `data:` messages with `{ type: 'questions', data: [...] }`.
**Fix**: Use `eventSource.onmessage` instead of `addEventListener('questions', ...)`. Parse `{ type, data }` from event.data. Also: SSE URL should NOT pass apiKey as query param — it only needs workspaceId.

#### BUG 2: Questions store — wrong Question type statuses

**File**: `src/lib/stores/questions.svelte.ts`
**Issue**: `status: 'pending' | 'answered' | 'expired'` — should be `'pending' | 'in_progress' | 'completed' | 'rejected' | 'timed_out' | 'abandoned'`
**Fix**: Update the type. The Question type should also match the DB row shape (has `questionsJson`, `title`, `workspaceId`, not `prompt`, `type`, `options`).

#### BUG 3: Questions store — wrong Question shape

**File**: `src/lib/stores/questions.svelte.ts`
**Issue**: `Question` type has `{ prompt, type, options }` but SSE sends raw DB rows with `{ questionsJson, title, status, workspaceId, createdAt, updatedAt }`. The actual questions are inside `questionsJson` (a JSON string).
**Fix**: Redefine Question type to match DB row. Parse `questionsJson` when displaying.

#### BUG 4: Questions store — submitAnswer sends wrong format

**File**: `src/lib/stores/questions.svelte.ts`
**Issue**: `submitAnswer(questionId, answers: string[], apiKey)` sends `{ answers: string[] }` but API expects `{ answers: [{ questionIndex, selectedOption?, selectedOptions?, customText? }] }`.
**Fix**: Change signature and format to match SubmitAnswersBodySchema.

#### BUG 5: Questions store — submitAnswer expects question object back

**File**: `src/lib/stores/questions.svelte.ts`
**Issue**: `const updated: Question = await res.json()` but API returns `{ success: true }`, not a question object.
**Fix**: After successful submit, update the local question's status to 'completed' manually.

#### BUG 6: Notifications store — sends wrong subscribe body

**File**: `src/lib/stores/notifications.svelte.ts`
**Issue**: Sends `{ subscription: sub.toJSON(), workspaceId }` but API expects `{ endpoint, keys: { p256dh, auth } }`.
**Fix**: Extract endpoint and keys from the PushSubscription and send them directly.

#### BUG 7: Notifications store — unsubscribe sends no body

**File**: `src/lib/stores/notifications.svelte.ts`
**Issue**: No body on unsubscribe request. API expects `{ endpoint: string }`.
**Fix**: Store the subscription endpoint and send it on unsubscribe.

#### BUG 8: Analytics page — uses `firstKey.prefix` as Bearer token

**File**: `src/routes/app/analytics/+page.svelte`
**Issue**: `analyticsStore.load(firstKey.prefix)` — but ApiKey type has no `prefix` field. Should use the raw API key from localStorage.
**Fix**: Use `localStorage.getItem('auq-api-key')` as the Bearer token.

#### BUG 9: Inbox page — uses `keys[0].prefix` as Bearer token

**File**: `src/routes/app/inbox/+page.svelte`
**Issue**: Same as BUG 8. `keys[0].prefix` doesn't exist. Also passes apiKey to SSE which doesn't need it.
**Fix**: SSE only needs workspaceId. Remove apiKey from connect() call.

#### BUG 10: Settings page — ApiKeyCard passes `key.prefix`

**File**: `src/routes/app/settings/+page.svelte` line 263
**Issue**: `apiKey={{ id: key.id, key: key.prefix + '...', name: key.name, createdAt: key.createdAt }}` — `key.prefix` doesn't exist.
**Fix**: API key list from GET /keys returns `{ id, name, createdAt, expiresAt, lastUsedAt }`. No prefix, no rawKey. Can't show masked key. Show name + dates only.

#### BUG 11: ApiKeyCard — $derived as function

**File**: `src/lib/components/app/ApiKeyCard.svelte`
**Issue**: `maskedKey` and `createdDate` use `$derived(() => {...})` which returns a function, then called as `{maskedKey()}`. In Svelte 5, `$derived()` returns the VALUE. Should use `$derived.by()` or access without `()`.
**Fix**: Use `$derived.by(() => {...})` and access as `{maskedKey}` without parentheses (or keep `$derived` and call directly).
**UPDATE**: Actually looking again, it uses `$derived(() => {...})` which wraps a function. Calling `maskedKey()` would call the wrapper... this is wrong. Use `$derived.by()`.

#### BUG 12: UsageStatsCard — `<stat.icon>` dynamic component

**File**: `src/lib/components/app/UsageStatsCard.svelte`
**Issue**: `<stat.icon class="h-3.5 w-3.5" />` — dynamically using a component from an object property. This works in Svelte 5 (components are dynamic by default) but may cause `{@const}` issues in the each block if combined.
**Fix**: Verify this works. May need `{@const Icon = stat.icon}` pattern inside `{#each}`.

#### BUG 13: Inbox page — $effect should load workspace first

**File**: `src/routes/app/inbox/+page.svelte`
**Issue**: `$effect()` checks `workspaceStore.workspaceId` and `workspaceStore.apiKeys.length > 0` but after Clerk migration, workspace data is only in localStorage. If user just created workspace, apiKeys might be empty since loadWorkspace is never called on page mount.
**Fix**: On app layout mount, if workspaceId exists in localStorage and apiKey exists, call `workspaceStore.loadWorkspace()` to populate apiKeys list.

#### BUG 14: App layout — no workspace initialization

**File**: `src/routes/app/+layout.svelte`
**Issue**: The app layout doesn't initialize workspace from localStorage. Individual pages check `workspaceStore.workspaceId` and `workspaceStore.apiKeys` but these are only populated from localStorage (id/name) and never fetch keys.
**Fix**: Add `$effect` in app layout to auto-load workspace if localStorage has both workspaceId and apiKey.

#### BUG 15: QuestionCard — wrong props

**File**: `src/lib/components/app/QuestionCard.svelte`
**Issue**: Expects `Question` type with `prompt`, `options`, `type`, `status: 'pending'|'answered'|'expired'`. But actual SSE data has `questionsJson`, `title`, `status: 'pending'|'completed'|...`.
**Fix**: Update to use `title` or parse first item from `questionsJson`. Update status types.

#### BUG 16: Question detail page — wrong question shape assumptions

**File**: `src/routes/app/questions/[id]/+page.svelte`
**Issue**: Uses `question.prompt`, `question.type`, `question.options`, `question.answeredAt` — none of these exist on the DB row. The actual question row has `questionsJson`, `title`, `status`, `createdAt`, `updatedAt`.
**Fix**: Parse `questionsJson` to get the individual question items for the AnswerForm. Use `title` or first item's prompt for display.

#### BUG 17: AnswerForm — wrong answer format

**File**: `src/lib/components/app/AnswerForm.svelte`
**Issue**: `onSubmit: (questionId: string, answers: string[]) => void` — returns string[] but API needs `{ answers: [{ questionIndex, selectedOption?, selectedOptions?, customText? }] }`.
**Fix**: Change to return structured answer objects.

#### BUG 18: StatusBadge — wrong status mapping

**File**: `src/lib/components/app/StatusBadge.svelte`
**Issue**: Has correct DB statuses (`pending`, `in_progress`, `completed`, etc.) but inbox page filters by `answered` which doesn't exist.
**Fix**: Inbox filter should use `completed` not `answered`.

#### BUG 19: Admin page — calls nonexistent endpoint

**File**: `src/routes/app/admin/+page.svelte`
**Issue**: Calls `GET /api/v1/admin/workspaces` which doesn't exist in the backend routes.
**Fix**: Admin page can show a "Coming Soon" placeholder or pull data from a different mechanism. Since there's no admin API, make it display-only with local data.

#### BUG 20: Notifications subscribe — no VAPID key fetch

**File**: `src/lib/stores/notifications.svelte.ts`
**Issue**: `applicationServerKey: undefined` in pushManager.subscribe(). Should fetch VAPID public key from GET /api/v1/push/vapid-key first.
**Fix**: Fetch VAPID key before subscribing.

---

## Testing Plan (TDD - tests first)

All store tests are in `platforms/web/src/__tests__/stores/`. The existing 34 tests pass. We need to update them to match the new store shapes.

- [ ] Update `questions.svelte.test.ts`: change Question type to match DB row shape (questionsJson, title, status with correct values), update submitAnswer to use structured format, update SSE mock to use generic `onmessage` not named events
- [ ] Update `workspace.svelte.test.ts`: remove any reference to `prefix` field, verify loadWorkspace fetches keys correctly
- [ ] Update `notifications.svelte.test.ts`: update subscribe to send `{ endpoint, keys: { p256dh, auth } }` format, update unsubscribe to send `{ endpoint }`, add VAPID key fetch mock
- [ ] Update `analytics.svelte.test.ts`: verify load() uses correct Bearer token from parameter (not prefix)
- [ ] Verify all updated tests pass with `pnpm exec vitest run`

## Implementation Plan

### Batch 1: Stores (Critical — everything depends on correct stores)

**Coder A: questions.svelte.ts + test** → files: `src/lib/stores/questions.svelte.ts`, `src/__tests__/stores/questions.svelte.test.ts`

- [ ] Redefine `Question` type to match DB row: `{ id, workspaceId, status: 'pending'|'in_progress'|'completed'|'rejected'|'timed_out'|'abandoned', title: string|null, questionsJson: string, createdAt: string, updatedAt: string }`
- [ ] Add helper: `getQuestionItems(q: Question): QuestionItem[]` that parses `questionsJson`
- [ ] Fix `connect()`: remove apiKey param, use only `workspaceId` in SSE URL (no apiKey query param), use `eventSource.onmessage` handler that parses `{ type, data }` from event.data
- [ ] Fix `submitAnswer()`: change signature to `submitAnswer(questionId: string, answers: Array<{questionIndex: number, selectedOption?: string, selectedOptions?: string[], customText?: string}>, apiKey: string)`. Send this exact shape. On success (API returns `{ success: true }`), update local question status to `completed`.
- [ ] Remove `deleteQuestion` — or fix it (it calls DELETE /api/v1/questions/[id] which exists and works)
- [ ] Update test file to match all changes

**Coder B: workspace.svelte.ts + test** → files: `src/lib/stores/workspace.svelte.ts`, `src/__tests__/stores/workspace.svelte.test.ts`

- [ ] Keep current implementation mostly as-is (it's mostly correct after recent fixes)
- [ ] Remove any reference to `prefix` field from ApiKey type — API returns `{ id, name, createdAt, expiresAt, lastUsedAt }`, no prefix
- [ ] Add `createKey(name: string, apiKey: string): Promise<{id: string, name: string, rawKey: string, expiresAt: string|null}|null>` method that calls POST /api/v1/workspaces/[id]/keys and returns the new key data (including rawKey for one-time display)
- [ ] Ensure `loadWorkspace` properly sets apiKeys from GET response `data.keys`
- [ ] Update test file

**Coder C: notifications.svelte.ts + analytics.svelte.ts + tests** → files: `src/lib/stores/notifications.svelte.ts`, `src/lib/stores/analytics.svelte.ts`, `src/__tests__/stores/notifications.svelte.test.ts`, `src/__tests__/stores/analytics.svelte.test.ts`

- [ ] Fix notifications `subscribe()`:
  1. First fetch VAPID key: `GET /api/v1/push/vapid-key` → `{ publicKey }`
  2. Use publicKey as `applicationServerKey` in `pushManager.subscribe()`
  3. Extract from PushSubscription: `{ endpoint: sub.endpoint, keys: { p256dh: sub.toJSON().keys.p256dh, auth: sub.toJSON().keys.auth } }`
  4. Send that object (not the raw subscription) to POST /api/v1/push/subscribe with Bearer token
- [ ] Fix notifications `unsubscribe()`: send `{ endpoint: storedEndpoint }` in body with Bearer token. Store the endpoint in a `$state` variable when subscribing.
- [ ] Analytics store is correct — just ensure `load()` param is called with actual rawKey string (not prefix)
- [ ] Update both test files

### Batch 2: Pages + Components (depends on Batch 1 store shapes)

**Coder D: App layout + inbox + settings** → files: `src/routes/app/+layout.svelte`, `src/routes/app/inbox/+page.svelte`, `src/routes/app/settings/+page.svelte`

- [ ] App layout: add `onMount` or `$effect` that checks localStorage for `auq-workspace-id` and `auq-api-key`, and if both exist, calls `workspaceStore.loadWorkspace(id, key)` to populate apiKeys
- [ ] Inbox: remove `keys[0].prefix` usage. Change `$effect` to just check `workspaceStore.workspaceId` and call `questionsStore.connect(id)` (no apiKey param). Fix status filter: `'answered'` → `'completed'`
- [ ] Settings:
  - Remove `key.prefix + '...'` from ApiKeyCard rendering — pass `{ id: key.id, name: key.name, createdAt: key.createdAt }` only
  - Use `workspaceStore.createKey(name, storedKey)` for new key creation instead of raw fetch
  - After key creation, show the rawKey in a one-time dialog before dismissing
  - Fix `apiKey` derived: use `localStorage.getItem('auq-api-key') ?? ''`

**Coder E: Question detail + AnswerForm** → files: `src/routes/app/questions/[id]/+page.svelte`, `src/lib/components/app/AnswerForm.svelte`

- [ ] Question detail:
  - Get question from store using `questionsStore.questions.find(q => q.id === data.id)` (correct)
  - Display `question.title ?? 'Question #' + question.id.slice(0,8)` for heading
  - Parse `JSON.parse(question.questionsJson)` to get items array for AnswerForm
  - Pass parsed items directly, not questionsJson string
  - Use `question.updatedAt` not `question.answeredAt` for timestamp
  - On submit success, redirect to inbox
- [ ] AnswerForm:
  - Change props to accept `items: QuestionItem[]` directly (not questionsJson string)
  - Change `onSubmit` signature to `(questionId: string, answers: Array<{questionIndex: number, selectedOption?: string, selectedOptions?: string[], customText?: string}>) => void`
  - Build structured answer objects in handleSubmit

**Coder F: QuestionCard + ApiKeyCard + StatusBadge + Analytics + Admin** → files: `src/lib/components/app/QuestionCard.svelte`, `src/lib/components/app/ApiKeyCard.svelte`, `src/routes/app/analytics/+page.svelte`, `src/routes/app/admin/+page.svelte`

- [ ] QuestionCard: update `Question` type import, use `question.title` for display, parse `questionsJson` to count items, use correct statuses
- [ ] ApiKeyCard:
  - Remove `key` (masked key) prop — API doesn't return key prefix
  - Change interface to `{ id, name, createdAt, expiresAt?, lastUsedAt? }` to match API response
  - Remove copy-key functionality (rawKey is only available at creation time)
  - Fix `$derived(() => ...)` → `$derived.by(() => ...)` for `createdDate`
  - Remove `maskedKey` derived entirely
  - Show name, creation date, expiry, last used
- [ ] Analytics: fix `$effect` to use `localStorage.getItem('auq-api-key')` instead of `firstKey.prefix`
- [ ] Admin: replace `GET /api/v1/admin/workspaces` call with a "Feature coming soon" placeholder since the endpoint doesn't exist

### Batch 3: Integration test + verification

**Coder G: Run full verification** → all files (read-only verification + targeted fixes)

- [ ] Run `pnpm exec vitest run` — all tests must pass
- [ ] Run `pnpm check` — verify zero NEW errors in our files (pre-existing backend errors OK)
- [ ] Start dev server and test each route:
  - `/` — landing renders, Hero typewriter works
  - `/pricing` — pricing page renders
  - `/login` — Clerk SignIn renders
  - `/signup` — Clerk SignUp renders
  - `/app/inbox` — redirects to login if not authed, shows empty state if authed
  - `/app/settings` — workspace creation flow works (creates workspace, gets apiKey)
  - `/app/settings` — API key creation works (calls correct endpoint, shows rawKey)
  - `/app/analytics` — renders (even with empty data)
  - `/app/admin` — shows placeholder or admin-only gate
- [ ] Fix any remaining issues found during verification

## Parallelization Plan

### Batch 1 (parallel — stores only, no file conflicts)

- [ ] Coder A: questions store + test → files: `src/lib/stores/questions.svelte.ts`, `src/__tests__/stores/questions.svelte.test.ts`
- [ ] Coder B: workspace store + test → files: `src/lib/stores/workspace.svelte.ts`, `src/__tests__/stores/workspace.svelte.test.ts`
- [ ] Coder C: notifications + analytics stores + tests → files: `src/lib/stores/notifications.svelte.ts`, `src/lib/stores/analytics.svelte.ts`, `src/__tests__/stores/notifications.svelte.test.ts`, `src/__tests__/stores/analytics.svelte.test.ts`

### Batch 2 (after Batch 1 — pages use updated store types)

- [ ] Coder D: app layout + inbox + settings → files: `src/routes/app/+layout.svelte`, `src/routes/app/inbox/+page.svelte`, `src/routes/app/settings/+page.svelte`
- [ ] Coder E: question detail + answer form → files: `src/routes/app/questions/[id]/+page.svelte`, `src/lib/components/app/AnswerForm.svelte`
- [ ] Coder F: QuestionCard + ApiKeyCard + analytics page + admin → files: `src/lib/components/app/QuestionCard.svelte`, `src/lib/components/app/ApiKeyCard.svelte`, `src/routes/app/analytics/+page.svelte`, `src/routes/app/admin/+page.svelte`

### Batch 3 (after Batch 2 — integration verification)

- [ ] Coder G: Full verification + targeted fixes → read all files, fix remaining issues

### Dependencies

- Batch 2 depends on Batch 1 because pages import store types
- Batch 3 depends on Batch 2 because it verifies the full integration
- Within each batch, coders have zero file overlap

### Risk Areas

- **SSE protocol mismatch** (BUG 1) is the most critical — if the EventSource handler is wrong, the inbox will never show questions
- **Answer submission format** (BUGs 4-5, 17) — if the answer format is wrong, questions can't be answered at all
- **ApiKey flow** — the rawKey is only returned at creation time, never again. The frontend must save it to localStorage immediately and use it for all subsequent Bearer auth. If this is lost, user needs to create a new key.
- **Notifications** — requires VAPID keys configured server-side. If not configured, subscribe will fail gracefully (503 from API).
- **Admin** — endpoint doesn't exist. Must degrade gracefully.

## Done Criteria

- [ ] All vitest tests pass (including updated store tests)
- [ ] Zero new TypeScript errors from `pnpm check` in our files
- [ ] Landing page renders without errors
- [ ] Login/Signup with Clerk works
- [ ] Workspace creation flow works (POST /workspaces → get rawKey → stored)
- [ ] API key creation works (POST /workspaces/:id/keys → show rawKey once)
- [ ] Inbox connects to SSE and receives question updates
- [ ] Question detail page parses and displays questionsJson correctly
- [ ] Answer submission sends correct structured format
- [ ] Analytics page loads data with correct Bearer token
- [ ] Settings theme toggle works
- [ ] No console errors on any page (except pre-existing backend ones)
