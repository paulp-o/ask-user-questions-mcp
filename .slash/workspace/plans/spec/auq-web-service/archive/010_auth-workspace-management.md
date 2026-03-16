---
created: 2026-03-16T16:00:00Z
last_updated: 2026-03-16T16:00:00Z
type: spec
change_id: auq-web-service
plan_number: 10
status: pending
trigger: "Phase 10: Auth & Workspace Management — workspace creation, API key gen, session auth, push notifications, admin"
depends_on: "008_web-platform-frontend-pwa.md"
next: "011_polish-docs-e2e.md"
---

# Plan: Auth & Workspace Management (Phase 10)

## Background & Research

### Current State Summary

The web platform has API key auth middleware that validates Bearer tokens against hashed keys in SQLite, but there is NO server-side workspace creation or API key generation. The setup page simply stores user-provided API keys in localStorage. Push notifications have a placeholder store that sets `isSubscribed = true` locally without actual Web Push subscription logic.

### DB Schema (already exists — `platforms/web/src/lib/db/schema.ts`)
```ts
export const workspaces = sqliteTable('workspaces', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

export const apiKeys = sqliteTable('api_keys', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id),
  keyHash: text('key_hash').notNull().unique(),
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }),
  lastUsedAt: integer('last_used_at', { mode: 'timestamp' })
});

export const pushSubscriptions = sqliteTable('push_subscriptions', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id),
  endpoint: text('endpoint').notNull(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  userAgent: text('user_agent'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  lastUsedAt: integer('last_used_at', { mode: 'timestamp' })
});
```

### Auth Middleware (`platforms/web/src/lib/api/auth.ts`)
```ts
export async function authenticateApiKey(
  request: Request,
  database: ReturnType<typeof createDb>
): Promise<{ workspace: typeof workspaces.$inferSelect; apiKeyRecord: typeof apiKeys.$inferSelect } | null> {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return null;
  const rawApiKey = authorization.slice('Bearer '.length).trim();
  if (!rawApiKey) return null;
  const keyHash = createHash('sha256').update(rawApiKey).digest('hex');
  const now = new Date();
  const row = database.select({ workspace: workspaces, apiKeyRecord: apiKeys })
    .from(apiKeys).innerJoin(workspaces, eq(apiKeys.workspaceId, workspaces.id))
    .where(eq(apiKeys.keyHash, keyHash)).limit(1).all()[0];
  if (!row) return null;
  if (row.apiKeyRecord.expiresAt && row.apiKeyRecord.expiresAt <= now) return null;
  database.update(apiKeys).set({ lastUsedAt: now }).where(eq(apiKeys.id, row.apiKeyRecord.id)).run();
  return row;
}
```

### Error Helpers (`platforms/web/src/lib/api/errors.ts`)
```ts
export function apiError(status: number, code: string, message: string) {
  return json({ error: { code, message } }, { status });
}
export function validationError(issues: Array<{ path: (string | number)[]; message: string }>) { ... }
export function unauthorizedError(message = 'Invalid or missing API key') { return apiError(401, 'UNAUTHORIZED', message); }
export function notFoundError(resource: string) { return apiError(404, 'NOT_FOUND', `${resource} not found`); }
```

### Notification Store (placeholder — `platforms/web/src/lib/stores/notifications.svelte.ts`)
```ts
class NotificationsStore {
  permission = $state<NotificationPermission>(this.getInitialPermission());
  isSubscribed = $state(false);
  async subscribe(): Promise<boolean> {
    // PLACEHOLDER: just sets isSubscribed = true, no actual push subscription
    this.isSubscribed = true;
    return true;
  }
  async unsubscribe(): Promise<void> { this.isSubscribed = false; }
}
```

### Workspace Store (`platforms/web/src/lib/stores/workspace.svelte.ts`)
```ts
class WorkspaceStore {
  apiKey = $state('');
  workspaceId = $state('');
  get isConfigured(): boolean { return this.apiKey.trim().length > 0; }
  setApiKey(key: string): void { this.apiKey = key; writeStorage(API_KEY_STORAGE_KEY, key); }
  setWorkspaceId(id: string): void { this.workspaceId = id; writeStorage(WORKSPACE_ID_STORAGE_KEY, id); }
  clearAll(): void { ... }
}
```

### Setup Page (`platforms/web/src/routes/setup/+page.svelte`)
- Simple form: user enters API key manually, stored in localStorage, redirects to `/`
- No server validation, no workspace creation

