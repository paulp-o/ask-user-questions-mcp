---
created: 2026-03-16T14:00:00Z
last_updated: 2026-03-16T14:00:00Z
type: spec
change_id: auq-web-service
plan_number: 8
status: pending
trigger: "Phase 8: Build SvelteKit PWA frontend with workspace selection, question inbox, question detail/answer, SSE real-time, push notifications, service worker, dark/light theme, mobile-first, accessibility"
depends_on: "007_web-platform-api-endpoints.md"
next: "009_web-platform-auth-push.md"
---

# Plan: Web Platform — Frontend PWA

## Background & Research

### Design System (`.slash/workspace/design/system.md`)
Coders MUST read this file before implementing any UI. Key decisions:
- **Palette**: Monochromatic scale with single accent (cyan-400 or emerald-400). Dark mode primary.
- **Typography**: Inter for UI, JetBrains Mono for data/code. Tight tracking headlines, semibold.
- **Style**: Minimalist, high contrast. No gradients. Borders-only (1px solid gray-800 dark mode).
- **Spacing**: 4px base unit. 16px component padding, 32px section spacing. Compact mobile layout.
- **Color temp**: Cool grays (Slate/Zinc). Accent = sharp vibrant primary for actionable items.
- **"Pending Pulse"**: Subtle blinking cursor/glowing dot indicating agent waiting for answer.

### Component Patterns (from design system)
- **Option Cards**: Full-width touch targets, 1px border. Selected = accent border + lighter bg.
- **Status Badges**: Small monospace. `pending` (accent), `in-progress` (yellow), `completed` (dim gray), `timed_out` (red).
- **Text Inputs**: Inset feel. bg-black on bg-gray-950 canvas. 1px border on focus.
- **Action Buttons**: Full width on mobile. High contrast primary, subtle borders secondary.

### Page-Specific Designs (`.slash/workspace/design/pages/`)
Coders MUST read these files for page-specific overrides:

**Question Inbox** (`pages/question-inbox.md`):
- Full-bleed list on mobile, no page margins
- Cards separated by 1px bottom border (continuous feed)
- High-density: Agent name (small, muted), Question title (primary, bold), Time elapsed (monospace, right-aligned)
- Empty state: Centered muted text "No pending questions", no illustrations

**Question Detail** (`pages/question-detail.md`):
- Sticky top header: Back button (left), Status Badge (right)
- Question text: Larger typography (text-xl / text-2xl)
- Options: Stacked vertical, min 48px height touch targets
- Multi-select: Sticky bottom action bar for "Submit Answer"
- Custom input "Other": Auto-focus on desktop, expand textarea on mobile

**Settings** (`pages/settings.md`):
- Segmented sections with category headers
- API key: Monospace, hidden by default (dots), Reveal icon + Copy button, darker bg
- Toggles: Accent-colored switches for push notifications

