---
created: 2026-03-17T13:45:00Z
last_updated: 2026-03-17T16:00:00Z
type: spec
change_id: auq-web-platform
plan_number: 4
status: done
trigger: "Phase 4 — Landing page, Analytics dashboard, PWA setup, Vercel deploy"
depends_on: "003_frontend-pages.md"
next: "TBD"
---

# Plan: Landing Page, Analytics Dashboard, PWA + Deploy

## Background & Research

### Current Landing Page Stub

File: `web/src/client/pages/Landing.tsx` (lines 1-10):

```tsx
export function Component() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold">AUQ</h1>
        <p className="mt-2 text-muted-foreground">Ask User Questions</p>
      </div>
    </div>
  );
}
```

### Current Analytics Page Stub

File: `web/src/client/pages/Analytics.tsx` (lines 1-8):

```tsx
export function Component() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Analytics</h1>
      <p className="text-muted-foreground">Coming in Phase 3</p>
    </div>
  );
}
```

### Current Vite Config

File: `web/vite.config.ts` (lines 1-21):

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import devServer from "@hono/vite-dev-server";
import path from "path";

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    ...(mode !== "client"
      ? [
          devServer({
            entry: "src/server/index.ts",
            exclude: [/^(?!\/api).*$/],
          }),
        ]
      : []),
  ],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src/client") },
  },
  build: {
    rollupOptions: { input: "./index.html" },
  },
}));
```

### Current Vercel Config

File: `web/vercel.json` (lines 1-6):

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api" },
    { "source": "/((?!assets/).*)", "destination": "/index.html" }
  ]
}
```

### Current Package.json Scripts

```json
{
  "dev": "vite",
  "build": "vite build --mode client && vite build",
  "preview": "vite preview",
  "typecheck": "tsc --noEmit"
}
```

### Analytics API & Types

File: `web/src/client/lib/api.ts` (lines 170-173):

```ts
export function getAnalytics(
  token: string,
  days?: number,
): Promise<AnalyticsResponse> {
  const query = days !== undefined ? `?days=${days}` : "";
  return apiFetch<AnalyticsResponse>(`/analytics${query}`, { token });
}
```

File: `web/src/shared/types.ts` (lines 22-31):

```ts
export type AnalyticsResponse = {
  questionsPerDay: { date: string; count: number }[];
  avgResponseTimeMs: number;
  answeredCount: number;
  pendingCount: number;
  rejectedCount: number;
  abandonedCount: number;
  totalCount: number;
  responseTimeDistribution: Record<string, number>;
};
```

### Router Config

File: `web/src/client/router.tsx` (lines 1-17):

```ts
import { createBrowserRouter } from "react-router";

export const router = createBrowserRouter([
  { path: "/", lazy: () => import("./pages/Landing") },
  { path: "/sign-in/*", lazy: () => import("./pages/SignIn") },
  { path: "/sign-up/*", lazy: () => import("./pages/SignUp") },
  {
    path: "/app",
    lazy: () => import("./pages/AppLayout"),
    children: [
      { index: true, lazy: () => import("./pages/Inbox") },
      { path: "questions/:id", lazy: () => import("./pages/QuestionDetail") },
      { path: "analytics", lazy: () => import("./pages/Analytics") },
      { path: "settings", lazy: () => import("./pages/Settings") },
    ],
  },
]);
```

### Design System Requirements

**Landing Page (from PRD design-system.md §6.1):**

- Hero: Full viewport height (h-screen), gradient bg
- Heading: "Keep your hand on the wheel"
- Typewriter subtext: cycles through "Claude Code" → "OpenClaw" → "Cursor" → "Windsurf" → "Devin" → "Open Code"
  - Format: "Questions from {tool}|" with blinking cursor
  - Type speed: 120ms/char, dwell: 2000ms, delete speed: 60ms/char, pause: 100ms before next
- Sub-heading: "Answer from phone, desktop, anywhere"
- CTA buttons: "Get Started" (primary amber) + "Learn More" (outline)
- Features bento grid: 3-col desktop → 1-col mobile, 5 feature cards
  - Mobile, Async/Defer, Analytics, Teamwork, Open Source & Self-Host
- Pricing teaser: 2 cards (Free / Pro) — simple, not full pricing page
- Footer: Logo + links + © 2026 AUQ

**Analytics Dashboard (from PRD design-system.md §6.3):**

- Stats cards: 4-column grid (Total Questions, Avg Response Time, Answered Ratio, Pending Count)
- Area chart: Questions per day (Recharts AreaChart)
- Bar chart: Response time distribution (Recharts BarChart)
- Data source: `GET /api/v1/analytics` (already working)

