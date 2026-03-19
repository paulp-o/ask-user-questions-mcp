---
created: 2026-03-17T12:00:00Z
last_updated: 2026-03-17T12:00:00Z
type: spec
change_id: auq-web-platform
status: active
trigger: "Build AUQ Web Platform from scratch — full-stack (Hono API + React SPA) in web/ directory"
estimated_phases: 4
---

# Phases Overview: AUQ Web Platform MVP (P0)

## Background & Research

### Project Context

The AUQ (Ask User Questions) repo is an MCP server + terminal TUI (v3.4.0, npm: auq-mcp-server). **No web code, no database, no HTTP API exists.** The web platform is a greenfield build in a new `web/` directory.

### Confirmed Architecture Decisions

| Decision     | Choice                                | Rationale                                                       |
| ------------ | ------------------------------------- | --------------------------------------------------------------- |
| Framework    | Vite + React + React Router v7 (SPA)  | Official Clerk SDK, shadcn/ui native, no SSR complexity         |
| Auth (users) | Clerk (`@clerk/react-router`)         | Already has pk_test/sk_test keys, hosted auth                   |
| Auth (API)   | Bearer token API keys (SHA-256 hash)  | Stateless, per-workspace, simple for agents                     |
| DB           | SQLite via Turso/libsql + Drizzle ORM | Edge-compatible, Vercel-native, free tier                       |
| API Server   | Hono                                  | Zero-config Vercel deploy, streamSSE helper, lightweight        |
| UI           | shadcn/ui (React) + Tailwind CSS v4   | Copy-paste components, amber theme, accessible                  |
| Real-time    | SSE via Hono streamSSE                | One-way server→client, auto-reconnect, simpler than WS          |
| PWA          | vite-plugin-pwa + Web Push API        | autoUpdate, Workbox caching, VAPID push                         |
| Charts       | Recharts                              | React-native, lightweight, amber theming easy                   |
| Deploy       | Vercel (web/ as root directory)       | Zero-config Hono support, Fluid Compute                         |
| Scope        | P0 MVP only                           | Auth, workspaces, API keys, inbox, answer form, push, analytics |

### Tech Stack Specifics (from Research)

**Hono on Vercel:**

- Zero-config deployment — Vercel auto-detects Hono framework
- SSE via `streamSSE(c, async (stream) => { await stream.writeSSE({ data, event, id }) })`
- Must set headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `X-Accel-Buffering: no`
- Node.js 22.x runtime for SSE support

**Drizzle + Turso:**

- `drizzle-orm` + `@libsql/client` packages
- `drizzle.config.ts` with `dialect: 'turso'` and `dbCredentials: { url, authToken }`
- For local dev: `url: 'file:./local.db'` (file-based SQLite)
- Schema uses `sqliteTable`, `text`, `integer` from `drizzle-orm/sqlite-core`
- `drizzle-kit push` for quick schema sync, `drizzle-kit generate` + `migrate` for production

**Clerk + React Router v7:**

- Package: `@clerk/react-router` (NOT `@clerk/clerk-react`)
- `<ClerkProvider publishableKey={...}>` wraps `<BrowserRouter>`
- `useAuth()` → `{ getToken, isSignedIn, userId }`; `useUser()` → `{ user }`
- Protected routes: custom `<ProtectedRoute>` checking `isSignedIn` or `<Protect>` component
- API calls: `const token = await getToken()` → `Authorization: Bearer ${token}`

**shadcn/ui Amber Theme:**

```css
:root {
  --primary: 38 92% 50%; /* #f59e0b amber-500 */
  --primary-foreground: 0 0% 100%; /* white */
  --ring: 38 92% 50%; /* amber focus ring */
  --background: 0 0% 100%;
  --foreground: 222 47% 11%; /* #1e293b near-black */
  --card: 0 0% 100%;
  --muted: 210 40% 96%; /* #f1f5f9 slate-50 */
  --border: 214 32% 91%; /* #e2e8f0 slate-200 */
  --destructive: 0 72% 51%; /* #ef4444 red-500 */
}
```

**vite-plugin-pwa:**

- `VitePWA({ registerType: 'autoUpdate', manifest: {...}, workbox: {...} })`
- `useRegisterSW()` hook for update prompts
- Web Push: VAPID keys, `pushManager.subscribe()`, service worker `push` event listener