### Settings Page (`platforms/web/src/routes/settings/+page.svelte`)
- Shows masked API key with reveal/copy/disconnect
- Theme toggle
- Push notification toggle (placeholder — calls store.subscribe() which is no-op)
- No API key generation, no workspace creation, no admin features

### Service Worker push handler (`platforms/web/src/service-worker.ts` lines 95-130)
```ts
self.addEventListener('push', (event) => {
  const payload = event.data?.json?.() as PushPayload | undefined;
  event.waitUntil(self.registration.showNotification(payload?.title ?? 'New question', {
    body: payload?.body ?? 'You have a pending question to answer.',
    icon: '/icon-192.png', badge: '/icon-192.png',
    data: { url: payload?.url ?? (payload?.questionId ? `/questions/${payload.questionId}` : '/') }
  }));
});
```

### Test Pattern (from `platforms/web/src/lib/api/__tests__/auth.test.ts`)
- Uses `bun:sqlite` compatibility wrapper for `better-sqlite3`
- Uses `bun:test` (describe, expect, it, mock)
- `mock.module('better-sqlite3', ...)` then dynamic imports
- `createDb(':memory:')` with migration SQL applied
- Seed functions for test data

### Frontend API Client (`platforms/web/src/lib/api/client.ts`)
```ts
export class ApiClient {
  constructor(apiKey: ApiKeyProvider, baseUrl = '/api/v1') { ... }
  async get<T>(path: string): Promise<T> { ... }
  async post<T>(path: string, body: unknown): Promise<T> { ... }
  async del<T>(path: string): Promise<T> { ... }
}
```

### CORS Hook (`platforms/web/src/hooks.server.ts`)
- Sets `Access-Control-Allow-Origin: *` on `/api` routes
- Handles OPTIONS preflight

### Existing API Routes
- `POST /api/v1/questions` — create questions (auth + rate limit)
- `GET /api/v1/questions/[id]` — get question
- `DELETE /api/v1/questions/[id]` — abandon question
- `POST /api/v1/questions/[id]/answer` — submit answers
- `GET /api/v1/questions/stream` — SSE for real-time updates
- **NO** workspace/key management routes exist

### Key Gaps to Fill
1. **Workspace creation API** — `POST /api/v1/workspaces` creates workspace + first API key, returns raw key
2. **API key management API** — `POST /api/v1/workspaces/:id/keys` generates new key, `DELETE .../keys/:keyId` revokes
3. **Setup flow update** — setup page calls workspace creation API (or validates existing key), stores key + workspace ID
4. **Push subscription API** — `POST /api/v1/push/subscribe`, `DELETE /api/v1/push/unsubscribe` for Web Push registration
5. **VAPID config** — read `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` from env, expose public key endpoint
6. **Push notification sending** — when question is POSTed, send push to workspace's subscribers via `web-push`
7. **Notification store** — real subscription logic using service worker `pushManager.subscribe()`
8. **Expired key UX** — setup page validates key on submit, shows expiry error

---

## Testing Plan (TDD — tests first)

### Batch 1 Tests: Workspace & Key Management API
- [ ] Create `platforms/web/src/routes/api/v1/workspaces/__tests__/post.test.ts` — test POST /api/v1/workspaces: creates workspace + API key, returns `{ workspace: { id, name }, apiKey: { id, rawKey } }`, validates name required, validates name length (1-100 chars)
- [ ] Create `platforms/web/src/routes/api/v1/workspaces/__tests__/keys.test.ts` — test POST /api/v1/workspaces/:id/keys: generates new key for authenticated workspace, returns raw key, validates key name required; test DELETE /api/v1/workspaces/:id/keys/:keyId: revokes key, returns 404 for non-existent key, prevents deleting last key

### Batch 2 Tests: Push Subscription & VAPID
- [ ] Create `platforms/web/src/routes/api/v1/push/__tests__/subscribe.test.ts` — test POST /api/v1/push/subscribe: stores push subscription (endpoint, p256dh, auth) for authenticated workspace, rejects if no auth, rejects invalid subscription format; test DELETE /api/v1/push/unsubscribe: removes subscription by endpoint
- [ ] Create `platforms/web/src/routes/api/v1/push/__tests__/vapid.test.ts` — test GET /api/v1/push/vapid-key: returns public key from env, returns 503 if VAPID not configured
- [ ] Create `platforms/web/src/lib/api/__tests__/push-sender.test.ts` — test `sendPushNotification()`: calls web-push with correct VAPID details, handles expired subscriptions (deletes from DB), handles send failures gracefully

---

## Implementation Plan