**Typewriter Animation (from PRD design-system.md §7):**

- Infinite loop cycling tool names
- Type at 120ms/char → dwell 2000ms → delete at 60ms/char → pause 100ms → next

### Important Notes

- `web/public/` directory does NOT exist yet — must create for PWA icons
- No `recharts` package installed — must install
- No `vite-plugin-pwa` installed — must install
- Dark mode is P2 scope — SKIP for this MVP (PRD says light mode default, dark mode toggle is nice-to-have)
- The `web/` directory build has never been tested — `npm run build` must work at end

---

## Testing Plan (TDD — tests first)

Phase 4 is primarily UI pages + config, no unit tests needed. Verification is done via:

- [ ] TypeScript compiles with zero errors (`tsc --noEmit`)
- [ ] `npm run build` succeeds (both client and server builds)
- [ ] Dev server boots and all routes serve HTTP 200
- [ ] Analytics endpoint returns data that renders in charts

---

## Implementation Plan

### Pre-work: Install dependencies

- [ ] Install `recharts` and `vite-plugin-pwa` packages: `cd web && npm install recharts vite-plugin-pwa`

### Batch 1 (5 coders in parallel)

#### Coder A: TypewriterHero component

Files: `web/src/client/components/TypewriterHero.tsx` (CREATE)

- [ ] Create `TypewriterHero.tsx` component
- [ ] Implement infinite loop cycling through tool names: ["Claude Code", "OpenClaw", "Cursor", "Windsurf", "Devin", "Open Code"]
- [ ] State machine: TYPING → DWELLING → DELETING → PAUSING → TYPING
- [ ] Type speed: 120ms/char, dwell: 2000ms, delete speed: 60ms/char, pause: 100ms
- [ ] Render: `<span className="text-primary">Questions from {displayText}</span>` with blinking cursor `|`
- [ ] Blinking cursor: CSS animation `animate-blink` (opacity 0→1→0 at 530ms)
- [ ] Use `useEffect` + `setTimeout` for animation loop, cleanup on unmount
- [ ] Props: `className?: string` for outer wrapper styling

#### Coder B: Landing page (full rewrite)

Files: `web/src/client/pages/Landing.tsx` (REWRITE)

- [ ] Rewrite Landing.tsx with full marketing page
- [ ] Import `TypewriterHero` from `@/components/TypewriterHero` (will be created by Coder A — just import it)
- [ ] Import `Link` from `react-router` and lucide icons
- [ ] **Nav bar**: Fixed top, `AUQ` logo left, "Sign In" link right, semi-transparent bg with backdrop-blur
- [ ] **Hero section**: `min-h-screen`, centered content
  - Heading: "Keep your hand on the wheel" — `text-5xl md:text-7xl font-bold tracking-tight`
  - TypewriterHero component below heading
  - Sub-text: "Your AI agents have questions. Answer them from anywhere." — `text-lg md:text-xl text-muted-foreground`
  - CTA row: `<Link to="/sign-up">` with amber Button "Get Started Free" + outline Button "Learn More" (scrolls to features via `#features`)
- [ ] **Features section**: `id="features"`, `py-20`, heading "Built for the AI-first workflow"
  - 3-column grid (`grid-cols-1 md:grid-cols-3 gap-6`)
  - 5 feature cards using shadcn `Card` component:
    1. 📱 "Answer Anywhere" — "Phone, tablet, desktop. PWA with push notifications."
    2. ⚡ "Real-time Inbox" — "SSE streaming. Questions appear instantly."
    3. 🔑 "Secure API Keys" — "Per-workspace keys. SHA-256 hashed. One-click revoke."
    4. 📊 "Analytics" — "Response times, question volume, trends at a glance."
    5. 🔓 "Open Source" — "MIT licensed. Self-host or use our cloud."
  - Cards: icon (lucide) + title (`font-semibold`) + description (`text-muted-foreground text-sm`)
- [ ] **Footer**: `py-8 border-t`, centered text "© 2026 AUQ. All rights reserved." + link to GitHub
- [ ] Responsive: stack on mobile, spread on desktop
- [ ] Do NOT use emoji in actual code — use Lucide icons: `Smartphone`, `Zap`, `KeyRound`, `BarChart3`, `Github`

#### Coder C: Analytics dashboard page (full rewrite)

Files: `web/src/client/pages/Analytics.tsx` (REWRITE)

