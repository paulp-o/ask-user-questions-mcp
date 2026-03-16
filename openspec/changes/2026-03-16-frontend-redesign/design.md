---
change_id: 2026-03-16-frontend-redesign
title: Complete Frontend Redesign — Technical Design
status: approved
created: 2026-03-16
---

# Technical Design: Complete Frontend Redesign

## Architecture

### Route Hierarchy

```
/ (public, +layout.svelte for marketing nav)
├── +page.svelte                   Landing page
├── pricing/+page.svelte           Pricing page
├── login/+page.svelte             Login (better-auth)
├── signup/+page.svelte            Signup (better-auth)
└── app/ (authenticated, +layout.server.ts guard)
    ├── +layout.svelte               App shell (sidebar nav)
    ├── +page.svelte                 Redirect to /app/inbox
    ├── inbox/+page.svelte           Question inbox + SSE
    ├── questions/[id]/+page.svelte  Question detail + answer
    ├── analytics/+page.svelte       Usage analytics
    ├── settings/+page.svelte        User settings + API keys
    └── admin/+page.svelte           Admin workspace list
```

### Component Hierarchy

```
src/lib/components/
├── ui/                         shadcn-svelte components (auto-generated)
│   ├── button/
│   ├── card/
│   ├── dialog/
│   ├── input/
│   ├── label/
│   ├── badge/
│   ├── tabs/
│   ├── separator/
│   ├── avatar/
│   ├── sheet/
│   ├── dropdown-menu/
│   └── table/
├── marketing/                  Marketing-specific components
│   ├── Hero.svelte               Typewriter animation hero
│   ├── FeaturesBento.svelte       Bento grid feature cards
│   ├── PricingTeaser.svelte       Pricing preview cards
│   ├── MarketingNav.svelte        Public site navigation
│   └── Footer.svelte              Site footer
├── app/                        App-specific components
│   ├── AppNav.svelte              Sidebar/top navigation
│   ├── QuestionCard.svelte        Question list item card
│   ├── QuestionDetail.svelte      Question detail + answer form
│   ├── StatusBadge.svelte         Pending/answered/expired badge
│   ├── AnswerForm.svelte          Form for submitting answers
│   ├── ApiKeyCard.svelte          API key display + revoke
│   ├── UsageStatsCard.svelte      Stats summary card
│   └── NotificationToggle.svelte  Push notification toggle
├── charts/                     Chart components (layerchart)
│   ├── QuestionsOverTimeChart.svelte
│   ├── ResponseTimeChart.svelte
│   └── PendingRatioChart.svelte
└── auth/                       Auth-specific components
    ├── LoginForm.svelte
    ├── SignupForm.svelte
    └── OAuthButtons.svelte
```

### Store Structure

```
src/lib/stores/
├── auth.svelte.ts              better-auth client state
├── questions.svelte.ts         Question list + SSE stream
├── theme.svelte.ts             Light/dark toggle (light default)
├── workspace.svelte.ts         Current workspace + API key state
├── notifications.svelte.ts     Push notification subscriptions
└── analytics.svelte.ts         Usage stats + chart data
```

## Key Decisions

### 1. better-auth for Authentication
**Decision**: Use `better-auth` library instead of building custom auth.
**Rationale**: battle-tested, has Drizzle adapter for SQLite, supports email/password + OAuth out of the box, integrates cleanly with SvelteKit via `svelteKitHandler`.
**Tables created**: `user`, `session`, `account`, `verification` (auto-migrated).
**Integration point**: `src/lib/server/auth.ts` exports `auth` instance; `src/hooks.server.ts` delegates all `/api/auth/**` to better-auth handler.

### 2. shadcn-svelte for UI Components
**Decision**: Use shadcn-svelte as the primary UI component library.
**Rationale**: Copy-paste architecture means full control over component code. Built on bits-ui primitives with full accessibility. Customizable via CSS variables (HSL tokens). Works perfectly with Tailwind v4.
**Customization**: Override `--primary` HSL values to amber/orange. Override `--radius` to match desired border radius.

### 3. Light Mode Default
**Decision**: Light mode is default, dark mode is optional via toggle.
**Rationale**: CEO decision. Broader appeal. Professional look for non-developer users.
**Implementation**: `theme.svelte.ts` reads from localStorage, defaults to `light`. `<html>` class toggled via $effect.

### 4. `/app/*` Route Group with Server-Side Auth Guard
**Decision**: All authenticated pages live under `/app/` with a `+layout.server.ts` that checks the better-auth session.
**Rationale**: Clean URL separation, one guard for all app pages, redirect to `/login` if unauthenticated.

### 5. layerchart for Analytics Charts
**Decision**: Use `layerchart@next` (Svelte 5 compatible build) for D3-based charts.
**Rationale**: Native Svelte 5, responsive, themeable, D3-powered with simpler API. Recommended by the Svelte community for analytics dashboards.

### 6. Marketing Pages at Root
**Decision**: Marketing pages (`/`, `/pricing`) share a `+layout.svelte` with `MarketingNav` + `Footer`.
**Rationale**: Clean separation from app layout. Different nav (links to /login, /signup, /pricing) vs app nav (sidebar, user avatar, workspace switcher).

### 7. Typewriter Hero Animation
**Decision**: Pure CSS/JS typewriter animation, no external library.
**Rationale**: Simple enough to implement in ~20 lines of Svelte $state + $effect. Cycles through: Claude Code, OpenClaw, Cursor, Windsurf, Devin, Open Code.

