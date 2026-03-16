---
change_id: 2026-03-16-frontend-redesign
title: Complete Frontend Redesign — Tasks
status: done
created: 2026-03-16
---

# Tasks: Complete Frontend Redesign

## Phase 1: Cleanup — Delete Old Frontend Files

- [x] Delete `platforms/web/src/routes/+page.svelte` (old inbox page)
- [x] Delete `platforms/web/src/routes/+layout.svelte` (old root layout)
- [x] Delete `platforms/web/src/routes/+page.ts` (old page load function)
- [x] Delete `platforms/web/src/routes/setup/+page.svelte` (old setup page)
- [x] Delete `platforms/web/src/routes/questions/[id]/+page.svelte` (old question detail)
- [x] Delete `platforms/web/src/routes/questions/[id]/+page.ts` (old question detail loader)
- [x] Delete `platforms/web/src/routes/settings/+page.svelte` (old settings page)
- [x] Delete `platforms/web/src/routes/admin/+page.svelte` (old admin page)
- [x] Delete `platforms/web/src/lib/components/QuestionCard.svelte`
- [x] Delete `platforms/web/src/lib/components/OptionCard.svelte`
- [x] Delete `platforms/web/src/lib/components/StatusBadge.svelte`
- [x] Delete `platforms/web/src/lib/components/ThemeToggle.svelte`
- [x] Delete `platforms/web/src/lib/components/LoadingSkeleton.svelte`
- [x] Delete `platforms/web/src/lib/stores/theme.svelte.ts`
- [x] Delete `platforms/web/src/lib/stores/questions.svelte.ts`
- [x] Delete `platforms/web/src/lib/stores/workspace.svelte.ts`
- [x] Delete `platforms/web/src/lib/stores/notifications.svelte.ts`
- [x] Delete `platforms/web/src/lib/stores/__tests__/theme.test.ts`
- [x] Delete `platforms/web/src/lib/stores/__tests__/questions.test.ts`
- [x] Delete `platforms/web/src/lib/stores/__tests__/workspace.test.ts`
- [x] Delete `platforms/web/src/app.css` (will be replaced)
- [x] Delete `platforms/web/static/manifest.json` (will be replaced)

## Phase 2: Dependencies Installation

- [x] Install `better-auth` in `platforms/web/` (`pnpm add better-auth`)
- [x] Install `layerchart@next` in `platforms/web/` (`pnpm add layerchart@next`)
- [x] Install `d3` peer dependency if required by layerchart (`pnpm add d3`)
- [x] Run `pnpm dlx shadcn-svelte@latest init` in `platforms/web/` (interactive — choose default style, amber primary)
- [x] Add shadcn component: `button` (`pnpm dlx shadcn-svelte@latest add button`)
- [x] Add shadcn component: `card` (`pnpm dlx shadcn-svelte@latest add card`)
- [x] Add shadcn component: `input` (`pnpm dlx shadcn-svelte@latest add input`)
- [x] Add shadcn component: `label` (`pnpm dlx shadcn-svelte@latest add label`)
- [x] Add shadcn component: `badge` (`pnpm dlx shadcn-svelte@latest add badge`)
- [x] Add shadcn component: `tabs` (`pnpm dlx shadcn-svelte@latest add tabs`)
- [x] Add shadcn component: `dialog` (`pnpm dlx shadcn-svelte@latest add dialog`)
- [x] Add shadcn component: `separator` (`pnpm dlx shadcn-svelte@latest add separator`)
- [x] Add shadcn component: `avatar` (`pnpm dlx shadcn-svelte@latest add avatar`)
- [x] Add shadcn component: `sheet` (`pnpm dlx shadcn-svelte@latest add sheet`)
- [x] Add shadcn component: `dropdown-menu` (`pnpm dlx shadcn-svelte@latest add dropdown-menu`)
- [x] Add shadcn component: `table` (`pnpm dlx shadcn-svelte@latest add table`)
- [x] Add shadcn component: `tooltip` (`pnpm dlx shadcn-svelte@latest add tooltip`)
- [x] Add shadcn component: `switch` (`pnpm dlx shadcn-svelte@latest add switch`)
- [x] Add shadcn component: `skeleton` (`pnpm dlx shadcn-svelte@latest add skeleton`)