### Batch 1: Workspace & Key Management API Routes
- [ ] Create `platforms/web/src/lib/api/key-generator.ts` — `generateApiKey()` returns `{ rawKey: string, keyHash: string }` using `crypto.randomBytes(32)` for raw key prefixed with `auq_`, SHA-256 hash for storage
- [ ] Create `platforms/web/src/lib/api/schemas.ts` additions — add `CreateWorkspaceBodySchema` (name: string min 1 max 100), `CreateApiKeyBodySchema` (name: string min 1 max 100, expiresInDays?: number)
- [ ] Create `platforms/web/src/routes/api/v1/workspaces/+server.ts` — POST handler: validate body, create workspace (uuid), generate API key, insert both, return `{ workspace: { id, name }, apiKey: { id, name, rawKey, expiresAt } }`. No auth required (this is workspace creation).
- [ ] Create `platforms/web/src/routes/api/v1/workspaces/[id]/keys/+server.ts` — POST handler: authenticate via Bearer token, verify workspace ownership, generate new key, insert, return raw key. GET handler: list keys for workspace (without hashes). 
- [ ] Create `platforms/web/src/routes/api/v1/workspaces/[id]/keys/[keyId]/+server.ts` — DELETE handler: authenticate, verify ownership, prevent deleting last key, soft-delete or hard-delete key.

