---
created: 2026-03-16T20:30:00Z
last_updated: 2026-03-16T21:00:00Z
type: spec
change_id: 2026-03-16-frontend-redesign
plan_number: 3
status: done
trigger: "Phase 3: All UI — marketing pages, app stores, analytics endpoint, app components, charts, app pages, PWA"
depends_on: "002_auth-full-stack.md"
next: "004_verification.md"
---

# Plan: All UI — Marketing + App Stores + Components + Pages + PWA

## Background & Research

### Existing App Shell (platforms/web/src/routes/app/+layout.svelte)

Already built in Phase 2 — sidebar with Inbox/Analytics/Settings nav, user dropdown, mobile hamburger sheet:

```svelte
<script lang="ts">
  import { page } from '$app/stores';
  import { Inbox, BarChart3, Settings, Menu, LogOut } from '@lucide/svelte';
  import { Button } from '$lib/components/ui/button';
  import { Avatar, AvatarFallback } from '$lib/components/ui/avatar';
  import { Separator } from '$lib/components/ui/separator';
  import { Sheet, SheetContent, SheetTrigger } from '$lib/components/ui/sheet';
  import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '$lib/components/ui/dropdown-menu';
  import { authStore } from '$lib/stores/auth.svelte';
  import type { LayoutData } from './$types';

  let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

  const navLinks = [
    { href: '/app/inbox', label: 'Inbox', icon: Inbox },
    { href: '/app/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/app/settings', label: 'Settings', icon: Settings },
  ];
  // ... getInitials, isActive helpers, full sidebar + mobile sheet layout
</script>
```

### Root Layout (platforms/web/src/routes/+layout.svelte)

Currently minimal — just imports app.css and renders children. Marketing layout needs to REPLACE this with conditional layout (marketing nav + footer for non-app pages):

```svelte
<script lang="ts">
  import "../app.css";
  let { children } = $props();
</script>
{@render children()}
```

### Auth Guard (platforms/web/src/routes/app/+layout.server.ts)

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

### Auth Store (platforms/web/src/lib/stores/auth.svelte.ts)

Svelte 5 runes pattern — `createAuthStore()` returns getter-based reactive object:

```ts
function createAuthStore() {
  let user = $state<User | null>(null);
  let session = $state<Session | null>(null);
  let isLoading = $state<boolean>(true);
  let error = $state<unknown>(null);
  const isAuthenticated = $derived(user !== null);
  // refresh(), signOut(), clearSession() methods
  return {
    get user() {
      return user;
    },
    get isAuthenticated() {
      return isAuthenticated;
    },
    // ...
  };
}
export const authStore = createAuthStore();
```

### Theme Store (platforms/web/src/lib/stores/theme.svelte.ts)

```ts
function createThemeStore() {
  let theme = $state<Theme>("light");
  // localStorage read on init, $effect for DOM class toggle
  return {
    get current() {
      return theme;
    },
    get isDark() {
      return theme === "dark";
    },
    toggle() {
      theme = theme === "light" ? "dark" : "light";
    },
    set(value: Theme) {
      theme = value;
    },
  };
}
export const themeStore = createThemeStore();
```

### Auth Client (platforms/web/src/lib/auth-client.ts)

```ts
import { createAuthClient } from "better-auth/svelte";
export const authClient = createAuthClient({
  baseURL:
    typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:3000",
});
```

### DB Schema — tables relevant to analytics (platforms/web/src/lib/db/schema.ts)

```ts
export const questions = sqliteTable("questions", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id),
  status: text("status").notNull(), // 'pending' | 'in_progress' | 'completed' | 'rejected' | 'timed_out' | 'abandoned'
  title: text("title"),
  questionsJson: text("questions_json").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const answers = sqliteTable("answers", {
  id: text("id").primaryKey(),
  questionId: text("question_id")
    .notNull()
    .references(() => questions.id),
  questionIndex: integer("question_index").notNull(),
  selectedOption: text("selected_option"),
  selectedOptionsJson: text("selected_options_json"),
  customText: text("custom_text"),
  answeredAt: integer("answered_at", { mode: "timestamp" }).notNull(),
});
```

### API Pattern — authenticate via API key, use db directly (e.g. workspaces/+server.ts)