### Current Platform State
No frontend exists yet. Only API routes and infrastructure:
- **No Tailwind CSS** installed (no postcss.config, no tailwind.config)
- **No +layout.svelte** or **+page.svelte** with content
- **static/** contains only `robots.txt`
- SvelteKit 2.50.2, Svelte 5.51.0 (runes mode enabled), Vite 7.3.1

### Existing API Routes (for frontend fetch calls)
```
POST /api/v1/questions          — Create questions (auth: Bearer API key)
GET  /api/v1/questions/:id      — Get question by ID (auth: Bearer API key)  
POST /api/v1/questions/:id/answer — Submit answers (auth: Bearer API key)
DELETE /api/v1/questions/:id    — Soft-delete question (auth: Bearer API key)
GET  /api/v1/questions/stream?workspaceId=X — SSE stream (no auth, workspace param)
```

### SSE Stream Response Format
```ts
// From platforms/web/src/routes/api/v1/questions/stream/+server.ts
// Polls DB every 2s, sends changed questions:
data: {"type":"questions","data":[{id, workspaceId, status, title, questionsJson, createdAt, updatedAt}]}
// Keepalive every 15s:
:\n\n
// Error:
data: {"type":"error","message":"stream poll failed"}
```

### DB Schema Types (for frontend type usage)
```ts
// From platforms/web/src/lib/db/schema.ts
// Questions table fields: id, workspaceId, status, title, questionsJson (JSON string of QuestionSchema[]), createdAt, updatedAt
// Status enum: 'pending' | 'in_progress' | 'completed' | 'rejected' | 'timed_out' | 'abandoned'
// Answers table: id, questionId, questionIndex, selectedOption, selectedOptionsJson (JSON string), customText, answeredAt
// Push subscriptions: id, workspaceId, endpoint, p256dh, auth, userAgent, createdAt, lastUsedAt
```

### Request Schemas
```ts
// From platforms/web/src/lib/api/schemas.ts
CreateQuestionsBodySchema = z.object({
  questions: z.array(z.object({
    prompt: z.string(),
    title: z.string().min(1),
    options: z.array(OptionSchema).min(2),
    multiSelect: z.boolean().optional()
  })).min(1),
  title: z.string().optional()
});

SubmitAnswersBodySchema = z.object({
  answers: z.array(z.object({
    questionIndex: z.number().int().min(0),
    selectedOption: z.string().optional(),
    selectedOptions: z.array(z.string()).optional(),
    customText: z.string().optional()
  })).min(1)
});
```

### Current package.json (platforms/web)
```json
{
  "devDependencies": {
    "@sveltejs/adapter-auto": "^7.0.0",
    "@sveltejs/kit": "^2.50.2",
    "@sveltejs/vite-plugin-svelte": "^6.2.4",
    "svelte": "^5.51.0",
    "vite": "^7.3.1"
  },
  "dependencies": {
    "@paulp-o/auq-shared": "file:../../packages/shared",
    "better-sqlite3": "^12.8.0",
    "drizzle-orm": "^0.45.1",
    "zod": "^4.3.6"
  }
}
```

### Current app.html
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    %sveltekit.head%
  </head>
  <body data-sveltekit-preload-data="hover">
    <div style="display: contents">%sveltekit.body%</div>
  </body>
</html>
```

### Current svelte.config.js
```js
import adapter from '@sveltejs/adapter-auto';
const config = {
  kit: { adapter: adapter() },
  vitePlugin: {
    dynamicCompileOptions: ({ filename }) =>
      filename.includes('node_modules') ? undefined : { runes: true }
  }
};
export default config;
```

## Testing Plan (TDD - tests first)

NOTE: Frontend component tests with Svelte 5 runes are complex to set up. For this phase, focus on:
- Unit tests for stores/utilities (pure logic, no DOM)
- Integration verification via `bun run check` (TypeScript + Svelte type checking)
- Manual PWA verification criteria in Done Criteria

- [ ] Create `platforms/web/src/lib/stores/__tests__/questions.test.ts` — test question store logic: initial state, adding questions, updating status, SSE message parsing, filtering by status
- [ ] Create `platforms/web/src/lib/stores/__tests__/workspace.test.ts` — test workspace store: set/get/clear API key, workspace ID persistence logic
- [ ] Create `platforms/web/src/lib/stores/__tests__/theme.test.ts` — test theme store: toggle, persist preference, system preference detection
- [ ] Create `platforms/web/src/lib/api/__tests__/client.test.ts` — test frontend API client: fetch wrapper, auth header injection, error handling, response parsing

## Implementation Plan

### Setup: Tailwind CSS + Fonts + PWA Foundation
- [ ] Install Tailwind CSS v4 + `@tailwindcss/vite` in platforms/web (`bun add -D tailwindcss @tailwindcss/vite`)
- [ ] Create `platforms/web/src/app.css` with Tailwind v4 import: `@import "tailwindcss";` plus custom theme (slate palette, Inter+JetBrains Mono fonts, accent color cyan-400)
- [ ] Update `platforms/web/vite.config.ts` to add tailwindcss vite plugin
- [ ] Update `platforms/web/src/app.html` — add PWA meta tags: `<meta name="theme-color">`, `<link rel="manifest" href="/manifest.json">`, `<link rel="icon">`, apple-touch-icon, Inter/JetBrains Mono font imports
- [ ] Create `platforms/web/static/manifest.json` — PWA manifest with name "AUQ", short_name, start_url "/", display "standalone", theme_color, background_color, icons array (192x192, 512x512)
- [ ] Create placeholder PWA icons in `platforms/web/static/` (192x192 and 512x512 PNG, can be simple generated SVG-based icons)

### Svelte Stores (State Management)
- [ ] Create `platforms/web/src/lib/stores/workspace.svelte.ts` — Svelte 5 runes store: `apiKey` (persisted to localStorage), `workspaceId`, `isConfigured` derived, `setApiKey()`, `clearApiKey()`
- [ ] Create `platforms/web/src/lib/stores/questions.svelte.ts` — Svelte 5 runes store: `questions` array, `pendingQuestions` derived (filtered by status='pending'), `addOrUpdateQuestions()`, `getQuestion(id)`, SSE connection management (`connect()`, `disconnect()`, `isConnected`)
- [ ] Create `platforms/web/src/lib/stores/theme.svelte.ts` — Svelte 5 runes store: `theme` ('light'|'dark'|'system'), `resolvedTheme` derived, `toggle()`, persist to localStorage, respect `prefers-color-scheme`
- [ ] Create `platforms/web/src/lib/stores/notifications.svelte.ts` — Svelte 5 runes store: `permission` state, `isSubscribed`, `requestPermission()`, `subscribe()`, `unsubscribe()`

### Frontend API Client
- [ ] Create `platforms/web/src/lib/api/client.ts` — typed fetch wrapper: `apiClient.get(path)`, `apiClient.post(path, body)`, `apiClient.delete(path)`. Auto-injects `Authorization: Bearer {apiKey}` from workspace store. Handles 401 → redirect to setup. Typed error responses.

### Root Layout + Theme
- [ ] Create `platforms/web/src/routes/+layout.svelte` — root layout: imports app.css, applies theme class to `<html>` element, provides global navigation shell (minimal top bar with app name "AUQ" + theme toggle + settings gear icon), `<slot />` for page content. Mobile-first with max-width container.

### Pages
- [ ] Create `platforms/web/src/routes/+page.svelte` — Question Inbox page (main landing): connects to SSE on mount, displays pending questions as continuous feed list per design spec, each item shows agent name / question title / time elapsed, tap navigates to `/questions/[id]`, empty state "No pending questions", loading skeleton on initial load
- [ ] Create `platforms/web/src/routes/+page.ts` — load function: check if workspace is configured, if not redirect to `/setup`
- [ ] Create `platforms/web/src/routes/setup/+page.svelte` — Workspace Setup page: API key input form (paste key), validate key by calling a health/verify endpoint or just store it, on success redirect to inbox. Clean, centered layout.
- [ ] Create `platforms/web/src/routes/questions/[id]/+page.svelte` — Question Detail page: fetch question by ID, display question text (large typography), render options as selectable cards (single-select = radio behavior, multi-select = checkbox behavior), "Other" custom text input, sticky Submit button bar at bottom, back navigation in header, status badge
- [ ] Create `platforms/web/src/routes/questions/[id]/+page.ts` — load function: fetch question data from API using `params.id`
- [ ] Create `platforms/web/src/routes/settings/+page.svelte` — Settings page: display current API key (masked, with reveal/copy), push notification toggle with permission request, theme selector (light/dark/system), clear workspace button with confirmation

### Shared UI Components
- [ ] Create `platforms/web/src/lib/components/QuestionCard.svelte` — inbox list item: agent name, title, time elapsed badge, pending pulse indicator, tap handler
- [ ] Create `platforms/web/src/lib/components/OptionCard.svelte` — selectable option: full-width, 1px border, accent on selected, checkbox/radio indicator, min 48px height
- [ ] Create `platforms/web/src/lib/components/StatusBadge.svelte` — status display: monospace, color-coded per design system (pending=accent, completed=dim, timed_out=red)
- [ ] Create `platforms/web/src/lib/components/ThemeToggle.svelte` — dark/light/system toggle button with icon
- [ ] Create `platforms/web/src/lib/components/LoadingSkeleton.svelte` — pulse animation skeleton for loading states

### Service Worker + Offline
- [ ] Create `platforms/web/src/service-worker.ts` — SvelteKit service worker: cache static assets, cache API responses for offline viewing of answered questions, handle push notification events (`push` → show notification, `notificationclick` → open app to question detail)
- [ ] Register service worker in root layout (SvelteKit handles this automatically via `src/service-worker.ts`)

### Accessibility + Final Polish
- [ ] Add ARIA labels to all interactive elements across all components and pages
- [ ] Add keyboard navigation support: Enter/Space for option selection, Tab order through options, Escape to go back
- [ ] Ensure all color contrasts meet WCAG AA (4.5:1 for text, 3:1 for large text)

## Parallelization Plan

### Batch 1 (sequential — must complete first)
- [ ] Coder A: Tailwind setup + app.css + app.html + manifest.json + vite.config.ts + PWA icons -> files: `platforms/web/src/app.css` (NEW), `platforms/web/src/app.html`, `platforms/web/vite.config.ts`, `platforms/web/static/manifest.json` (NEW), `platforms/web/static/icon-192.png` (NEW), `platforms/web/static/icon-512.png` (NEW), `platforms/web/package.json`

### Batch 2 (parallel — stores + API client + tests)
- [ ] Coder B: All Svelte stores + store tests -> files: `platforms/web/src/lib/stores/workspace.svelte.ts` (NEW), `platforms/web/src/lib/stores/questions.svelte.ts` (NEW), `platforms/web/src/lib/stores/theme.svelte.ts` (NEW), `platforms/web/src/lib/stores/notifications.svelte.ts` (NEW), `platforms/web/src/lib/stores/__tests__/questions.test.ts` (NEW), `platforms/web/src/lib/stores/__tests__/workspace.test.ts` (NEW), `platforms/web/src/lib/stores/__tests__/theme.test.ts` (NEW)
- [ ] Coder C: Frontend API client + client test -> files: `platforms/web/src/lib/api/client.ts` (NEW), `platforms/web/src/lib/api/__tests__/client.test.ts` (NEW)

### Batch 3 (parallel — UI components + layout)
- [ ] Coder D: All shared UI components -> files: `platforms/web/src/lib/components/QuestionCard.svelte` (NEW), `platforms/web/src/lib/components/OptionCard.svelte` (NEW), `platforms/web/src/lib/components/StatusBadge.svelte` (NEW), `platforms/web/src/lib/components/ThemeToggle.svelte` (NEW), `platforms/web/src/lib/components/LoadingSkeleton.svelte` (NEW)
- [ ] Coder E: Root layout + setup page -> files: `platforms/web/src/routes/+layout.svelte` (NEW), `platforms/web/src/routes/setup/+page.svelte` (NEW)

### Batch 4 (parallel — main pages)
- [ ] Coder F: Question Inbox page -> files: `platforms/web/src/routes/+page.svelte`, `platforms/web/src/routes/+page.ts` (NEW)
- [ ] Coder G: Question Detail + Answer page -> files: `platforms/web/src/routes/questions/[id]/+page.svelte` (NEW), `platforms/web/src/routes/questions/[id]/+page.ts` (NEW)
- [ ] Coder H: Settings page -> files: `platforms/web/src/routes/settings/+page.svelte` (NEW)

### Batch 5 (sequential — service worker + accessibility)
- [ ] Coder I: Service worker + accessibility pass across all files -> files: `platforms/web/src/service-worker.ts` (NEW), then accessibility audit across all component/page files

### Dependencies
- Batch 1 must complete first (Tailwind + app.css needed by all UI work)
- Batch 2 + 3 depend on Batch 1 (stores need no Tailwind, but components do)
- Batch 3 components are imported by Batch 4 pages, so Batch 3 must complete first
- Batch 4 pages depend on Batch 2 stores + Batch 3 components
- Batch 5 service worker can only be done after pages exist

### Risk Areas
- Svelte 5 runes syntax — coders must use `$state()`, `$derived()`, `$effect()` not Svelte 4 stores
- Tailwind v4 uses `@import "tailwindcss"` not `@tailwind` directives — coders must use v4 syntax
- SSE integration in questions store — must handle reconnection, cleanup on unmount
- Service worker caching strategy — must not cache API mutations, only GET responses
- Component imports between batches — Batch 4 coders must know exact component props/APIs from Batch 3

## Done Criteria
- [ ] All store tests pass (`bun test` in platforms/web/)
- [ ] API client tests pass
- [ ] `bun run check` passes (TypeScript + Svelte type checking)
- [ ] `bun run build` succeeds
- [ ] Question Inbox shows pending questions from SSE stream
- [ ] Question Detail allows selecting options and submitting answers
- [ ] Setup page captures and persists API key
- [ ] Settings page shows masked API key with reveal/copy
- [ ] Dark/light/system theme toggle works and persists
- [ ] PWA manifest loads (can check in browser DevTools > Application)
- [ ] Service worker registers and caches static assets
- [ ] All interactive elements have ARIA labels
- [ ] Mobile layout is usable at 375px viewport width