### Monorepo Structure

```
ask-user-questions-mcp/          # Existing repo root (DON'T TOUCH src/)
├── src/                         # MCP server (EXISTING - hands off)
├── prd/                         # PRD documents
├── web/                         # NEW — entire web platform
│   ├── package.json             # Separate package (not workspace)
│   ├── vite.config.ts           # Vite + React + PWA
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   ├── drizzle.config.ts        # Drizzle ORM config (Turso)
│   ├── components.json          # shadcn/ui config
│   ├── tailwind.config.ts
│   ├── vercel.json              # Vercel deployment (root: web/)
│   ├── .env.example             # Template env vars
│   ├── index.html               # Vite entry point
│   ├── public/                  # Static assets (PWA icons, sw)
│   ├── drizzle/                 # Migration files (generated)
│   └── src/
│       ├── client/              # React SPA
│       │   ├── main.tsx         # Entry: ClerkProvider + RouterProvider
│       │   ├── router.tsx       # createBrowserRouter config
│       │   ├── App.tsx          # Root component
│       │   ├── pages/           # Route pages
│       │   │   ├── Landing.tsx
│       │   │   ├── SignIn.tsx
│       │   │   ├── SignUp.tsx
│       │   │   ├── AppLayout.tsx     # Sidebar + Outlet
│       │   │   ├── Inbox.tsx
│       │   │   ├── QuestionDetail.tsx
│       │   │   ├── Analytics.tsx
│       │   │   └── Settings.tsx
│       │   ├── components/      # Reusable components
│       │   │   ├── ui/          # shadcn/ui components
│       │   │   ├── QuestionCard.tsx
│       │   │   ├── AnswerForm.tsx
│       │   │   ├── ApiKeyTable.tsx
│       │   │   ├── StatsCard.tsx
│       │   │   ├── Sidebar.tsx
│       │   │   └── TypewriterHero.tsx
│       │   ├── hooks/
│       │   │   ├── useSSE.ts
│       │   │   ├── useApiKey.ts
│       │   │   └── usePushNotifications.ts
│       │   ├── lib/
│       │   │   ├── api.ts       # API client (fetch wrapper)
│       │   │   ├── utils.ts     # cn() helper from shadcn
│       │   │   └── constants.ts
│       │   └── styles/
│       │       └── globals.css  # Tailwind + CSS vars
│       ├── server/              # Hono API server
│       │   ├── index.ts         # Hono app entry (export default)
│       │   ├── routes/
│       │   │   ├── workspaces.ts
│       │   │   ├── apiKeys.ts
│       │   │   ├── questions.ts
│       │   │   ├── answers.ts
│       │   │   ├── analytics.ts
│       │   │   └── push.ts
│       │   ├── middleware/
│       │   │   └── auth.ts      # Bearer token → SHA-256 lookup
│       │   └── db/
│       │       ├── index.ts     # Drizzle client (Turso)
│       │       ├── schema.ts    # All table definitions
│       │       └── migrate.ts   # Migration runner
│       └── shared/
│           ├── types.ts         # Shared TypeScript types
│           └── schemas.ts       # Zod validation schemas
```

### DB Schema (from PRD §7, adapted for Clerk)

With Clerk handling user auth, we skip user/session/account tables. Our schema:

| Table              | Columns                                                                                                               | Notes                                                       |
| ------------------ | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| workspaces         | id, clerkUserId, name, createdAt, updatedAt                                                                           | clerkUserId from Clerk JWT                                  |
| api_keys           | id, workspaceId, keyHash, keyPrefix, name, createdAt, expiresAt, lastUsedAt                                           | keyPrefix stores "auq_xxxx" for display                     |
| questions          | id, workspaceId, status, title, questionsJson, createdAt, updatedAt, timeoutAt                                        | status enum: pending/completed/rejected/timed_out/abandoned |
| answers            | id, questionId, questionIndex, selectedOption, selectedOptionsJson, customText, rejected, rejectionReason, answeredAt | One row per sub-question answered                           |
| push_subscriptions | id, workspaceId, endpoint, p256dh, auth, userAgent, createdAt                                                         | Web Push subscription objects                               |