```ts
import { apiError, unauthorizedError } from "$lib/api/errors";
import { authenticateApiKey, isExpiredKeyAuthResult } from "$lib/api/auth";
import { db } from "$lib/db";
import { questions, answers } from "$lib/db/schema";
import { json, type RequestHandler } from "@sveltejs/kit";

export const GET: RequestHandler = async ({ request }) => {
  const authResult = await authenticateApiKey(request, db);
  if (isExpiredKeyAuthResult(authResult)) return expiredKeyError();
  if (!authResult) return unauthorizedError();
  // query db, return json(...)
};
```

### SSE Stream Pattern (platforms/web/src/routes/api/v1/questions/stream/+server.ts)

The existing SSE endpoint uses `ReadableStream` with polling. Client should use `EventSource` with `workspaceId` query param:

```ts
// Server: polls every 2s, sends `data: { type: 'questions', data: [...] }\n\n`
const stream = new ReadableStream<Uint8Array>({
  start(controller) {
    const encoder = new TextEncoder();
    // poll db every POLL_INTERVAL_MS, send changed rows
    // keepalive every KEEPALIVE_INTERVAL_MS with `:\n\n`
  },
});
return new Response(stream, {
  headers: {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  },
});
```

### Design Tokens (app.css)

Full amber theme already configured with `:root` and `.dark` CSS custom properties. Key colors:

- `--primary: hsl(38 92% 50%)` (amber-500)
- `--background: hsl(0 0% 100%)` (light) / `hsl(222 47% 6%)` (dark)
- `--foreground: hsl(222 47% 11%)` (light) / `hsl(210 40% 98%)` (dark)
- `--muted-foreground: hsl(215 16% 47%)`
- Fonts: `--font-sans: 'Inter'`, `--font-mono: 'JetBrains Mono'`

### Shadcn-svelte Components Available

button, card, input, label, badge, tabs, separator, avatar, sheet, dropdown-menu, table, dialog, switch, skeleton, tooltip

### Typewriter Animation (from design.md)

```svelte
<script>
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

### Analytics Endpoint Response Schema (from design.md)

```ts
// GET /api/v1/analytics
{
  questionsPerDay: Array<{ date: string; count: number }>,  // last 30 days
  avgResponseTimeMs: number,
  pendingCount: number,
  answeredCount: number,
  totalCount: number,
  pendingRatio: number  // 0-1
}
```

### layerchart@next Usage Patterns

```svelte
<!-- Line/Area chart -->
<script lang="ts">
  import { Chart, Svg, Axis, Line, Area } from 'layerchart';
  import { scaleTime, scaleLinear } from 'd3-scale';
</script>
<div class="h-[300px]">
  <Chart {data} x="date" xScale={scaleTime()} y="count" yScale={scaleLinear()} yNice padding={{ top: 20, right: 20, bottom: 40, left: 50 }}>
    <Svg>
      <Axis placement="bottom" />
      <Axis placement="left" />
      <Area fill="hsl(38 92% 50%)" fillOpacity={0.15} />
      <Line stroke="hsl(38 92% 50%)" strokeWidth={2} />
    </Svg>
  </Chart>
</div>

<!-- Bar chart -->
<script lang="ts">
  import { BarChart } from 'layerchart';
  import { scaleBand, scaleLinear } from 'd3-scale';
</script>
<div class="h-[300px]">
  <BarChart {data} x="category" y="count" bandPadding={0.3} axis={{ x: true, y: true }} />
