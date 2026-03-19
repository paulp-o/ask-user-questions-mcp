---
created: 2026-03-17T12:00:00Z
last_updated: 2026-03-17T15:00:00Z
type: spec
change_id: auq-web-platform
plan_number: 3
status: done
trigger: "Phase 3 — Frontend Pages: Inbox, Answer Form, Settings, API client, SSE hook"
depends_on: "002_core-api-endpoints.md"
next: "004_landing-analytics-pwa-deploy.md"
---

# Plan: Frontend Pages — Inbox, Answer, Settings

## Background & Research

### Current State

All 4 app pages (Inbox, QuestionDetail, Analytics, Settings) are stubs showing "Coming in Phase 3". The AppLayout has a placeholder sidebar. No API client, no hooks, no custom components exist yet.

### Router Config (`web/src/client/router.tsx`)

```tsx
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

### AppLayout (`web/src/client/pages/AppLayout.tsx`)

```tsx
import { useAuth } from "@clerk/react-router";
import { Outlet, Navigate } from "react-router";

export function Component() {
  const { isSignedIn, isLoaded } = useAuth();
  if (isLoaded && !isSignedIn) {
    return <Navigate to="/sign-in" />;
  }
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r p-4">Sidebar placeholder</aside>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
```

### Shared Types (`web/src/shared/types.ts`)

```ts
export type QuestionStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "rejected"
  | "timed_out"
  | "abandoned";
export type Workspace = typeof schema.workspaces.$inferSelect;
export type ApiKey = typeof schema.apiKeys.$inferSelect;
export type Question = typeof schema.questions.$inferSelect;
export type Answer = typeof schema.answers.$inferSelect;
export type PushSubscription = typeof schema.pushSubscriptions.$inferSelect;
export type WorkspaceResponse = Workspace & { questionCount?: number };
export type ApiKeyCreateResponse = {
  id: string;
  name: string;
  key: string;
  createdAt: Date;
};
export type ApiKeyListItem = {
  id: string;
  name: string;
  key: string;
  createdAt: Date;
  lastUsedAt: Date | null;
};
export type QuestionResponse = Omit<Question, "questionsJson"> & {
  questions: unknown[];
  answers: Answer[];
};
export type AnswerResponse = {
  id: string;
  questionId: string;
  questionIndex: number;
  answeredAt: Date;
};
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

### Constants (`web/src/client/lib/constants.ts`)

```ts
export const API_BASE = "/api/v1";
export const APP_NAME = "AUQ";
export const APP_DESCRIPTION = "Ask User Questions";
export const QUESTION_STATUSES = {
  pending: { label: "Pending", color: "blue" },
  in_progress: { label: "In Progress", color: "yellow" },
  completed: { label: "Completed", color: "green" },
  rejected: { label: "Rejected", color: "orange" },
  timed_out: { label: "Timed Out", color: "red" },
  abandoned: { label: "Abandoned", color: "gray" },
} as const;
```

### Zod Schemas (`web/src/shared/schemas.ts`)

```ts
// Key schemas the frontend uses:
export const createWorkspaceSchema = z.object({ name: z.string().min(1).max(100) });
export const createApiKeySchema = z.object({ name: z.string().min(1).max(50) });
export const submitAnswerSchema = z.object({
  questionIndex: z.number().int().min(0),
  selectedOption: z.string().optional(),
  selectedOptions: z.array(z.string()).optional(),
  customText: z.string().optional(),
  rejected: z.boolean().optional(),
  rejectionReason: z.string().optional(),
}).refine(...); // must provide at least one answer type
```

### Server API Routes Summary (exact paths from Hono)

```
POST   /api/v1/workspaces                   → clerkAuth → { id, name, userId, createdAt, updatedAt } (201)
GET    /api/v1/workspaces/:id               → bearerAuth → { id, name, userId, createdAt, updatedAt, questionCount }
PATCH  /api/v1/workspaces/:id               → bearerAuth → { id, name, userId, createdAt, updatedAt }
POST   /api/v1/workspaces/:id/keys          → clerkAuth → { id, name, key (rawKey), createdAt } (201)
GET    /api/v1/workspaces/:id/keys          → clerkAuth → { keys: [{ id, name, key (prefix), createdAt, lastUsedAt }] }
DELETE /api/v1/workspaces/:id/keys/:keyId   → clerkAuth → 204
POST   /api/v1/questions                    → bearerAuth → { id, status, title, createdAt, updatedAt } (201)
GET    /api/v1/questions/:id                → bearerAuth → { id, status, title, questions (parsed), answers, createdAt, updatedAt }
GET    /api/v1/questions/stream             → bearerAuthFromQuery (token=rawKey) → SSE
POST   /api/v1/questions/:id/answer         → bearerAuth → { id, questionId, questionIndex, answeredAt }
DELETE /api/v1/questions/:id                → bearerAuth → 204
GET    /api/v1/analytics                    → clerkAuth → AnalyticsResponse
GET    /api/v1/push/vapid-key               → no auth → { publicKey } or 501
POST   /api/v1/push/subscribe               → clerkAuth → { id, createdAt } (201)
POST   /api/v1/push/unsubscribe             → clerkAuth → 204
```

### Auth Modes (from `web/src/server/middleware/auth.ts`)

- **clerkAuth**: Reads Bearer token from Authorization header, verifies with Clerk. Dev fallback: `CLERK_SECRET_KEY` not set → uses `dev_user`.
- **bearerAuth**: Reads Bearer token from Authorization header, SHA-256 hashes it, looks up in `api_keys` table.
- **bearerAuthFromQuery**: Same as bearerAuth but reads `token` from query string (for SSE EventSource which can't set headers).

**CRITICAL**: Frontend browser requests use clerkAuth (Clerk JWT). For question detail/answer/SSE, frontend needs the API key stored in localStorage (bearerAuth). The two auth modes target different endpoints.

### SSE Stream Format (from `web/src/server/routes/questions.ts`)

```ts
// Server sends generic SSE messages, ALL via event: "message"
// Client receives via onmessage handler, then JSON.parse(event.data)
// Data format: { type: "connected" | "question:created" | "question:updated" | "keep-alive", data?: {...} }
// question data: { ...question fields, questions: JSON.parse(questionsJson) }
// SSE URL: /api/v1/questions/stream?token=<raw_api_key>
// Polls DB every 5 seconds for updated questions
```

### DB Schema (`web/src/server/db/schema.ts`)

Key note: `questionsJson` is a TEXT column storing JSON stringified array. Server parses it on read.
Each sub-question in the array has: `{ id, title?, prompt, type: "singleSelect"|"multiSelect"|"freeText", options?: [{ id, label, description? }] }`

### Available shadcn/ui Components

button, card, input, dialog, badge, tabs, separator, dropdown-menu

### Available Dependencies (from package.json)

- `lucide-react` — icons
- `react-router` v7 — routing
- `@clerk/react-router` — auth hooks (useAuth, useUser, UserButton, etc.)
- `zod` — validation
- No toast library installed yet — will need `sonner` for notifications

### Design System Key References (from prd/auq-design-system.md)

- **Sidebar**: w-64 (256px desktop), hidden on mobile, hamburger → sheet overlay
- **Main content**: px-8 py-6 (desktop), px-4 py-4 (mobile), max-w-6xl
- **Question card**: [Badge] Title Time / Prompt text (max 2 lines) / [Action] [More Info]
- **Status badge colors**: pending=blue, completed=green, rejected=orange, timed_out=red, abandoned=gray
- **Icons**: Home (inbox), BarChart3 (analytics), Settings (settings), LogOut (logout), size 24 for nav
- **Answer form**: Radio for singleSelect, checkboxes for multiSelect, textarea for freeText, "Other" text input
- **API Key table**: Name | Created | Last Used | Actions (⋯ Revoke)
- **Settings tabs**: General, API Keys, Notifications

### Critical Lessons (MUST follow)

1. **API paths MUST match** actual Hono routes — verify against server route files above
2. **SSE: generic onmessage** → `JSON.parse(event.data)` → `{ type, data }` — NOT `addEventListener('question:created', ...)`
3. **API key rawKey**: save to localStorage immediately on creation, show copy-once dialog with warning
4. **No Button inside DialogTrigger** — use `asChild` prop on DialogTrigger
5. **questionsJson**: server already parses it in GET response → `questions` array in response
6. **submitAnswer response**: returns `{ id, questionId, questionIndex, answeredAt }` — NOT the question object
7. **SSE needs raw API key as query param** (token=), NOT Clerk JWT — EventSource can't set headers
8. **Clerk JWT for browser routes**: use `useAuth().getToken()` from `@clerk/react-router` to get JWT for fetch headers
9. **analytics and workspace CRUD endpoints use clerkAuth** — so frontend sends Clerk JWT
10. **question GET/:id and POST/:id/answer use bearerAuth** — so frontend needs to send the stored API key

---

## Testing Plan (TDD — tests first)

> Note: No test framework is set up yet in this project. The "testing" for this phase is manual verification via dev server. The plan focuses on building working features that can be visually verified.

- [ ] After implementation, verify: dev server boots without errors (`npm run dev`)
- [ ] After implementation, verify: `tsc --noEmit` passes with zero errors
- [ ] After implementation, verify: Sidebar renders with nav items, active item highlights
- [ ] After implementation, verify: Inbox page connects to SSE, shows empty state when no API key
- [ ] After implementation, verify: Settings > API Keys tab can create key, shows copy-once dialog
- [ ] After implementation, verify: Question detail page renders answer form correctly

---

## Implementation Plan

### Batch 1: Shared infrastructure (5 coders in parallel — no file conflicts)

#### Coder A: API Client Library + Install sonner

**Files (exclusive):** `web/src/client/lib/api.ts`
**Also run:** `cd web && npm install sonner`

- [ ] Install `sonner` toast library: `cd web && npm install sonner`
- [ ] Create `web/src/client/lib/api.ts` — typed fetch wrapper for ALL 15 endpoints
- [ ] Helper function `getClerkToken()` that calls `window.Clerk?.session?.getToken()` — or accept token as param
- [ ] Helper `apiFetch(path, options)` — automatically adds Authorization header, handles JSON parse, throws on non-ok
- [ ] Workspace functions: `createWorkspace(token, name)`, `getWorkspace(apiKey, id)`, `updateWorkspace(apiKey, id, data)`
- [ ] API Key functions: `createApiKey(token, workspaceId, name)` → returns `{ id, name, key, createdAt }`, `listApiKeys(token, workspaceId)` → returns `{ keys: [...] }`, `revokeApiKey(token, workspaceId, keyId)`
- [ ] Question functions: `getQuestion(apiKey, id)` → returns `QuestionResponse`, `submitAnswer(apiKey, questionId, data)` → returns `AnswerResponse`, `abandonQuestion(apiKey, id)`
- [ ] Analytics functions: `getAnalytics(token, days?)` → returns `AnalyticsResponse`
- [ ] Push functions: `getVapidKey()`, `subscribePush(token, subscription)`, `unsubscribePush(token, endpoint)`
- [ ] Export all types from shared/types.ts for convenience
- [ ] CRITICAL: Every path must match the server routes exactly — use `API_BASE` from constants
- [ ] CRITICAL: Use correct auth per endpoint — Clerk JWT for workspace/keys/analytics/push routes, Bearer API key for questions/answers

#### Coder B: useSSE Hook + useWorkspace Hook

**Files (exclusive):** `web/src/client/hooks/useSSE.ts`, `web/src/client/hooks/useWorkspace.ts`

- [ ] Create `web/src/client/hooks/useSSE.ts`:
  - `useSSE(apiKey: string | null)` hook
  - Creates `EventSource` to `/api/v1/questions/stream?token=${apiKey}` when apiKey is non-null
  - Uses `onmessage` handler (NOT addEventListener for named events)
  - Parses `JSON.parse(event.data)` → `{ type, data }`
  - Handles types: `connected`, `question:created`, `question:updated`, `keep-alive`
  - Maintains `questions` state (Map<id, question>) — new questions prepended, updated questions replaced
  - Provides `{ questions: QuestionWithParsed[], isConnected: boolean, error: string | null }`
  - Auto-reconnect on error with exponential backoff (1s, 2s, 4s, max 30s)
  - Cleanup: close EventSource on unmount or apiKey change
  - Define `QuestionWithParsed` type: question fields + `questions: SubQuestion[]` (parsed from questionsJson)
  - Define `SubQuestion` type: `{ id: string, title?: string, prompt: string, type: "singleSelect" | "multiSelect" | "freeText", options?: { id: string, label: string, description?: string }[] }`
- [ ] Create `web/src/client/hooks/useWorkspace.ts`:
  - `useWorkspace()` hook
  - Reads/writes workspaceId and workspaceName from localStorage
  - Provides `{ workspaceId, workspaceName, setWorkspace(id, name), clearWorkspace }`
  - On first load, if no workspace exists, return null (triggers onboarding)

#### Coder C: useApiKey Hook + QuestionCard Component

**Files (exclusive):** `web/src/client/hooks/useApiKey.ts`, `web/src/client/components/QuestionCard.tsx`

- [ ] Create `web/src/client/hooks/useApiKey.ts`:
  - `useApiKey()` hook
  - Reads/writes raw API key from localStorage key `auq_api_key`
  - Provides `{ apiKey: string | null, setApiKey(key: string), clearApiKey(), hasApiKey: boolean }`
- [ ] Create `web/src/client/components/QuestionCard.tsx`:
  - Props: `{ question: QuestionWithParsed, onClick: () => void }`
  - Card layout per design system wireframe:
    - Top row: Status Badge (left) + Title (center-fill) + relative time (right, e.g., "3h ago")
    - Middle: First sub-question prompt text, truncated to 2 lines (line-clamp-2)
    - Bottom row: "Answer" button (if pending) or "Answered ✓" text (if completed) or status text
  - Badge variants per QUESTION_STATUSES: pending→blue/default, completed→green, rejected→orange, etc.
  - Use shadcn Card, Badge, Button
  - Import `Inbox` icon from lucide-react for empty card
  - Clicking the card calls `onClick` (navigate to question detail)
  - Relative time: implement simple `timeAgo(date)` util inline or in utils.ts

#### Coder D: AnswerForm Component

**Files (exclusive):** `web/src/client/components/AnswerForm.tsx`

- [ ] Create `web/src/client/components/AnswerForm.tsx`:
  - Props: `{ question: QuestionWithParsed, questionIndex: number, subQuestion: SubQuestion, onSubmit: (data) => Promise<void>, isSubmitting: boolean }`
  - Renders different UI based on `subQuestion.type`:
    - `singleSelect`: Radio buttons for each option, with optional "Other" text input
    - `multiSelect`: Checkboxes for each option, with optional "Other" text input
    - `freeText`: Textarea input
  - Each option shows `label` and optional `description` (smaller text below)
  - Submit button: "Submit Answer" (primary amber button), disabled when nothing selected or isSubmitting
  - Reject section: "Not applicable" button (outline/ghost variant) with optional rejectionReason textarea
  - On submit, calls `onSubmit({ questionIndex, selectedOption?, selectedOptions?, customText?, rejected?, rejectionReason? })`
  - Form validation: must select at least one option or enter text before submit
  - DO NOT nest Button inside DialogTrigger (lesson #4)
  - Use native HTML radio/checkbox inputs styled with Tailwind (shadcn Input doesn't have radio/checkbox)

#### Coder E: Sidebar Component + Toaster Setup

**Files (exclusive):** `web/src/client/components/Sidebar.tsx`, `web/src/client/components/Toaster.tsx`

- [ ] Create `web/src/client/components/Sidebar.tsx`:
  - Uses `useUser` from `@clerk/react-router` for avatar/name
  - Uses `useWorkspace` hook for workspace name display
  - Nav items with lucide-react icons:
    - Inbox (Home icon) → `/app`
    - Analytics (BarChart3 icon) → `/app/analytics`
    - Settings (Settings icon) → `/app/settings`
  - Active item highlighted with amber accent (bg-accent text-accent-foreground or bg-primary/10 text-primary)
  - Use `useLocation` from `react-router` to determine active item
  - Bottom section: Clerk `<UserButton />` component with user name
  - Workspace name displayed at top of sidebar
  - Layout: flex flex-col h-full, nav items in middle, user at bottom
  - Width: w-64, border-r, bg-sidebar
  - For mobile: will be hidden (responsive handled in AppLayout)
- [ ] Create `web/src/client/components/Toaster.tsx`:
  - Simple wrapper that exports `<Toaster />` from `sonner` with amber theme config
  - Position: bottom-right
  - Theme: auto (follows light/dark)

### Batch 2: Pages (4 coders in parallel — after Batch 1 installs sonner and creates hooks/components)

#### Coder F: AppLayout with real Sidebar + Toaster

**Files (exclusive):** `web/src/client/pages/AppLayout.tsx`

- [ ] Rewrite `web/src/client/pages/AppLayout.tsx`:
  - Import and use `<Sidebar />` component (replacing placeholder)
  - Import and render `<Toaster />` at root level
  - Auth guard: if `!isLoaded` show loading skeleton, if `!isSignedIn` redirect to `/sign-in`
  - Onboarding check: if no workspace in localStorage, show onboarding dialog:
    - Dialog with "Welcome! Let's set up your first workspace"
    - Input for workspace name (default: "My Workspace")
    - "Create" button calls `createWorkspace(clerkToken, name)` from api.ts
    - On success, save workspace to localStorage via `useWorkspace().setWorkspace(id, name)`
    - Dialog closes
  - Layout: `<div className="flex min-h-screen">` with Sidebar + `<main className="flex-1 overflow-auto"><div className="mx-auto max-w-6xl px-4 py-4 md:px-8 md:py-6"><Outlet /></div></main>`
  - Mobile: sidebar hidden by default, hamburger menu button in a top bar

#### Coder G: Inbox Page

**Files (exclusive):** `web/src/client/pages/Inbox.tsx`

- [ ] Rewrite `web/src/client/pages/Inbox.tsx`:
  - Page title: "Questions Inbox" (text-3xl font-bold)
  - Use `useApiKey()` hook to get stored API key
  - Use `useSSE(apiKey)` hook to get real-time questions
  - If no API key: show "Setup required" card directing user to Settings > API Keys
  - If connected, no questions: show empty state — "No pending questions. You're all caught up! 🎉"
  - Filter tabs: "All" | "Pending" | "Completed" — use shadcn Tabs component
  - Render list of QuestionCard components, filtered by selected tab
  - Sort: most recent first (already sorted by SSE stream)
  - Click on QuestionCard → `navigate(\`/app/questions/${q.id}\`)`
  - Show connection status indicator (green dot if connected, red if error)
  - Loading state: skeleton cards while connecting
  - Use `useNavigate` from `react-router`

#### Coder H: QuestionDetail Page

**Files (exclusive):** `web/src/client/pages/QuestionDetail.tsx`

- [ ] Rewrite `web/src/client/pages/QuestionDetail.tsx`:
  - Get question ID from `useParams().id`
  - Use `useApiKey()` to get API key for fetch
  - Fetch question via `getQuestion(apiKey, id)` from api.ts on mount (useEffect)
  - Show loading skeleton while fetching
  - Show error state if question not found or API key missing
  - Display: Back button "← Back to Inbox" (Link to `/app`)
  - Header: "Question #1 of {N}: {title}" + status badge + relative time
  - For each sub-question in `question.questions` array:
    - Show prompt text (support markdown-ish: just paragraphs for now)
    - Render `<AnswerForm />` component for that sub-question
  - Already answered sub-questions: show answer summary (selectedOption or customText), disabled form
  - On answer submit: call `submitAnswer(apiKey, questionId, data)` from api.ts
  - On success: show toast "Answer submitted!", refresh question data
  - On reject: call same endpoint with `{ questionIndex, rejected: true, rejectionReason }`
  - Handle multi-question flows: show all sub-questions, track which are answered
  - Error handling: toast on failure, re-enable form

#### Coder I: Settings Page (all 3 tabs)

**Files (exclusive):** `web/src/client/pages/Settings.tsx`

- [ ] Rewrite `web/src/client/pages/Settings.tsx`:
  - Page title: "Settings" (text-3xl font-bold)
  - Use shadcn Tabs with 3 tabs: "General", "API Keys", "Notifications"

  **General Tab:**
  - Show workspace name with "Rename" button
  - Rename: inline edit with save button, calls `updateWorkspace` (needs API key)
  - Show current user email from Clerk `useUser()`
  - Danger zone separator: "Delete workspace" button (destructive variant) with confirmation dialog

  **API Keys Tab:**
  - List API keys: fetch via `listApiKeys(clerkToken, workspaceId)` on mount
  - Table layout: Name | Created (formatted date) | Last Used | Actions
  - Actions: dropdown menu with "Revoke" option
  - Revoke: confirmation dialog "Are you sure? Active sessions will be interrupted." → calls `revokeApiKey()`
  - "Create New API Key" button at top
  - Create flow: Dialog with name input → calls `createApiKey(clerkToken, workspaceId, name)`
  - On success: show rawKey in copy-once dialog with warning "Copy this key now — it won't be shown again"
  - Copy button uses `navigator.clipboard.writeText(rawKey)`
  - After closing copy dialog: save rawKey to localStorage via `useApiKey().setApiKey(rawKey)`
  - Toast: "API key created" or "API key revoked"
  - Empty state: "No API keys yet" + create button
  - Use `asChild` on DialogTrigger to avoid button-in-button nesting (lesson #4)

  **Notifications Tab:**
  - Simple "Push notifications" toggle (disabled, with "Coming soon" label)
  - Future: integrate with push subscribe/unsubscribe endpoints

---

## Parallelization Plan

### Batch 1 (parallel — 5 coders, no file overlap)

- [ ] Coder A: API client + install sonner → files: `web/src/client/lib/api.ts` + npm install
- [ ] Coder B: useSSE + useWorkspace hooks → files: `web/src/client/hooks/useSSE.ts`, `web/src/client/hooks/useWorkspace.ts`
- [ ] Coder C: useApiKey hook + QuestionCard → files: `web/src/client/hooks/useApiKey.ts`, `web/src/client/components/QuestionCard.tsx`
- [ ] Coder D: AnswerForm component → files: `web/src/client/components/AnswerForm.tsx`
- [ ] Coder E: Sidebar + Toaster → files: `web/src/client/components/Sidebar.tsx`, `web/src/client/components/Toaster.tsx`

### Batch 2 (parallel — 4 coders, after Batch 1)

- [ ] Coder F: AppLayout → files: `web/src/client/pages/AppLayout.tsx`
- [ ] Coder G: Inbox page → files: `web/src/client/pages/Inbox.tsx`
- [ ] Coder H: QuestionDetail page → files: `web/src/client/pages/QuestionDetail.tsx`
- [ ] Coder I: Settings page → files: `web/src/client/pages/Settings.tsx`

### Batch 3 (sequential — fix TypeScript errors, verify)

- [ ] Run `tsc --noEmit`, fix any type errors
- [ ] Boot dev server, verify all pages render
- [ ] Test end-to-end: Settings → create API key → localStorage saved → Inbox SSE connects

### Dependencies

- Batch 2 depends on Batch 1 because:
  - Pages import `api.ts` (Coder A)
  - Pages import `useSSE`, `useApiKey`, `useWorkspace` hooks (Coders B, C)
  - Pages import `QuestionCard`, `AnswerForm`, `Sidebar`, `Toaster` (Coders C, D, E)
  - `sonner` must be installed (Coder A) before Toaster and pages can import it
- Batch 3 depends on Batch 2 because it verifies the final integrated result

### Risk Areas

- **Auth token passing**: Clerk JWT vs API key — each page/component must use the correct auth type
- **SSE reconnection**: EventSource errors can cascade; ensure cleanup on unmount
- **Sonner import**: Must be installed before Batch 2 coders reference it
- **Type imports**: Coders B/C/D define custom types (QuestionWithParsed, SubQuestion) that pages need — use re-exports or define in shared/types.ts

---

## Done Criteria

- [ ] `tsc --noEmit` passes with zero errors
- [ ] Dev server boots without errors
- [ ] AppLayout renders Sidebar with nav items, active highlighting works
- [ ] Sidebar shows Clerk user avatar/name
- [ ] Inbox page shows "Setup required" when no API key in localStorage
- [ ] Settings > API Keys > Create Key shows copy-once dialog with raw key
- [ ] After creating key, Inbox SSE connects (green indicator)
- [ ] Empty inbox shows "You're all caught up!" message
- [ ] QuestionDetail page loads question data and renders AnswerForm
- [ ] AnswerForm renders radio/checkbox/textarea based on question type
- [ ] Settings General tab shows workspace name
- [ ] Toast notifications appear for create/revoke/submit actions
- [ ] Filter tabs on Inbox work (All / Pending / Completed)
