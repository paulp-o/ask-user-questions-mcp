---
created: 2026-03-17T00:10:00.000Z
last_updated: 2026-03-17T00:30:00.000Z
type: nonspec
plan_number: 1
status: done
trigger: "Migrate auth from better-auth to Clerk — better-auth 404s on /api/auth/*, native better-sqlite3 SSR 500s"
depends_on: none
next: TBD
---

# Plan: Migrate better-auth to Clerk (svelte-clerk)

## Background & Research

### Package: `svelte-clerk`

- npm: `svelte-clerk` (v1.0.2+, 6.5K weekly downloads, Svelte 5 compatible)
- Docs: https://svelte-clerk.netlify.app/
- GitHub: https://github.com/wobsoriano/svelte-clerk

### Clerk SvelteKit Integration Pattern

**Root layout server** (`+layout.server.ts`):

```ts
import { buildClerkProps } from "svelte-clerk/server";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = ({ locals }) => {
  return {
    ...buildClerkProps(locals.auth()),
  };
};
```

**Root layout** (`+layout.svelte`):

```svelte
<script lang="ts">
  import { ClerkProvider } from 'svelte-clerk';
  let { children } = $props();
</script>

<ClerkProvider>
  {@render children()}
</ClerkProvider>
```

**Server hooks** (`hooks.server.ts`):

```ts
import { withClerkHandler } from "svelte-clerk/server";
export const handle = withClerkHandler();
```

**Auth guard** (server load):

```ts
import { redirect } from "@sveltejs/kit";
export const load = ({ locals }) => {
  const { userId } = locals.auth();
  if (!userId) throw redirect(307, "/login");
  return { userId };
};
```

**Client-side auth access**:

```svelte
<script lang="ts">
  import { useClerkContext } from 'svelte-clerk/client';
  const ctx = useClerkContext();
  const userId = $derived(ctx.auth.userId);
  const user = $derived(ctx.user);
</script>
```

**SignIn / SignUp pages**:

```svelte
<script lang="ts">
  import { SignIn } from 'svelte-clerk';
</script>
<SignIn />
```

**Sign out**:

```svelte
<script lang="ts">
  import { useClerkContext } from 'svelte-clerk/client';
  const ctx = useClerkContext();
  async function handleSignOut() {
    await ctx.clerk.signOut({ redirectUrl: '/' });
  }
</script>
```

**UserButton** (avatar + dropdown built-in):

```svelte
<script lang="ts">
  import { UserButton } from 'svelte-clerk';
</script>
<UserButton />
```

**Show component** (conditional rendering):

```svelte
<script lang="ts">
  import { Show } from 'svelte-clerk/client';
</script>
<Show when="signed-in">
  <!-- only when signed in -->
</Show>
```

**Env vars needed**:

```env
PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
PUBLIC_CLERK_SIGN_IN_URL=/login
PUBLIC_CLERK_SIGN_UP_URL=/signup
PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/app/inbox
PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/app/inbox
```

**app.d.ts** reference type:

```ts
/// <reference types="svelte-clerk/env" />
```

### Current Files to Modify/Delete

**DELETE these files** (better-auth specific, fully replaced by Clerk):

- `platforms/web/src/lib/server/auth.ts` — betterAuth server config (32 lines)
- `platforms/web/src/lib/auth-client.ts` — createAuthClient (5 lines)
- `platforms/web/src/lib/components/auth/LoginForm.svelte` — custom login form (77 lines)
- `platforms/web/src/lib/components/auth/SignupForm.svelte` — custom signup form (117 lines)
- `platforms/web/src/lib/components/auth/OAuthButtons.svelte` — custom OAuth buttons (53 lines)

**REWRITE these files**:

1. **`hooks.server.ts`** (54 lines) — current code:

```ts
import type { Handle } from "@sveltejs/kit";
import { building } from "$app/environment";
import { svelteKitHandler } from "better-auth/svelte-kit";
import { auth } from "$lib/server/auth";
import { logApiRequest } from "$lib/api/logger";

export const handle: Handle = async ({ event, resolve }) => {
  const sessionData = await auth.api.getSession({
    headers: event.request.headers,
  });
  event.locals.user = sessionData?.user ?? null;
  event.locals.session = sessionData?.session ?? null;

  if (event.url.pathname.startsWith("/api/auth/")) {
    return svelteKitHandler({ event, resolve, auth, building });
  }

  // CORS + logging for /api/ routes (lines 20-51) — KEEP THIS PART
  if (event.url.pathname.startsWith("/api/")) {
    // ... CORS handling + logging (MUST PRESERVE)
  }

  return resolve(event);
};
```