</div>
```

### Features List (for FeaturesBento component, from design.md)

1. **Real-time notifications** — Get notified instantly when AI needs your input
2. **Answer from anywhere** — Respond from phone, tablet, or desktop
3. **MCP native** — Built on the Model Context Protocol standard
4. **Works with all AI tools** — Claude Code, Cursor, Windsurf, and more
5. **Analytics** — Track response times and question patterns
6. **Secure API keys** — Per-workspace keys with rotation and expiry

### Pricing Tiers (from design.md)

- **Free**: 100 questions/month, basic analytics, 1 workspace
- **Pro**: Unlimited questions, full analytics, team features, priority support

### Existing API Routes (DO NOT touch)

```
platforms/web/src/routes/api/v1/
├── push/subscribe/+server.ts
├── push/unsubscribe/+server.ts
├── push/vapid-key/+server.ts
├── questions/+server.ts (POST)
├── questions/[id]/+server.ts (GET, PUT, DELETE)
├── questions/[id]/answer/+server.ts (POST)
├── questions/stream/+server.ts (GET — SSE)
├── workspaces/+server.ts (POST)
└── workspaces/[id]/keys/+server.ts & [keyId]/+server.ts
```

---

## Testing Plan (TDD — tests first)

- [ ] Create `platforms/web/src/lib/stores/__tests__/workspace.svelte.test.ts` — test workspace store: loadWorkspace sets state, setApiKey persists, clearWorkspace resets
- [ ] Create `platforms/web/src/lib/stores/__tests__/questions.svelte.test.ts` — test questions store: connect creates EventSource mock, disconnect closes it, submitAnswer calls fetch, deleteQuestion calls fetch
- [ ] Create `platforms/web/src/lib/stores/__tests__/notifications.svelte.test.ts` — test notifications store: isSupported checks navigator, subscribe/unsubscribe call push API
- [ ] Create `platforms/web/src/lib/stores/__tests__/analytics.svelte.test.ts` — test analytics store: load fetches /api/v1/analytics, sets state correctly, handles errors

## Implementation Plan

### Marketing Components

- [ ] Create `platforms/web/src/lib/components/marketing/MarketingNav.svelte` — sticky top nav: AUQ logo (amber), links (Pricing, GitHub), CTAs (Log in → `/login`, Get started → `/signup`), mobile hamburger
- [ ] Create `platforms/web/src/lib/components/marketing/Footer.svelte` — minimal footer: links (GitHub, Docs, Privacy, Terms), copyright "© 2026 AUQ"
- [ ] Create `platforms/web/src/lib/components/marketing/Hero.svelte` — "Keep your hand on the wheel" headline, typewriter subtitle with tool names, amber CTA button "Get Started Free →", subtle CSS grid/dot background pattern
- [ ] Create `platforms/web/src/lib/components/marketing/FeaturesBento.svelte` — 2×3 bento grid using Card components, each with lucide icon + title + description, CSS gradient subtle backgrounds
- [ ] Create `platforms/web/src/lib/components/marketing/PricingTeaser.svelte` — side-by-side Free vs Pro cards with shadcn Card, "View full comparison →" link to /pricing

### Marketing Pages

- [ ] Update `platforms/web/src/routes/+layout.svelte` — add MarketingNav + Footer for non-app routes (check `$page.url.pathname.startsWith('/app')` to conditionally show)
- [ ] Create `platforms/web/src/routes/+page.svelte` — landing page composing Hero + FeaturesBento + PricingTeaser sections with spacious vertical rhythm
- [ ] Create `platforms/web/src/routes/pricing/+page.svelte` — full pricing page: Free vs Pro detail cards, feature comparison table (shadcn Table), FAQ section with details/summary accordion

### App Stores

- [ ] Create `platforms/web/src/lib/stores/workspace.svelte.ts` — Svelte 5 rune store: $state for workspaceId, workspaceName, apiKeys array; loadWorkspace(id) fetches from API; setApiKey/revokeKey methods; localStorage persistence for workspaceId
- [ ] Create `platforms/web/src/lib/stores/questions.svelte.ts` — Svelte 5 rune store: $state array of questions; connect(workspaceId) opens EventSource to /api/v1/questions/stream?workspaceId=X; parses SSE data; disconnect() closes; submitAnswer(questionId, answers) POSTs to /api/v1/questions/[id]/answer; deleteQuestion(id) DELETEs
- [ ] Create `platforms/web/src/lib/stores/notifications.svelte.ts` — Svelte 5 rune store: $state for isSubscribed, isSupported; subscribe() requests permission + POSTs to /api/v1/push/subscribe; unsubscribe() POSTs to /api/v1/push/unsubscribe; checks `'PushManager' in window`
- [ ] Create `platforms/web/src/lib/stores/analytics.svelte.ts` — Svelte 5 rune store: $state for questionsPerDay[], avgResponseTimeMs, pendingCount, answeredCount, totalCount, pendingRatio, isLoading; load(apiKey) fetches GET /api/v1/analytics with Bearer token

### Analytics Endpoint

- [ ] Create `platforms/web/src/routes/api/v1/analytics/+server.ts` — GET handler: authenticateApiKey, query questions table (count by date last 30 days, count by status), query answers table (avg response time = avg(answeredAt - question.createdAt)), return JSON matching schema above

### App Components

- [ ] Create `platforms/web/src/lib/components/app/QuestionCard.svelte` — shadcn Card: title, type badge (Badge), elapsed time, StatusBadge, click → navigate to /app/questions/[id]
- [ ] Create `platforms/web/src/lib/components/app/StatusBadge.svelte` — Badge with variant: pending=amber, completed=green, timed_out/abandoned=gray, in_progress=blue
- [ ] Create `platforms/web/src/lib/components/app/AnswerForm.svelte` — renders Input (text), Select (single choice), or checkbox list (multi) based on question type from questionsJson; submit button calls questions store submitAnswer
- [ ] Create `platforms/web/src/lib/components/app/ApiKeyCard.svelte` — Card showing masked key (auq\_\*\*\*\*xxxx), copy button, revoke button with Dialog confirmation
- [ ] Create `platforms/web/src/lib/components/app/UsageStatsCard.svelte` — 3-column stat row: Total Questions, Pending, Avg Response Time; each in a mini Card
- [ ] Create `platforms/web/src/lib/components/app/NotificationToggle.svelte` — Switch component with label, handles permission request flow, uses notifications store

### Chart Components

- [ ] Create `platforms/web/src/lib/components/charts/QuestionsOverTimeChart.svelte` — layerchart Area+Line chart, x=date y=count, amber fill, last 30 days, responsive container
- [ ] Create `platforms/web/src/lib/components/charts/ResponseTimeChart.svelte` — layerchart BarChart, categories of response time buckets, amber bars
- [ ] Create `platforms/web/src/lib/components/charts/PendingRatioChart.svelte` — simple stat display (not a donut — keep it clean): large percentage number + progress bar showing pending/total ratio, amber fill

### App Pages

- [ ] Update `platforms/web/src/routes/app/+page.svelte` — redirect to /app/inbox using `goto('/app/inbox')` in `onMount`
- [ ] Create `platforms/web/src/routes/app/inbox/+page.svelte` — SSE-connected question list: filter tabs (All/Pending/Answered) using Tabs, QuestionCard list, empty state with icon + "No questions yet" message; connects to questions store on mount, disconnects on unmount via $effect
- [ ] Create `platforms/web/src/routes/app/questions/[id]/+page.svelte` — question detail: back link, title, metadata (created, elapsed), question items rendered, AnswerForm; fetches question on mount via API
- [ ] Create `platforms/web/src/routes/app/questions/[id]/+page.ts` — load function: fetch `/api/v1/questions/[id]` client-side
- [ ] Create `platforms/web/src/routes/app/analytics/+page.svelte` — dashboard: UsageStatsCard at top, QuestionsOverTimeChart, ResponseTimeChart, PendingRatioChart grid; loads analytics store on mount
- [ ] Create `platforms/web/src/routes/app/settings/+page.svelte` — Tabs: General (theme toggle using themeStore), API Keys (list ApiKeyCards + create new key dialog), Notifications (NotificationToggle)
- [ ] Create `platforms/web/src/routes/app/admin/+page.svelte` — workspace list in shadcn Table with columns: name, question count, key count, created date

### PWA

- [ ] Create `platforms/web/src/service-worker.ts` — SvelteKit service worker: precache marketing routes, skip /app/\* (auth-sensitive), handle push notification events (show notification, click opens /app/questions/[id])

---

## Parallelization Plan

### Batch 1 (6 coders in parallel — no file conflicts)

- [ ] **Coder A: App Stores** → files: `platforms/web/src/lib/stores/workspace.svelte.ts`, `platforms/web/src/lib/stores/questions.svelte.ts`, `platforms/web/src/lib/stores/notifications.svelte.ts`, `platforms/web/src/lib/stores/analytics.svelte.ts`, `platforms/web/src/lib/stores/__tests__/workspace.svelte.test.ts`, `platforms/web/src/lib/stores/__tests__/questions.svelte.test.ts`, `platforms/web/src/lib/stores/__tests__/notifications.svelte.test.ts`, `platforms/web/src/lib/stores/__tests__/analytics.svelte.test.ts`

- [ ] **Coder B: Analytics Endpoint** → files: `platforms/web/src/routes/api/v1/analytics/+server.ts`

- [ ] **Coder C: Marketing Components** → files: `platforms/web/src/lib/components/marketing/MarketingNav.svelte`, `platforms/web/src/lib/components/marketing/Footer.svelte`, `platforms/web/src/lib/components/marketing/Hero.svelte`, `platforms/web/src/lib/components/marketing/FeaturesBento.svelte`, `platforms/web/src/lib/components/marketing/PricingTeaser.svelte`

- [ ] **Coder D: App Components (Cards + Badges)** → files: `platforms/web/src/lib/components/app/QuestionCard.svelte`, `platforms/web/src/lib/components/app/StatusBadge.svelte`, `platforms/web/src/lib/components/app/ApiKeyCard.svelte`, `platforms/web/src/lib/components/app/UsageStatsCard.svelte`, `platforms/web/src/lib/components/app/NotificationToggle.svelte`

- [ ] **Coder E: AnswerForm + Chart Components** → files: `platforms/web/src/lib/components/app/AnswerForm.svelte`, `platforms/web/src/lib/components/charts/QuestionsOverTimeChart.svelte`, `platforms/web/src/lib/components/charts/ResponseTimeChart.svelte`, `platforms/web/src/lib/components/charts/PendingRatioChart.svelte`

- [ ] **Coder F: Root Layout + Marketing Pages + PWA** → files: `platforms/web/src/routes/+layout.svelte`, `platforms/web/src/routes/+page.svelte`, `platforms/web/src/routes/pricing/+page.svelte`, `platforms/web/src/service-worker.ts`

### Batch 2 (3 coders — after Batch 1, depends on stores + components)

- [ ] **Coder G: Inbox + Questions Detail** → files: `platforms/web/src/routes/app/+page.svelte`, `platforms/web/src/routes/app/inbox/+page.svelte`, `platforms/web/src/routes/app/questions/[id]/+page.svelte`, `platforms/web/src/routes/app/questions/[id]/+page.ts`

- [ ] **Coder H: Analytics + Admin Pages** → files: `platforms/web/src/routes/app/analytics/+page.svelte`, `platforms/web/src/routes/app/admin/+page.svelte`

- [ ] **Coder I: Settings Page** → files: `platforms/web/src/routes/app/settings/+page.svelte`

### Dependencies

- **Batch 1** has zero cross-dependencies — all 6 coders work on completely separate file sets
- **Batch 2** depends on Batch 1 because:
  - Coder G needs questions store + QuestionCard + AnswerForm + StatusBadge
  - Coder H needs analytics store + chart components + UsageStatsCard
  - Coder I needs themeStore + ApiKeyCard + NotificationToggle
- Root layout (Coder F) must import marketing components from Coder C — but since Coder F creates both the layout AND the pages that use the components, this is self-contained

### Risk Areas

- **layerchart imports**: If `layerchart@next` API differs from research, chart components may need adjustment — isolate chart logic in dedicated components so fixes are contained
- **Root layout change**: Coder F modifies the root +layout.svelte which wraps ALL pages — must ensure it doesn't break /app/\* routes (conditional rendering based on pathname)
- **SSE client in questions store**: EventSource reconnection logic must handle auth token — the existing SSE endpoint uses workspaceId query param, not Bearer token; store must know workspaceId from workspace store
- **Service worker**: SvelteKit has specific service worker conventions (`src/service-worker.ts` with `$service-worker` module) — coder must follow SvelteKit pattern

---

## Done Criteria

- [ ] All 4 store unit tests pass (workspace, questions, notifications, analytics)
- [ ] Analytics endpoint returns valid JSON with correct schema
- [ ] Marketing pages render: landing page with Hero typewriter, pricing page with tier cards
- [ ] Root layout shows MarketingNav + Footer on `/` and `/pricing`, but NOT on `/app/*`
- [ ] App pages render: inbox with question list, question detail with answer form, analytics with charts, settings with tabs, admin with table
- [ ] Service worker file exists and handles push events
- [ ] No new TypeScript errors introduced in our files (pre-existing backend errors excluded)