### Batch 2: Push Notification Backend
- [ ] Add `web-push` to `platforms/web/package.json` dependencies
- [ ] Create `platforms/web/src/lib/api/push-sender.ts` — `sendPushToWorkspace(workspaceId, payload)`: query all push subscriptions for workspace, send via `web-push.sendNotification()` with VAPID details from env (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`), handle 410 Gone (delete stale subscription), handle other errors gracefully
- [ ] Create `platforms/web/src/routes/api/v1/push/subscribe/+server.ts` — POST handler: authenticate, validate subscription body (endpoint, keys.p256dh, keys.auth), upsert into push_subscriptions table
- [ ] Create `platforms/web/src/routes/api/v1/push/unsubscribe/+server.ts` — POST handler: authenticate, delete subscription by endpoint
- [ ] Create `platforms/web/src/routes/api/v1/push/vapid-key/+server.ts` — GET handler: return `{ publicKey: process.env.VAPID_PUBLIC_KEY }`, 503 if not configured
- [ ] Update `platforms/web/src/routes/api/v1/questions/+server.ts` — after inserting question, call `sendPushToWorkspace()` to notify workspace subscribers (fire-and-forget, don't block response)

### Batch 3: Frontend — Setup Flow, Notification Store, Settings
- [ ] Update `platforms/web/src/routes/setup/+page.svelte` — add "Create new workspace" flow: name input → POST /api/v1/workspaces → store returned apiKey + workspaceId. Keep existing "Enter API key" option as alternative. Add server-side key validation (GET /api/v1/questions/stream with key to check validity). Show specific error for expired/invalid keys.
- [ ] Update `platforms/web/src/lib/stores/notifications.svelte.ts` — implement real `subscribe()`: fetch VAPID public key from `/api/v1/push/vapid-key`, call `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })`, POST subscription to `/api/v1/push/subscribe`. Implement real `unsubscribe()`: get current subscription from `pushManager.getSubscription()`, POST endpoint to `/api/v1/push/unsubscribe`, call `subscription.unsubscribe()`.
- [ ] Update `platforms/web/src/lib/stores/workspace.svelte.ts` — add `workspaceName` state field, add `setWorkspace(id, name, apiKey)` method for creation flow
- [ ] Update `platforms/web/src/routes/settings/+page.svelte` — add "API Keys" section showing list of keys (from GET /api/v1/workspaces/:id/keys), add "Generate New Key" button, add "Revoke Key" per-key button with confirmation, show workspace name/ID. Add key expiration display. Show push notification error states (VAPID not configured, permission denied).

### Batch 4: Expired Key Handling & Admin
- [ ] Update `platforms/web/src/lib/api/auth.ts` — when key is expired, return a specific error code `KEY_EXPIRED` instead of generic null (add new return type or error field)
- [ ] Update `platforms/web/src/lib/api/errors.ts` — add `expiredKeyError()` helper returning 401 with code `KEY_EXPIRED`
- [ ] Update `platforms/web/src/routes/+page.ts` — handle `KEY_EXPIRED` error specifically in the root load function, redirect to setup with `?reason=expired` query param
- [ ] Update `platforms/web/src/routes/setup/+page.svelte` — read `reason` query param, show "Your API key has expired. Please create a new workspace or enter a valid key." message
- [ ] Create `platforms/web/src/routes/admin/+page.svelte` — basic admin page: list all workspaces with key count, question count, last activity. Protected by a simple `ADMIN_API_KEY` env var check. Show workspace details (keys, subscriptions).

---

## Parallelization Plan

### Batch 1 (parallel — two coders, separate file sets)
- [ ] Coder A: **Workspace & Key Management API + tests** → files: `platforms/web/src/lib/api/key-generator.ts` (NEW), `platforms/web/src/lib/api/schemas.ts` (EDIT — add workspace/key schemas), `platforms/web/src/routes/api/v1/workspaces/+server.ts` (NEW), `platforms/web/src/routes/api/v1/workspaces/[id]/keys/+server.ts` (NEW), `platforms/web/src/routes/api/v1/workspaces/[id]/keys/[keyId]/+server.ts` (NEW), `platforms/web/src/routes/api/v1/workspaces/__tests__/post.test.ts` (NEW), `platforms/web/src/routes/api/v1/workspaces/__tests__/keys.test.ts` (NEW)
- [ ] Coder B: **Push Notification Backend + tests** → files: `platforms/web/src/lib/api/push-sender.ts` (NEW), `platforms/web/src/routes/api/v1/push/subscribe/+server.ts` (NEW), `platforms/web/src/routes/api/v1/push/unsubscribe/+server.ts` (NEW), `platforms/web/src/routes/api/v1/push/vapid-key/+server.ts` (NEW), `platforms/web/src/routes/api/v1/push/__tests__/subscribe.test.ts` (NEW), `platforms/web/src/routes/api/v1/push/__tests__/vapid.test.ts` (NEW), `platforms/web/src/lib/api/__tests__/push-sender.test.ts` (NEW), `platforms/web/package.json` (EDIT — add web-push dep)

### Batch 2 (after Batch 1 — two coders, separate file sets)
- [ ] Coder C: **Push notification trigger + notification store** → files: `platforms/web/src/routes/api/v1/questions/+server.ts` (EDIT — add push trigger after question insert), `platforms/web/src/lib/stores/notifications.svelte.ts` (EDIT — real push subscription logic)
- [ ] Coder D: **Setup flow + Settings + Workspace store** → files: `platforms/web/src/routes/setup/+page.svelte` (EDIT — workspace creation flow), `platforms/web/src/routes/settings/+page.svelte` (EDIT — key management UI), `platforms/web/src/lib/stores/workspace.svelte.ts` (EDIT — add workspaceName)

### Batch 3 (after Batch 2 — single coder)
- [ ] Coder E: **Expired key handling + Admin page** → files: `platforms/web/src/lib/api/auth.ts` (EDIT — expired key detection), `platforms/web/src/lib/api/errors.ts` (EDIT — add expiredKeyError), `platforms/web/src/routes/+page.ts` (EDIT — handle KEY_EXPIRED), `platforms/web/src/routes/setup/+page.svelte` (EDIT — expired reason), `platforms/web/src/routes/admin/+page.svelte` (NEW)

### Dependencies
- Batch 1 coders are fully independent (workspace API vs push API — different route paths, different files)
- Batch 2 depends on Batch 1: Coder C needs push-sender from Coder B, Coder D needs workspace creation API from Coder A
- Batch 3 depends on Batch 2: expired key handling needs the setup page updates from Coder D

### Risk Areas
- `platforms/web/src/lib/api/schemas.ts` is only modified by Coder A (Batch 1) — no conflict
- `platforms/web/src/routes/setup/+page.svelte` is modified by Coder D (Batch 2) then Coder E (Batch 3) — sequential, no conflict
- `web-push` npm package needs to be installed by Coder B before Coder C can use push-sender — sequential batches handle this
- VAPID keys are env vars — push tests should mock `process.env` rather than requiring real keys

---

## Done Criteria
- [ ] All existing tests still pass (48+ tests)
- [ ] New tests pass: workspace creation, key generation, key revocation, push subscribe/unsubscribe, VAPID endpoint, push sender
- [ ] `bun run build` succeeds in `platforms/web/`
- [ ] Workspace creation flow works: user enters name → gets API key → stored in localStorage → redirected to inbox
- [ ] API key management in settings: list keys, generate new, revoke existing
- [ ] Push notification subscription works with VAPID keys configured
- [ ] Push notifications sent when new question arrives
- [ ] Expired key shows clear error and redirects to setup
- [ ] Admin page shows workspace list with basic stats