**Target**: Replace with `withClerkHandler()` from svelte-clerk, BUT chain with existing CORS/logging middleware. Use `sequence()` from `@sveltejs/kit` to compose.

2. **`app.d.ts`** (33 lines) — current Locals type has `user` and `session` with better-auth shapes. Replace with `/// <reference types="svelte-clerk/env" />` and simplified types.

3. **`auth.svelte.ts`** (84 lines) — current store wraps `authClient.getSession()` etc. Rewrite to wrap `useClerkContext()`.

4. **`auth.test.ts`** (128 lines) — rewrite to test new Clerk-based auth store.

5. **`+layout.svelte` (root)** (24 lines) — current:

```svelte
<script lang="ts">
  import "../app.css";
  import { page } from '$app/stores';
  import MarketingNav from '$lib/components/marketing/MarketingNav.svelte';
  import Footer from '$lib/components/marketing/Footer.svelte';
  let { children } = $props();
  const showMarketing = $derived(
    !$page.url.pathname.startsWith('/app') &&
    $page.url.pathname !== '/login' &&
    $page.url.pathname !== '/signup'
  );
</script>
{#if showMarketing}<MarketingNav />{/if}
{@render children()}
{#if showMarketing}<Footer />{/if}
```

**Target**: Wrap in `<ClerkProvider>`. Need root `+layout.server.ts` with `buildClerkProps`.

6. **`app/+layout.server.ts`** (12 lines) — current:

```ts
import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";
export const load: LayoutServerLoad = async ({ locals, url }) => {
  if (!locals.user) {
    throw redirect(303, `/login?redirect=${url.pathname}`);
  }
  return { user: locals.user, session: locals.session };
};
```

**Target**: Use `locals.auth().userId` instead of `locals.user`.

7. **`app/+layout.svelte`** (142 lines) — uses `authStore` for sign-out and user display. Replace `authStore.signOut()` with Clerk context signOut. Replace `data.user?.name` with Clerk user. Replace user section with `<UserButton />`.

8. **`app/admin/+page.svelte`** (120 lines) — uses `authStore.user` for admin check (line 31). Replace with Clerk context.

9. **`login/+page.svelte`** (35 lines) — replace entire content with `<SignIn />`.

10. **`signup/+page.svelte`** (35 lines) — replace entire content with `<SignUp />`.

11. **`db/schema.ts`** (157 lines) — remove 4 better-auth tables (lines 69-130) + their type exports (lines 147-157).

12. **`package.json`** — remove `better-auth` + `@types/better-sqlite3` deps, add `svelte-clerk`.

13. **`.env.example`** — replace better-auth vars with Clerk vars.

### Files that reference authStore (complete list from grep):

- `src/lib/stores/auth.svelte.ts` — the store itself
- `src/routes/app/+layout.svelte` — line 14 (import), line 87 (signOut)
- `src/routes/app/admin/+page.svelte` — line 2 (import), lines 31-33 (user check)
- `src/lib/stores/__tests__/auth.test.ts` — test file

## Testing Plan (TDD - tests first)

- [ ] Rewrite `src/lib/stores/__tests__/auth.test.ts` to test Clerk-based auth store (mock `svelte-clerk/client` context, test `isAuthenticated`, `user`, `signOut`)

## Implementation Plan

### DELETE files

- [ ] Delete `src/lib/server/auth.ts`
- [ ] Delete `src/lib/auth-client.ts`
- [ ] Delete `src/lib/components/auth/LoginForm.svelte`
- [ ] Delete `src/lib/components/auth/SignupForm.svelte`
- [ ] Delete `src/lib/components/auth/OAuthButtons.svelte`

### UPDATE package.json + .env.example

- [ ] Remove `better-auth` and `@types/better-sqlite3` from package.json deps; add `svelte-clerk`
- [ ] Replace `.env.example` auth section: remove `BETTER_AUTH_*`, `GITHUB_CLIENT_*`, `GOOGLE_CLIENT_*`; add `PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `PUBLIC_CLERK_SIGN_IN_URL=/login`, `PUBLIC_CLERK_SIGN_UP_URL=/signup`, `PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/app/inbox`, `PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/app/inbox`
- [ ] Run `pnpm install` in `platforms/web/`

### UPDATE server-side auth

- [ ] Rewrite `hooks.server.ts`: import `withClerkHandler` from `svelte-clerk/server`, use `sequence()` from `@sveltejs/kit` to compose Clerk handler + existing CORS/logging handler
- [ ] Update `app.d.ts`: add `/// <reference types="svelte-clerk/env" />`, remove old user/session Locals types (Clerk provides its own)
- [ ] Create `src/routes/+layout.server.ts` (NEW): export load function with `buildClerkProps(locals.auth())`
- [ ] Rewrite `src/routes/app/+layout.server.ts`: use `locals.auth().userId` for auth guard, return `{ userId }`