- [ ] Rewrite Analytics.tsx with full dashboard
- [ ] Import `useAuth` from `@clerk/react-router` for token
- [ ] Import `useWorkspace` from `@/hooks/useWorkspace` for workspaceId
- [ ] Import `getAnalytics` from `@/lib/api`
- [ ] Import `AnalyticsResponse` from `../../shared/types`
- [ ] Import Recharts: `{ AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar }`
- [ ] Import shadcn `Card`, `CardContent`, `CardHeader`, `CardTitle`
- [ ] **Data fetching**: `useEffect` → call `getAnalytics(token)` on mount, store in state. Show loading skeleton while fetching.
- [ ] **Stats row**: 4 cards in `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`
  - Total Questions: `data.totalCount` with `MessageSquare` icon
  - Avg Response Time: format `data.avgResponseTimeMs` → human readable (e.g., "2h 14m" or "5m 30s") with `Clock` icon
  - Answered: `data.answeredCount` with `CheckCircle` icon
  - Pending: `data.pendingCount` with `AlertCircle` icon
- [ ] **Area chart**: "Questions per Day" — `data.questionsPerDay` array, XAxis=date, YAxis=count
  - Amber fill: `fill="hsl(38 92% 50%)"` with `fillOpacity={0.2}`, `stroke="hsl(38 92% 50%)"`
  - Wrapped in `<Card>` with `<CardHeader><CardTitle>Questions per Day</CardTitle></CardHeader>`
  - Use `<ResponsiveContainer width="100%" height={300}>`
- [ ] **Bar chart**: "Response Time Distribution" — `data.responseTimeDistribution` → convert Record to array `[{range, count}]`
  - Keys are strings like "0-5m", "5-15m", "15-60m", "1h+"
  - Amber bars: `fill="hsl(38 92% 50%)"`
  - Wrapped in `<Card>` with title
- [ ] **Empty state**: If no data yet, show "No analytics data yet. Questions will appear here once agents start asking."
- [ ] **Error state**: If fetch fails, show error message with retry button
- [ ] Helper function: `formatDuration(ms: number): string` — converts ms to human readable

#### Coder D: StatsCard component + usePushNotifications hook

Files: `web/src/client/components/StatsCard.tsx` (CREATE), `web/src/client/hooks/usePushNotifications.ts` (CREATE)

- [ ] Create `StatsCard.tsx`:
  - Props: `{ title: string; value: string | number; icon: LucideIcon; description?: string; className?: string }`
  - Uses shadcn `Card`, `CardContent`, `CardHeader`, `CardTitle`
  - Layout: icon top-right, value large (`text-2xl font-bold`), title below (`text-xs text-muted-foreground uppercase tracking-wider`), optional description
- [ ] Create `usePushNotifications.ts` hook:
  - Returns `{ isSupported: boolean; isSubscribed: boolean; subscribe: () => Promise<void>; unsubscribe: () => Promise<void>; permission: NotificationPermission }`
  - `isSupported`: checks `'serviceWorker' in navigator && 'PushManager' in window`
  - `subscribe()`:
    1. Call `Notification.requestPermission()`
    2. Get service worker registration: `navigator.serviceWorker.ready`
    3. Call API `GET /api/v1/push/vapid-key` to get public key
    4. `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidKey) })`
    5. Extract `endpoint`, `p256dh`, `auth` from subscription
    6. Call API `POST /api/v1/push/subscribe` with `{ endpoint, p256dh, auth }`
  - `unsubscribe()`:
    1. Get current subscription: `registration.pushManager.getSubscription()`
    2. `subscription.unsubscribe()`
    3. Call API `POST /api/v1/push/unsubscribe` with `{ endpoint }`
  - Helper `urlBase64ToUint8Array(base64String: string): Uint8Array` — standard VAPID key conversion
  - Import `getVapidKey`, `subscribePush`, `unsubscribePush` from `@/lib/api`
  - Uses `useAuth()` from Clerk for token

#### Coder E: PWA config (vite-plugin-pwa + manifest + icons)

Files: `web/vite.config.ts` (MODIFY), `web/public/` (CREATE directory + files), `web/.env.example` (MODIFY)

- [ ] Create `web/public/` directory
- [ ] Create `web/public/icon-192.svg` — simple SVG icon: orange circle with "?" in white, 192x192 viewBox
  ```svg
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192">
    <rect width="192" height="192" rx="32" fill="#f59e0b"/>
    <text x="96" y="140" font-size="120" font-family="sans-serif" font-weight="bold" fill="white" text-anchor="middle">?</text>
  </svg>
  ```