## Phase 3: Foundation — Theme, Styles, App Shell

- [x] Create `platforms/web/src/app.css` — Tailwind v4 with `@import "tailwindcss"`, `@theme` design tokens (amber primary, slate grays, Inter + JetBrains Mono), shadcn HSL CSS variables, `.dark` overrides
- [x] Update `platforms/web/src/app.html` — add Inter + JetBrains Mono Google Fonts links, PWA meta tags, `class="light"` default on `<html>`
- [x] Update `platforms/web/static/manifest.json` — updated name, colors (amber `#f59e0b`), icon paths
- [x] Create `platforms/web/src/lib/utils.ts` — shadcn `cn()` utility (clsx + tailwind-merge), if not auto-created by shadcn init
- [x] Create `platforms/web/src/lib/stores/theme.svelte.ts` — light/dark/system toggle, defaults to `light`, persists to localStorage, toggles `<html>` class via $effect

## Phase 4: Better-Auth Setup

- [x] Create `platforms/web/src/lib/server/auth.ts` — better-auth `auth` instance with Drizzle adapter, email/password provider, GitHub OAuth, Google OAuth, session configuration
- [x] Update `platforms/web/src/lib/db/schema.ts` — add better-auth required tables: `user`, `session`, `account`, `verification` (using better-auth schema helpers or manual Drizzle table definitions)
- [x] Run `drizzle-kit generate` to create migration for better-auth tables (file: `platforms/web/drizzle/`)
- [x] Create `platforms/web/src/lib/server/auth-client.ts` — browser-side `createAuthClient` from `better-auth/svelte`
- [x] Update `platforms/web/src/hooks.server.ts` — delegate `/api/auth/**` requests to better-auth `svelteKitHandler`, keep existing CORS + logging hooks
- [x] Update `platforms/web/.env.example` — add `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- [x] Create `platforms/web/src/routes/app/+layout.server.ts` — auth guard that calls `auth.api.getSession()`, redirects to `/login?redirect=...` if no session, passes user to layout data
- [x] Create `platforms/web/src/routes/app/+layout.svelte` — app shell layout with sidebar navigation, user avatar dropdown, workspace name, mobile responsive (sheet for mobile nav)

## Phase 5: Auth Pages

- [x] Create `platforms/web/src/lib/components/auth/OAuthButtons.svelte` — GitHub + Google sign-in buttons using shadcn Button, calls better-auth client `signIn.social()`
- [x] Create `platforms/web/src/lib/components/auth/LoginForm.svelte` — email + password form using shadcn Input/Label/Button, calls `signIn.email()`, handles errors
- [x] Create `platforms/web/src/lib/components/auth/SignupForm.svelte` — name + email + password form, calls `signUp.email()`, handles validation errors
- [x] Create `platforms/web/src/routes/login/+page.svelte` — login page with LoginForm + OAuthButtons, link to /signup, clean centered card layout
- [x] Create `platforms/web/src/routes/signup/+page.svelte` — signup page with SignupForm + OAuthButtons, link to /login
- [x] Create `platforms/web/src/lib/stores/auth.svelte.ts` — auth state store wrapping better-auth client, exposes `user`, `session`, `isLoading`, `signOut()` action

## Phase 6: Analytics Backend Endpoint

- [x] Create `platforms/web/src/routes/api/v1/analytics/+server.ts` — `GET` handler: authenticates via API key, queries `questions` + `answers` tables, returns `{ questionsPerDay, avgResponseTimeMs, pendingCount, answeredCount, totalCount, pendingRatio }` for the authenticated workspace
- [x] Create `platforms/web/src/routes/api/v1/analytics/__tests__/get.test.ts` — unit tests for analytics endpoint (mock db, verify aggregation logic)

## Phase 7: Marketing Pages

- [x] Create `platforms/web/src/lib/components/marketing/MarketingNav.svelte` — top nav bar with AUQ logo, links (Pricing, Docs, GitHub), CTA buttons (Log in, Get started)
- [x] Create `platforms/web/src/lib/components/marketing/Footer.svelte` — site footer with links (GitHub, Docs, Privacy, Terms), copyright
- [x] Create `platforms/web/src/routes/+layout.svelte` — marketing layout wrapping all public pages, includes MarketingNav + Footer
- [x] Create `platforms/web/src/lib/components/marketing/Hero.svelte` — hero section with `"Keep your hand on the wheel"` headline, typewriter subtitle cycling through AI tool names (Claude Code, OpenClaw, Cursor, Windsurf, Devin, Open Code), amber CTA button, subtle CSS grid background
- [x] Create `platforms/web/src/lib/components/marketing/FeaturesBento.svelte` — bento grid of 4-6 feature cards (Real-time notifications, Answer from anywhere, MCP native, Works with all AI tools, Analytics, Secure API keys), CSS gradient card backgrounds
- [x] Create `platforms/web/src/lib/components/marketing/PricingTeaser.svelte` — abbreviated pricing section for landing page (Free vs Pro card preview, link to /pricing)
- [x] Create `platforms/web/src/routes/+page.svelte` — landing page composing Hero + FeaturesBento + PricingTeaser + Footer CTA
- [x] Create `platforms/web/src/routes/pricing/+page.svelte` — full pricing page: Free tier card (100 questions/month, basic analytics, 1 workspace) vs Pro tier card (unlimited, full analytics, team features, priority support), feature comparison table, FAQ accordion

## Phase 8: App Stores (Rewrite)

- [x] Create `platforms/web/src/lib/stores/workspace.svelte.ts` — workspace state (workspaceId, workspaceName, apiKey), persists to localStorage, methods: `loadWorkspace()`, `setApiKey()`, `clearWorkspace()`
- [x] Create `platforms/web/src/lib/stores/questions.svelte.ts` — question list state with SSE connection to `/api/v1/questions/stream`, $state array of questions, methods: `connect()`, `disconnect()`, `submitAnswer()`, `deleteQuestion()`
- [x] Create `platforms/web/src/lib/stores/notifications.svelte.ts` — push notification state, Web Push subscription via VAPID, methods: `subscribe()`, `unsubscribe()`, `isSupported`, `isSubscribed`
- [x] Create `platforms/web/src/lib/stores/analytics.svelte.ts` — analytics data store, fetches from `/api/v1/analytics`, $state for `questionsPerDay`, `avgResponseTimeMs`, `pendingRatio`, methods: `load()`

## Phase 9: App Components

- [x] Create `platforms/web/src/lib/components/app/AppNav.svelte` — app sidebar navigation (desktop: full sidebar, mobile: sheet), links: Inbox, Analytics, Settings; user avatar dropdown with sign out
- [x] Create `platforms/web/src/lib/components/app/QuestionCard.svelte` — question list item using shadcn Card, shows title, type badge, age/elapsed time, status badge, click navigates to detail
- [x] Create `platforms/web/src/lib/components/app/StatusBadge.svelte` — pending (amber), answered (green), expired (gray) badge using shadcn Badge
- [x] Create `platforms/web/src/lib/components/app/AnswerForm.svelte` — smart answer form: renders text input, select dropdown, or checkbox list based on question type from `@paulp-o/auq-shared` schema
- [x] Create `platforms/web/src/lib/components/app/ApiKeyCard.svelte` — API key display with masked key, copy-to-clipboard button, revoke button with confirmation dialog
- [x] Create `platforms/web/src/lib/components/app/UsageStatsCard.svelte` — summary stats card showing total questions this month, pending count, avg response time
- [x] Create `platforms/web/src/lib/components/app/NotificationToggle.svelte` — push notification toggle using shadcn Switch, handles permission request flow

## Phase 10: Chart Components

- [x] Create `platforms/web/src/lib/components/charts/QuestionsOverTimeChart.svelte` — layerchart bar/area chart showing questions per day over last 30 days, amber fill color, responsive
- [x] Create `platforms/web/src/lib/components/charts/ResponseTimeChart.svelte` — layerchart chart showing avg response time trend, tooltip on hover
- [x] Create `platforms/web/src/lib/components/charts/PendingRatioChart.svelte` — layerchart donut/pie chart showing pending vs answered ratio

## Phase 11: App Pages

- [x] Create `platforms/web/src/routes/app/+page.svelte` — redirect to `/app/inbox`
- [x] Create `platforms/web/src/routes/app/inbox/+page.svelte` — question inbox page: SSE-connected live list of questions, empty state (no pending questions illustration), filter tabs (All / Pending / Answered), uses QuestionCard + StatusBadge
- [x] Create `platforms/web/src/routes/app/inbox/+page.ts` — client-side load function, initializes SSE connection on mount
- [x] Create `platforms/web/src/routes/app/questions/[id]/+page.svelte` — question detail page: question title, description, metadata (created time, elapsed), AnswerForm, back to inbox link
- [x] Create `platforms/web/src/routes/app/questions/[id]/+page.ts` — client load function, fetches question from `/api/v1/questions/[id]`
- [x] Create `platforms/web/src/routes/app/analytics/+page.svelte` — analytics dashboard: UsageStatsCard row, QuestionsOverTimeChart, ResponseTimeChart, PendingRatioChart, last updated time
- [x] Create `platforms/web/src/routes/app/settings/+page.svelte` — settings page with tabs (General, API Keys, Notifications): theme toggle, API key management (list + create + revoke), push notification toggle, account info
- [x] Create `platforms/web/src/routes/app/admin/+page.svelte` — redesigned admin page: workspace list in shadcn Table, question counts per workspace, total API keys, uses +page.server.ts data

## Phase 12: PWA Update

- [x] Update `platforms/web/src/service-worker.ts` — update cache names, ensure `/app/*` routes are not cached (auth-sensitive), update push notification handler, precache marketing pages
- [x] Update `platforms/web/static/manifest.json` — new `name`, `short_name`, `theme_color: #f59e0b` (amber), `background_color`, icons, `start_url: /app/inbox`, `scope: /`

## Phase 13: Tests

- [x] Create `platforms/web/src/lib/stores/__tests__/theme.test.ts` — test light/dark toggle, localStorage persistence, $effect class toggling
- [x] Create `platforms/web/src/lib/stores/__tests__/workspace.test.ts` — test workspace state, API key storage, localStorage read/write
- [x] Create `platforms/web/src/lib/stores/__tests__/questions.test.ts` — test question list state updates, SSE event handling mock, submitAnswer action
- [x] Create `platforms/web/src/lib/stores/__tests__/analytics.test.ts` — test analytics data loading, error handling, data shape validation
- [x] Create `platforms/web/src/lib/stores/__tests__/auth.test.ts` — test auth store state, signOut action, loading state
- [x] Create `platforms/web/src/routes/api/v1/analytics/__tests__/get.test.ts` — analytics endpoint unit test (already listed in Phase 6, verify exists)
- [x] Run full test suite and verify all pre-existing API/DB tests still pass (`pnpm test` in `platforms/web/`)
- [x] Verify TypeScript compilation passes (`pnpm check` in `platforms/web/`)
- [x] Verify build succeeds (`pnpm build` in `platforms/web/`)

## Phase 14: Documentation

- [x] Update `platforms/web/README.md` — update route listing, add better-auth setup instructions, update env vars table, add analytics endpoint docs
- [x] Update `platforms/web/static/openapi.yaml` — add `/api/v1/analytics` endpoint schema
- [x] Update `platforms/web/.env.example` — ensure all new better-auth env vars are documented with comments