### API Endpoints (15 total from PRD §6)

| #   | Method | Path                                 | Auth                     | Purpose                          |
| --- | ------ | ------------------------------------ | ------------------------ | -------------------------------- |
| 1   | POST   | /api/v1/workspaces                   | Clerk JWT                | Create workspace                 |
| 2   | GET    | /api/v1/workspaces/{id}              | Bearer key               | Get workspace                    |
| 3   | PATCH  | /api/v1/workspaces/{id}              | Bearer key               | Update workspace                 |
| 4   | POST   | /api/v1/workspaces/{id}/keys         | Clerk JWT                | Create API key                   |
| 5   | GET    | /api/v1/workspaces/{id}/keys         | Clerk JWT                | List API keys                    |
| 6   | DELETE | /api/v1/workspaces/{id}/keys/{keyId} | Clerk JWT                | Revoke API key                   |
| 7   | POST   | /api/v1/questions                    | Bearer key               | Create question (from MCP agent) |
| 8   | GET    | /api/v1/questions/{id}               | Bearer key               | Get question + answers (polling) |
| 9   | GET    | /api/v1/questions/stream             | Bearer key (query param) | SSE stream                       |
| 10  | POST   | /api/v1/questions/{id}/answer        | Clerk JWT or Bearer key  | Submit answer                    |
| 11  | DELETE | /api/v1/questions/{id}               | Bearer key               | Mark abandoned                   |
| 12  | GET    | /api/v1/analytics                    | Clerk JWT                | Analytics summary                |
| 13  | GET    | /api/v1/push/vapid-key               | None (public)            | Get VAPID public key             |
| 14  | POST   | /api/v1/push/subscribe               | Clerk JWT                | Subscribe to push                |
| 15  | POST   | /api/v1/push/unsubscribe             | Clerk JWT                | Unsubscribe from push            |

**Auth note:** Two auth modes coexist:

- **Clerk JWT** — for browser/frontend requests (user managing their workspaces, keys, answering questions)
- **Bearer API key** — for MCP agent requests (creating questions, polling answers, SSE stream)

### Critical Lessons (from previous failed attempt)

1. **API path match**: Every frontend fetch MUST match actual Hono route file — no invented endpoints
2. **SSE parsing**: Use generic `onmessage` with `JSON.parse(event.data)` → `{ type, data }`, NOT `addEventListener('question:created', ...)`
3. **API key rawKey**: Only returned on POST create — frontend must save to localStorage immediately, show copy-once modal
4. **No button nesting**: Don't put `<Button>` inside shadcn `<DialogTrigger>` or `<DropdownMenuTrigger>` — use `asChild` prop
5. **questionsJson**: DB stores as JSON string, parse on read: `JSON.parse(row.questionsJson)`
6. **submitAnswer response**: Returns `{ success: true }`, NOT the question object
7. **Verify routes**: Before writing any frontend API call, check the actual route file exists

---

## Phase 1: Foundation + DB + Auth Middleware (~15min)

- **Target tasks**: Project scaffolding, DB schema, auth middleware, basic server
- **Dependencies**: none
- **Scope**: Bootable Hono server with Drizzle schema, API key auth middleware, Clerk JWT verification, health endpoint. Vite + React skeleton with Clerk provider and router shell. All config files.
- **What ships**: `web/` directory with working dev server (API + SPA), database tables created, auth working on both paths

### Key deliverables:

1. `web/package.json` with all dependencies
2. `web/vite.config.ts` (React + Hono dev proxy)
3. `web/drizzle.config.ts` + `web/src/server/db/schema.ts` (all 5 tables)
4. `web/src/server/index.ts` (Hono app with CORS, health check)
5. `web/src/server/middleware/auth.ts` (Bearer key lookup + Clerk JWT verify)
6. `web/src/client/main.tsx` (ClerkProvider + RouterProvider)
7. `web/src/client/router.tsx` (all route stubs)
8. `web/src/client/styles/globals.css` (amber theme CSS vars)
9. `web/.env.example`, `web/vercel.json`, `web/tsconfig.json`
10. shadcn/ui init + base components (button, card, input, dialog, badge, tabs)

## Phase 2: Core API Endpoints (~15min)