### UPDATE client-side auth

- [ ] Rewrite `src/lib/stores/auth.svelte.ts`: thin wrapper around Clerk context — export functions that use `useClerkContext()` for `user`, `isAuthenticated`, `signOut`
- [ ] Wrap root `+layout.svelte` in `<ClerkProvider>`, keep marketing nav/footer logic unchanged
- [ ] Update `app/+layout.svelte`: replace `authStore.signOut()` with Clerk `ctx.clerk.signOut()`, replace user display with Clerk `UserButton` or context user, remove `authStore` import
- [ ] Update `app/admin/+page.svelte`: replace `authStore.user` with Clerk context user

### UPDATE auth pages

- [ ] Rewrite `login/+page.svelte`: replace custom form with `<SignIn />` from svelte-clerk, wrap in centered container matching current design
- [ ] Rewrite `signup/+page.svelte`: replace custom form with `<SignUp />` from svelte-clerk, wrap in centered container

### UPDATE DB schema

- [ ] Remove 4 better-auth tables from `src/lib/db/schema.ts` (user, session, account, verification) and their type exports

## Parallelization Plan

### Batch 1 (parallel — 3 coders, no file overlap)

- [ ] **Coder A**: Delete old files + update deps + env → files: `src/lib/server/auth.ts` (DELETE), `src/lib/auth-client.ts` (DELETE), `src/lib/components/auth/LoginForm.svelte` (DELETE), `src/lib/components/auth/SignupForm.svelte` (DELETE), `src/lib/components/auth/OAuthButtons.svelte` (DELETE), `package.json`, `.env.example` + run `pnpm install`
- [ ] **Coder B**: Server-side rewrites → files: `src/hooks.server.ts`, `src/app.d.ts`, `src/routes/+layout.server.ts` (NEW), `src/routes/app/+layout.server.ts`
- [ ] **Coder C**: DB schema cleanup → files: `src/lib/db/schema.ts`

### Batch 2 (after Batch 1 — 3 coders, no file overlap)

- [ ] **Coder D**: Auth store rewrite + tests → files: `src/lib/stores/auth.svelte.ts`, `src/lib/stores/__tests__/auth.test.ts`
- [ ] **Coder E**: Root layout + auth pages → files: `src/routes/+layout.svelte`, `src/routes/login/+page.svelte`, `src/routes/signup/+page.svelte`
- [ ] **Coder F**: App shell + admin page → files: `src/routes/app/+layout.svelte`, `src/routes/app/admin/+page.svelte`

### Dependencies

- Batch 2 depends on Batch 1 because:
  - Coder D needs `svelte-clerk` installed (Coder A)
  - Coder E needs `ClerkProvider` types available (Coder B creates root layout server)
  - Coder F needs `authStore` rewritten first conceptually (though file-wise independent)

### Risk Areas

- `hooks.server.ts`: Must carefully compose `withClerkHandler()` with existing CORS/logging. Use `sequence()` to chain two handlers.
- `auth.svelte.ts`: The new store must expose the SAME interface (`user`, `isAuthenticated`, `signOut`, `isLoading`, etc.) so `app/+layout.svelte` and `admin/+page.svelte` consumers work. Alternatively, consumers can import `useClerkContext` directly — but must be consistent.
- `+layout.server.ts` (root): This file is NEW. Must not conflict with existing marketing routes that don't need auth.
- `better-sqlite3` removal: Only remove `@types/better-sqlite3` from devDeps — the actual `better-sqlite3` is still needed by Drizzle for the app DB. Only the auth tables are removed, not the DB itself.

## Done Criteria

- [ ] `pnpm dev` starts without better-auth warnings or 404 errors
- [ ] `/login` shows Clerk `<SignIn />` component
- [ ] `/signup` shows Clerk `<SignUp />` component
- [ ] `/app/inbox` redirects to `/login` when not authenticated
- [ ] Auth store tests pass (`pnpm exec vitest run src/lib/stores/__tests__/auth.test.ts`)
- [ ] No `better-auth` imports remain in any file
- [ ] DB schema has 0 auth tables (user, session, account, verification removed)