- [ ] Create `web/public/icon-512.svg` — same SVG (vector scales), 512x512 viewBox
- [ ] Update `web/vite.config.ts`:
  - Add `import { VitePWA } from "vite-plugin-pwa";`
  - Add VitePWA plugin to plugins array (AFTER react, tailwindcss, BEFORE devServer):
    ```ts
    ...(mode === "client" ? [VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon-192.svg", "icon-512.svg"],
      manifest: {
        name: "AUQ - Ask User Questions",
        short_name: "AUQ",
        description: "Answer AI agent questions from anywhere",
        theme_color: "#f59e0b",
        background_color: "#ffffff",
        display: "standalone",
        scope: "/",
        start_url: "/app",
        icons: [
          { src: "icon-192.svg", sizes: "192x192", type: "image/svg+xml", purpose: "any" },
          { src: "icon-512.svg", sizes: "512x512", type: "image/svg+xml", purpose: "any maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.clerk\..*\//,
            handler: "NetworkOnly",
          },
          {
            urlPattern: /\/api\//,
            handler: "NetworkFirst",
            options: { cacheName: "api-cache", expiration: { maxEntries: 50, maxAgeSeconds: 300 } },
          },
        ],
      },
    })] : []),
    ```
  - IMPORTANT: VitePWA only in `mode === "client"` (production build), not during dev
- [ ] Update `web/.env.example` — add VAPID key vars:
  ```
  VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
  CLERK_SECRET_KEY=sk_test_...
  DATABASE_URL=file:./local.db
  DATABASE_AUTH_TOKEN=
  VAPID_PUBLIC_KEY=
  VAPID_PRIVATE_KEY=
  VAPID_SUBJECT=mailto:admin@auq.dev
  ```

### Batch 2 (after Batch 1 completes)

#### Fix & Verify

- [ ] Run `npx tsc --noEmit` — fix any type errors
- [ ] Run `npm run build` — fix any build errors
- [ ] Boot dev server, test all routes return HTTP 200
- [ ] Verify landing page renders with typewriter animation
- [ ] Verify analytics page renders (with empty state or mock data)

---

## Parallelization Plan

### Batch 1 (5 coders in parallel)

- [ ] Coder A: TypewriterHero component → files: `web/src/client/components/TypewriterHero.tsx`
- [ ] Coder B: Landing page rewrite → files: `web/src/client/pages/Landing.tsx`
- [ ] Coder C: Analytics dashboard → files: `web/src/client/pages/Analytics.tsx`
- [ ] Coder D: StatsCard + usePushNotifications → files: `web/src/client/components/StatsCard.tsx`, `web/src/client/hooks/usePushNotifications.ts`
- [ ] Coder E: PWA config + icons → files: `web/vite.config.ts`, `web/public/icon-192.svg`, `web/public/icon-512.svg`, `web/.env.example`

### Batch 2 (after Batch 1 — sequential)

- [ ] Orchestrator: Run tsc, fix errors, run build, boot dev server, verify all routes

### Dependencies

- Coder B imports `TypewriterHero` from Coder A, but this is just an import — B doesn't need A's file to exist yet (lazy loading). Both can run in parallel.
- Coder C can reference `StatsCard` from Coder D, but can also inline stats cards. To avoid coupling, Coder C should inline its own stat cards (simpler).
- Coder E modifies `vite.config.ts` — no other coder touches this file.

### Risk Areas

- **Recharts types**: Recharts v2 has good TypeScript support but some generic type args can be finicky. If tsc complains about Recharts, use `any` for chart data props.
- **vite-plugin-pwa + Hono devServer**: PWA plugin should only be active in `mode === "client"` build, not during dev. The conditional in vite.config.ts handles this.
- **Build test**: This is the first time `npm run build` is tested. The dual build (`vite build --mode client && vite build`) may need adjustment if Hono server build has issues.
- **SVG icons**: Using SVG instead of PNG for PWA icons. Modern browsers support this; older ones may not show the icon but the app still works.

---

## Done Criteria

- [ ] `tsc --noEmit` exits with 0 errors
- [ ] `npm run build` succeeds (both client + server bundles)
- [ ] Dev server boots, all routes serve HTTP 200 (/, /app, /app/analytics, /app/settings)
- [ ] Landing page has: nav bar, hero with typewriter, features grid (5 cards), footer
- [ ] Analytics page has: 4 stats cards, area chart, bar chart (or empty state if no data)
- [ ] TypewriterHero cycles through tool names with type/delete animation
- [ ] `web/public/` contains PWA icon SVGs
- [ ] `vite.config.ts` has VitePWA plugin configured
- [ ] `.env.example` includes VAPID key vars
- [ ] `usePushNotifications` hook exists and compiles