- **Target tasks**: All 15 API endpoints implemented and working
- **Dependencies**: Phase 1 (DB schema + auth middleware)
- **Scope**: Complete REST API — workspaces CRUD, API keys CRUD, questions CRUD, answer submission, SSE stream, analytics aggregation, push notification endpoints. Zod validation on all inputs.
- **What ships**: Fully functional API that MCP agents can call and frontend can consume

### Key deliverables:

1. `web/src/server/routes/workspaces.ts` (POST, GET, PATCH)
2. `web/src/server/routes/apiKeys.ts` (POST create with raw key return, GET list masked, DELETE revoke)
3. `web/src/server/routes/questions.ts` (POST create, GET by id, GET stream SSE, DELETE abandon)
4. `web/src/server/routes/answers.ts` (POST submit answer — updates question status)
5. `web/src/server/routes/analytics.ts` (GET summary with questionsPerDay, avgResponseTime, distribution)
6. `web/src/server/routes/push.ts` (GET vapid-key, POST subscribe, POST unsubscribe)
7. `web/src/shared/schemas.ts` (Zod schemas for all request/response validation)
8. API key generation utility (random 48 bytes → base58 → `auq_` prefix, SHA-256 hash)

## Phase 3: Frontend Pages — Inbox, Answer, Settings (~15min)

- **Target tasks**: Core app UI pages that enable the primary user flow
- **Dependencies**: Phase 2 (API endpoints working)
- **Scope**: App shell with sidebar navigation, Inbox page with real-time SSE question cards, Question detail page with answer form (single/multi/freetext), Settings page with API key management tab and notifications tab. API client library. All empty/loading/error states.
- **What ships**: Usable web app — user can sign in, create workspace, create API key, see incoming questions in real-time, answer them, manage keys

### Key deliverables:

1. `web/src/client/pages/AppLayout.tsx` (sidebar nav + Outlet, responsive)
2. `web/src/client/pages/Inbox.tsx` (SSE connection, question cards, filters, empty state)
3. `web/src/client/pages/QuestionDetail.tsx` (answer form: radio/checkbox/textarea, submit/reject)
4. `web/src/client/pages/Settings.tsx` (tabs: General, API Keys, Notifications)
5. `web/src/client/components/QuestionCard.tsx` (status badge, title, timestamp, actions)
6. `web/src/client/components/AnswerForm.tsx` (renders based on question type)
7. `web/src/client/components/ApiKeyTable.tsx` (list, create modal, revoke confirmation)
8. `web/src/client/components/Sidebar.tsx` (nav items, workspace switcher, user avatar)
9. `web/src/client/hooks/useSSE.ts` (EventSource wrapper with reconnect)
10. `web/src/client/hooks/useApiKey.ts` (localStorage management for selected workspace key)
11. `web/src/client/lib/api.ts` (typed fetch wrapper for all 15 endpoints)

## Phase 4: Landing Page, Analytics, PWA + Deploy (~15min)

- **Target tasks**: Marketing page, analytics dashboard, PWA setup, Vercel deployment
- **Dependencies**: Phase 3 (core app working)
- **Scope**: Landing page with hero + typewriter animation + feature cards. Analytics page with stats cards + recharts charts. PWA service worker + push notification flow. Vercel deployment config. Dark mode toggle.
- **What ships**: Complete MVP ready for production — installable PWA with push notifications, polished landing page, analytics insights

### Key deliverables:

1. `web/src/client/pages/Landing.tsx` (hero, typewriter, feature bento grid, pricing teaser, footer)
2. `web/src/client/components/TypewriterHero.tsx` (cycles through AI tool names)
3. `web/src/client/pages/Analytics.tsx` (4 stats cards + 2 recharts charts)
4. `web/src/client/components/StatsCard.tsx` (number + label + trend)
5. PWA config in `vite.config.ts` (manifest, workbox caching rules)
6. `web/src/client/hooks/usePushNotifications.ts` (subscribe/unsubscribe flow)
7. Service worker push event handler (notification display + click routing)
8. `web/src/client/pages/SignIn.tsx` + `SignUp.tsx` (Clerk components, styled)
9. Dark mode toggle (CSS class strategy, localStorage persistence)
10. `web/vercel.json` final config + deployment verification
