---
created: 2026-03-16T18:30:00Z
last_updated: 2026-03-16T19:00:00Z
type: spec
change_id: 2026-03-16-frontend-redesign
plan_number: 2
status: done
trigger: "Phase 2: Auth Full Stack — better-auth server + DB tables + hooks + client + store + auth pages + app shell"
depends_on: "archive/001_cleanup-deps-foundation.md"
next: "003_ui-pages-pwa.md"
---

# Plan: Auth Full Stack (Phase 2)

## Background & Research

### Current hooks.server.ts (platforms/web/src/hooks.server.ts)

```typescript
import type { Handle } from "@sveltejs/kit";

import { logApiRequest } from "$lib/api/logger";

export const handle: Handle = async ({ event, resolve }) => {
  if (event.url.pathname.startsWith("/api/")) {
    const startedAt = Date.now();

    if (event.request.method === "OPTIONS") {
      const response = new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
      const durationMs = Date.now() - startedAt;
      logApiRequest(
        event.request.method,
        event.url.pathname,
        response.status,
        durationMs,
      );
      return response;
    }

    try {
      const response = await resolve(event);
      response.headers.set("Access-Control-Allow-Origin", "*");
      response.headers.set(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS",
      );
      response.headers.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization",
      );

      const durationMs = Date.now() - startedAt;
      logApiRequest(
        event.request.method,
        event.url.pathname,
        response.status,
        durationMs,
      );

      return response;
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      logApiRequest(event.request.method, event.url.pathname, 500, durationMs);
      throw error;
    }
  }

  return resolve(event);
};
```

### Current DB schema (platforms/web/src/lib/db/schema.ts)

Has 5 existing tables: `workspaces`, `apiKeys`, `questions`, `answers`, `pushSubscriptions`.
All use `text('id').primaryKey()` and `integer('...', { mode: 'timestamp' })` patterns.
Type exports at bottom: `Workspace`, `NewWorkspace`, `ApiKey`, `NewApiKey`, `QuestionRecord`, `NewQuestionRecord`, `Answer`, `NewAnswer`, `PushSubscription`, `NewPushSubscription`.

### Current DB connection (platforms/web/src/lib/db/index.ts)

```typescript
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const DEFAULT_DATABASE_URL = process.env.DATABASE_URL || "./data/local.db";

export const createDb = (url: string) => {
  const sqlite = new Database(url);
  sqlite.pragma("foreign_keys = ON");
  return drizzle(sqlite, { schema });
};

export const db = createDb(DEFAULT_DATABASE_URL);
```

### Current .env.example

```env
# Database
DATABASE_URL=./data/local.db

# SvelteKit
ORIGIN=http://localhost:3000
PORT=3000

# Web Push (VAPID) - generate with: npx web-push generate-vapid-keys
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:your-email@example.com

# Admin
ADMIN_API_KEY=
```

### Current package.json — better-auth already installed

```json
"dependencies": {
  "@paulp-o/auq-shared": "file:../../packages/shared",
  "better-auth": "^1.5.5",
  "better-sqlite3": "^12.8.0",
  "drizzle-orm": "^0.45.1",
  "layerchart": "2.0.0-next.46",
  "web-push": "^3.6.7",
  "zod": "^4.3.6"
}
```

### Drizzle config (platforms/web/drizzle.config.ts)

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: "./src/lib/db/schema.ts",
  dialect: "sqlite",
  dbCredentials: { url: process.env.DATABASE_URL || "./data/local.db" },
});
```

### Current root layout (platforms/web/src/routes/+layout.svelte)

```svelte
<script>
  import '../app.css';
  let { children } = $props();
</script>

{@render children()}
```

### Current landing page (platforms/web/src/routes/+page.svelte)

```svelte
<h1>AUQ</h1>
```

### better-auth Integration Reference (from research)

**Server auth pattern:**

```typescript
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "sqlite" }),
  emailAndPassword: { enabled: true },
  socialProviders: {
    github: { clientId: "...", clientSecret: "..." },
    google: { clientId: "...", clientSecret: "..." },
  },
  session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
});
```

**SvelteKit hooks pattern:**

```typescript
import { svelteKitHandler } from "better-auth/svelte-kit";