## Data Flow

### Authentication Flow
```
User visits /app/* (any app page)
  → +layout.server.ts calls auth.api.getSession()
  → If no session: redirect to /login?redirect=/app/...
  → If session: pass user to page via locals

Login form submits credentials
  → better-auth client signIn.email()
  → better-auth creates session cookie
  → redirect to /app/inbox (or ?redirect param)

OAuth flow
  → Click GitHub/Google button
  → better-auth redirects to OAuth provider
  → Callback to /api/auth/callback/*
  → better-auth creates account + session
  → redirect to /app/inbox
```

### Question Inbox Data Flow
```
User opens /app/inbox
  → questions.svelte.ts opens SSE connection to /api/v1/questions/stream
  → SSE sends question:created, question:answered, question:expired events
  → $state array updated reactively
  → QuestionCard components re-render via Svelte 5 reactivity
```

### Analytics Data Flow
```
User opens /app/analytics
  → analytics.svelte.ts fetches /api/v1/analytics/summary (NEW endpoint needed)
  → Response: { questionsPerDay: [...], avgResponseTime: number, pendingRatio: number }
  → layerchart components consume reactive data
```

### API Key Management Flow
```
User in /app/settings
  → workspace.svelte.ts fetches /api/v1/workspaces/[id]/keys
  → Keys listed in ApiKeyCard components
  → Create new key: POST /api/v1/workspaces/[id]/keys
  → Revoke key: DELETE /api/v1/workspaces/[id]/keys/[keyId]
```

## Migration Strategy

### Step 1: Cleanup
Delete all existing frontend files (pages, components, stores, styles) but keep all API routes and infrastructure.

### Step 2: Dependencies
```bash
# In platforms/web/
pnpm add better-auth
pnpm add layerchart@next
pnpm dlx shadcn-svelte@latest init  # interactive setup
pnpm dlx shadcn-svelte@latest add button card dialog input label badge tabs separator avatar sheet dropdown-menu table
```

### Step 3: Better-auth DB Migration
Add better-auth tables to the existing Drizzle schema file, run `drizzle-kit generate` and `drizzle-kit push` to apply.

### Step 4: Env Vars
Add to `.env.example`: `BETTER_AUTH_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.

### Step 5: Foundation
Set up new `app.css` with Tailwind v4 + @theme tokens for shadcn HSL variables. New `app.html` with light theme default. Root `+layout.svelte` for marketing. Marketing nav component.

### Step 6: Incremental Page Build
Auth pages → Marketing pages → App shell → App pages. Each page independently testable.

### Step 7: Analytics Endpoint
Add a single new analytics endpoint `GET /api/v1/analytics/summary` that queries existing `questions` and `answers` tables. This is the only new backend work.

### Step 8: Tests
Rewrite store tests to match new runes-mode store APIs. Add component snapshot tests for key components.

## Analytics Endpoint Design

```typescript
// GET /api/v1/analytics/summary
// Response schema:
{
  questionsPerDay: Array<{ date: string; count: number }>,  // last 30 days
  avgResponseTimeMs: number,                                // avg ms from created to answered
  pendingCount: number,
  answeredCount: number,
  totalCount: number,
  pendingRatio: number                                      // 0-1
}
```

## Design Token Reference

```css
/* Tailwind v4 @theme tokens (in app.css) */
@theme {
  /* shadcn-svelte HSL variables */
  --color-background: hsl(0 0% 100%);           /* light white */
  --color-foreground: hsl(222 47% 11%);         /* near-black */
  --color-primary: hsl(38 92% 50%);             /* amber-500 */
  --color-primary-foreground: hsl(0 0% 100%);
  --color-secondary: hsl(210 40% 96%);          /* slate-100 */
  --color-muted: hsl(210 40% 96%);
  --color-muted-foreground: hsl(215 16% 47%);   /* slate-500 */
  --color-border: hsl(214 32% 91%);             /* slate-200 */
  --color-card: hsl(0 0% 100%);
  --color-card-foreground: hsl(222 47% 11%);
  --radius: 0.5rem;

  /* Typography */
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}

/* Dark mode overrides */
.dark {
  --color-background: hsl(222 47% 6%);
  --color-foreground: hsl(210 40% 98%);
  --color-primary: hsl(38 92% 50%);
  --color-card: hsl(222 47% 9%);
  --color-border: hsl(217 33% 17%);
  --color-muted: hsl(217 33% 12%);
  --color-muted-foreground: hsl(215 20% 65%);
}
```

## TypeWriter Animation Design

```svelte
<!-- Hero.svelte — key logic --><script>
  const tools = ['Claude Code', 'OpenClaw', 'Cursor', 'Windsurf', 'Devin', 'Open Code'];
  let toolIndex = $state(0);
  let displayText = $state('');
  let isDeleting = $state(false);

  $effect(() => {
    const target = tools[toolIndex];
    const timeout = isDeleting ? 60 : 120;
    const timer = setTimeout(() => {
      if (!isDeleting && displayText === target) {
        setTimeout(() => { isDeleting = true; }, 2000);
      } else if (isDeleting && displayText === '') {
        isDeleting = false;
        toolIndex = (toolIndex + 1) % tools.length;
      } else {
        displayText = isDeleting
          ? target.slice(0, displayText.length - 1)
          : target.slice(0, displayText.length + 1);
      }
    }, timeout);
    return () => clearTimeout(timer);
  });
</script>
```