export const handle = async ({ event, resolve }) => {
  // Populate locals
  const session = await auth.api.getSession({ headers: event.request.headers });
  event.locals.user = session?.user ?? null;
  event.locals.session = session?.session ?? null;
  // Delegate auth routes
  return svelteKitHandler({ event, resolve, auth });
};
```

**Client pattern:**

```typescript
import { createAuthClient } from "better-auth/svelte";
export const authClient = createAuthClient({
  baseURL: "http://localhost:3000",
});
// Usage: authClient.useSession(), authClient.signIn.email(), authClient.signUp.email(), authClient.signIn.social()
```

**Auth DB tables needed (SQLite/Drizzle):**

- `user` — id, name, email, emailVerified, image, createdAt, updatedAt
- `session` — id, expiresAt, token (unique), createdAt, updatedAt, ipAddress, userAgent, userId (FK→user)
- `account` — id, accountId, providerId, userId (FK→user), accessToken, refreshToken, idToken, accessTokenExpiresAt, refreshTokenExpiresAt, scope, password, createdAt, updatedAt
- `verification` — id, identifier, value, expiresAt, createdAt, updatedAt
- All timestamps use `integer('...', { mode: 'timestamp_ms' })`
- Indexes: `session_userId_idx`, `account_userId_idx`, `verification_identifier_idx`

**Auth guard pattern (app/+layout.server.ts):**

```typescript
import { redirect } from "@sveltejs/kit";
export const load = async ({ locals, url }) => {
  if (!locals.user) throw redirect(303, `/login?redirect=${url.pathname}`);
  return { user: locals.user, session: locals.session };
};
```

### Design Spec References

**Auth pages:** Clean centered card layout using shadcn Card. OAuthButtons + form below separator.
**App shell:** Sidebar nav with user avatar dropdown, workspace name, mobile responsive using Sheet.
**Route structure:** `/login`, `/signup` (public), `/app/*` (guarded).
**Svelte 5 runes:** Must use `$state()`, `$derived()`, `$effect()`, `$props()`.
**shadcn components available:** button, card, input, label, badge, tabs, dialog, separator, avatar, sheet, dropdown-menu, table, tooltip, switch, skeleton.
**Icons:** `@lucide/svelte` (already in devDeps).
**Fonts:** Inter + JetBrains Mono (already in app.html).
**Accent color:** amber (#f59e0b).

### app.d.ts Types Needed

```typescript
declare global {
  namespace App {
    interface Locals {
      user: {
        id: string;
        name: string;
        email: string;
        emailVerified: boolean;
        image: string | null;
        createdAt: Date;
        updatedAt: Date;
      } | null;
      session: {
        id: string;
        expiresAt: Date;
        token: string;
        userId: string;
        ipAddress: string | null;
        userAgent: string | null;
        createdAt: Date;
        updatedAt: Date;
      } | null;
    }
  }
}
export {};
```

## Testing Plan (TDD — tests first)

- [ ] Create `platforms/web/src/lib/stores/__tests__/auth.test.ts` — unit tests for auth store: initial state (`user` null, `isLoading` true), `setSession()` populates user, `clearSession()` resets to null, `isAuthenticated` derived is correct
- [ ] Create `platforms/web/src/__tests__/auth-guard.test.ts` — unit test for app layout server load: redirects to `/login?redirect=...` when no user in locals, returns user/session data when authenticated

## Implementation Plan

### Batch 1: Auth Infrastructure (4 coders in parallel)

- [ ] **Coder A** — Auth server config + env: Create `platforms/web/src/lib/server/auth.ts` with `betterAuth()` using `drizzleAdapter(db, { provider: 'sqlite' })`, email/password enabled, GitHub + Google OAuth from env vars, session config (7 day expiry, 1 day refresh); Update `platforms/web/.env.example` adding `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- [ ] **Coder B** — DB schema + migration: Add `user`, `session`, `account`, `verification` tables to `platforms/web/src/lib/db/schema.ts` (AFTER existing tables, BEFORE type exports) with proper indexes; Add type exports for new tables; Run `pnpm exec drizzle-kit generate` in platforms/web/ to create migration
- [ ] **Coder C** — Hooks + auth client: Modify `platforms/web/src/hooks.server.ts` to (1) import auth from `$lib/server/auth`, (2) populate `event.locals.user` and `event.locals.session` via `auth.api.getSession()` for ALL requests, (3) delegate to `svelteKitHandler` from `better-auth/svelte-kit`; KEEP existing CORS headers and logging for `/api/` routes; Create `platforms/web/src/lib/auth-client.ts` with `createAuthClient()` from `better-auth/svelte`; Create or update `platforms/web/src/app.d.ts` with Locals types for user and session
- [ ] **Coder D** — Auth store + tests: Create `platforms/web/src/lib/stores/auth.svelte.ts` wrapping better-auth client — exposes reactive `user`, `session`, `isLoading`, `isAuthenticated` (derived), `signOut()` action using Svelte 5 runes; Create `platforms/web/src/lib/stores/__tests__/auth.test.ts` with unit tests

### Batch 2: Auth UI (2 coders in parallel, after Batch 1)

- [ ] **Coder E** — Auth components: Create `platforms/web/src/lib/components/auth/OAuthButtons.svelte` (GitHub + Google buttons using shadcn Button with variant="outline", lucide icons, calls `authClient.signIn.social()`); Create `platforms/web/src/lib/components/auth/LoginForm.svelte` (email + password using shadcn Input/Label/Button, calls `authClient.signIn.email()`, error state, loading state, link to /signup); Create `platforms/web/src/lib/components/auth/SignupForm.svelte` (name + email + password + confirm password, calls `authClient.signUp.email()`, validation, link to /login)
- [ ] **Coder F** — Auth pages + app shell: Create `platforms/web/src/routes/login/+page.svelte` (centered card with LoginForm + Separator + OAuthButtons, "Don't have an account?" link); Create `platforms/web/src/routes/signup/+page.svelte` (centered card with SignupForm + Separator + OAuthButtons, "Already have an account?" link); Create `platforms/web/src/routes/app/+layout.server.ts` (auth guard — check `locals.user`, redirect to `/login?redirect=...` if null, return user/session); Create `platforms/web/src/routes/app/+layout.svelte` (app shell with sidebar nav using Sheet for mobile: logo, nav links [Inbox, Analytics, Settings], user avatar with dropdown-menu [Sign Out], `{@render children()}` in main content area)

### Batch 3: Verification

- [ ] Run `pnpm exec vitest run` in platforms/web to confirm store tests pass
- [ ] Run `pnpm check` in platforms/web — verify no NEW type errors in our files (pre-existing backend errors are acceptable)
- [ ] Verify all 14 new/modified files exist and are non-empty

## Parallelization Plan

### Batch 1 (4 coders in parallel)

- [ ] Coder A: Auth server + env → files: `src/lib/server/auth.ts`, `.env.example`
- [ ] Coder B: DB schema + migration → files: `src/lib/db/schema.ts`, `drizzle/*` (new migration)
- [ ] Coder C: Hooks + client + types → files: `src/hooks.server.ts`, `src/lib/auth-client.ts`, `src/app.d.ts`
- [ ] Coder D: Auth store + tests → files: `src/lib/stores/auth.svelte.ts`, `src/lib/stores/__tests__/auth.test.ts`

### Batch 2 (2 coders in parallel, after Batch 1)

- [ ] Coder E: Auth components → files: `src/lib/components/auth/OAuthButtons.svelte`, `src/lib/components/auth/LoginForm.svelte`, `src/lib/components/auth/SignupForm.svelte`
- [ ] Coder F: Auth pages + app shell → files: `src/routes/login/+page.svelte`, `src/routes/signup/+page.svelte`, `src/routes/app/+layout.server.ts`, `src/routes/app/+layout.svelte`

### Batch 3 (1 tester, after Batch 2)

- [ ] Tester: Run vitest, svelte-check, file verification

### Dependencies

- Batch 2 needs Batch 1 complete because: auth components import from `$lib/auth-client.ts` (Coder C) and `$lib/stores/auth.svelte.ts` (Coder D); auth pages import auth components; app layout server uses auth from `$lib/server/auth.ts` (Coder A)
- Batch 3 needs Batch 2 complete because: verification checks all files and runs tests

### Risk Areas

- **hooks.server.ts merge complexity**: Coder C must preserve ALL existing CORS and logging logic while adding better-auth delegation. The `svelteKitHandler` should wrap the entire handle function, with the CORS/logging block staying inside.
- **better-auth/svelte import**: The client import is `better-auth/svelte` (NOT `better-auth/svelte-kit` which is the server handler). Double-check import paths.
- **DB schema timestamps**: Existing tables use `{ mode: 'timestamp' }` but better-auth tables need `{ mode: 'timestamp_ms' }`. Keep both — they're separate tables.
- **drizzle-kit generate**: Must run inside `platforms/web/` directory. May fail if schema has import issues — Coder B should verify.
- **app.d.ts**: SvelteKit may already have an auto-generated one. Coder C should check and extend, not overwrite.

## Done Criteria

- [ ] `platforms/web/src/lib/server/auth.ts` exists with betterAuth() config
- [ ] `platforms/web/src/lib/db/schema.ts` has user, session, account, verification tables
- [ ] New Drizzle migration generated in `platforms/web/drizzle/`
- [ ] `platforms/web/src/hooks.server.ts` delegates /api/auth/\*\* to better-auth AND keeps CORS+logging
- [ ] `platforms/web/src/lib/auth-client.ts` exports authClient
- [ ] `platforms/web/src/lib/stores/auth.svelte.ts` exports reactive auth store
- [ ] `platforms/web/.env.example` has all 6 new auth env vars
- [ ] `platforms/web/src/app.d.ts` has Locals types for user/session
- [ ] `platforms/web/src/routes/login/+page.svelte` renders login card with form + OAuth
- [ ] `platforms/web/src/routes/signup/+page.svelte` renders signup card with form + OAuth
- [ ] `platforms/web/src/routes/app/+layout.server.ts` guards with auth redirect
- [ ] `platforms/web/src/routes/app/+layout.svelte` renders app shell with sidebar
- [ ] `platforms/web/src/lib/components/auth/` has OAuthButtons, LoginForm, SignupForm
- [ ] Auth store tests pass
- [ ] No new type errors from our files
