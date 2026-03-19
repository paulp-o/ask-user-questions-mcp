---
created: 2026-03-17T12:30:00Z
last_updated: 2026-03-17T13:00:00Z
type: spec
change_id: auq-web-platform
plan_number: 1
status: done
trigger: "Phase 1 — Foundation + DB + Auth: scaffold web/ directory with bootable Hono+React dev server"
depends_on: "none"
next: "002_core-api-endpoints.md"
---

# Plan: Phase 1 — Foundation + DB Schema + Auth Middleware

## Background & Research

### Architecture Overview

This is a greenfield build. The `web/` directory does not exist. We're creating a full-stack monolith:

- **Backend:** Hono API server deployed as Vercel serverless function
- **Frontend:** React SPA with Vite, served from same domain
- **Dev:** `@hono/vite-dev-server` runs Hono alongside Vite HMR — no proxy needed
- **Auth:** Clerk for user auth (JWT), Bearer API keys for agent auth (SHA-256 hash)
- **DB:** SQLite via Turso/libsql + Drizzle ORM

### Key Packages & Versions

```json
{
  "dependencies": {
    "hono": "^4.0.0",
    "@hono/node-server": "^1.14.0",
    "@clerk/react-router": "^1.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router": "^7.13.0",
    "drizzle-orm": "^0.45.0",
    "@libsql/client": "^0.14.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^3.0.0",
    "class-variance-authority": "^0.7.0",
    "lucide-react": "^0.500.0"
  },
  "devDependencies": {
    "@hono/vite-dev-server": "^0.19.0",
    "@vitejs/plugin-react": "^4.5.0",
    "vite": "^6.0.0",
    "typescript": "^5.7.0",
    "drizzle-kit": "^0.31.0",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/vite": "^4.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0"
  }
}
```

### Vite Config Pattern (Hono + React SPA)

```typescript
// web/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import devServer from "@hono/vite-dev-server";
import path from "path";

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    ...(mode !== "client" ? [devServer({ entry: "src/server/index.ts" })] : []),
  ],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src/client") },
  },
  build: {
    rollupOptions: { input: "./index.html" },
  },
}));
```

### Drizzle Config

```typescript
// web/drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: "./src/server/db/schema.ts",
  dialect: "turso",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL || "file:./local.db",
    authToken: process.env.TURSO_AUTH_TOKEN || "",
  },
});
```

### DB Schema (5 tables, adapted for Clerk — no user/session/account tables)

```typescript
// web/src/server/db/schema.ts
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

const timestamp = () =>
  integer("createdAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`);

export const workspaces = sqliteTable("workspaces", {
  id: text("id").primaryKey(), // nanoid
  clerkUserId: text("clerkUserId").notNull(),
  name: text("name").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const apiKeys = sqliteTable(
  "api_keys",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspaceId")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    keyHash: text("keyHash").notNull().unique(),
    keyPrefix: text("keyPrefix").notNull(), // "auq_xxxx" for display
    name: text("name").notNull(),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    expiresAt: integer("expiresAt", { mode: "timestamp" }),
    lastUsedAt: integer("lastUsedAt", { mode: "timestamp" }),
  },
  (table) => [
    index("idx_api_keys_workspace_id").on(table.workspaceId),
    index("idx_api_keys_key_hash").on(table.keyHash),
  ],
);

export const questions = sqliteTable(
  "questions",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspaceId")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    status: text("status", {
      enum: [
        "pending",
        "in_progress",
        "completed",
        "rejected",
        "timed_out",
        "abandoned",
      ],
    })
      .notNull()
      .default("pending"),
    title: text("title"),
    questionsJson: text("questionsJson").notNull(), // JSON string array
    createdAt: integer("createdAt", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updatedAt", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    timeoutAt: integer("timeoutAt", { mode: "timestamp" }),
  },
  (table) => [
    index("idx_questions_workspace_id").on(table.workspaceId),
    index("idx_questions_status").on(table.status),
    index("idx_questions_created_at").on(table.createdAt),
  ],
);

export const answers = sqliteTable(
  "answers",
  {
    id: text("id").primaryKey(),
    questionId: text("questionId")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    questionIndex: integer("questionIndex").notNull(),
    selectedOption: text("selectedOption"),
    selectedOptionsJson: text("selectedOptionsJson"), // JSON array for multi-select
    customText: text("customText"),
    rejected: integer("rejected", { mode: "boolean" }).default(false),
    rejectionReason: text("rejectionReason"),
    answeredAt: integer("answeredAt", { mode: "timestamp" }).notNull(),
  },
  (table) => [index("idx_answers_question_id").on(table.questionId)],
);

export const pushSubscriptions = sqliteTable(
  "push_subscriptions",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspaceId")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull().unique(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    userAgent: text("userAgent"),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    lastUsedAt: integer("lastUsedAt", { mode: "timestamp" }),
  },
  (table) => [
    index("idx_push_subscriptions_workspace_id").on(table.workspaceId),
  ],
);
```

### DB Client Initialization

```typescript
// web/src/server/db/index.ts
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || "file:./local.db",
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});

export const db = drizzle(client, { schema });
export type Database = typeof db;
```

### Hono Server Entry Point

```typescript
// web/src/server/index.ts
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

const app = new Hono();

app.use("*", logger());
app.use(
  "/api/*",
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

app.get("/api/health", (c) => c.json({ status: "ok", timestamp: Date.now() }));

// Route groups will be added in Phase 2
// app.route("/api/v1/workspaces", workspacesRouter);
// etc.

export default app;
```

### Auth Middleware (Two modes)

```typescript
// web/src/server/middleware/auth.ts
import { createMiddleware } from "hono/factory";
import { createHash } from "node:crypto";
import { db } from "../db";
import { apiKeys } from "../db/schema";
import { eq } from "drizzle-orm";

// SHA-256 hash helper
function hashKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

// Bearer API key auth — for MCP agent requests
export const bearerAuth = createMiddleware(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Missing or invalid Authorization header" }, 401);
  }
  const rawKey = authHeader.slice(7);
  const keyHash = hashKey(rawKey);

  const [key] = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.keyHash, keyHash))
    .limit(1);

  if (!key) {
    return c.json({ error: "Invalid API key" }, 401);
  }
  if (key.expiresAt && key.expiresAt < new Date()) {
    return c.json({ error: "API key expired" }, 401);
  }

  // Update lastUsedAt
  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, key.id));

  c.set("workspaceId", key.workspaceId);
  c.set("apiKeyId", key.id);
  await next();
});

// Clerk JWT auth — for browser/frontend requests
export const clerkAuth = createMiddleware(async (c, next) => {
  // In Phase 1, this is a placeholder.
  // Full Clerk JWT verification will use @clerk/backend verifyToken()
  // For now, extract userId from the Authorization Bearer JWT.
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  // TODO Phase 2: Verify JWT with Clerk backend SDK
  // const token = authHeader.slice(7);
  // const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
  // c.set("clerkUserId", payload.sub);
  await next();
});
```

### Clerk + React Router Setup

```tsx
// web/src/client/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { ClerkProvider } from "@clerk/react-router";
import { router } from "./router";
import "./styles/globals.css";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!PUBLISHABLE_KEY) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY env variable");
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      routerPush={(to) => router.navigate(to)}
      routerReplace={(to) => router.navigate(to, { replace: true })}
      signInFallbackRedirectUrl="/app"
      signUpFallbackRedirectUrl="/app"
    >
      <RouterProvider router={router} />
    </ClerkProvider>
  </StrictMode>,
);
```

### Router Config

```tsx
// web/src/client/router.tsx
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

### CSS Theme (Tailwind v4 + shadcn/ui amber theme)

```css
/* web/src/client/styles/globals.css */
@import "tailwindcss";

@theme {
  --color-primary: hsl(38 92% 50%);
  --color-primary-foreground: hsl(0 0% 100%);
  --color-background: hsl(0 0% 100%);
  --color-foreground: hsl(222 47% 11%);
  --color-card: hsl(0 0% 100%);
  --color-card-foreground: hsl(222 47% 11%);
  --color-muted: hsl(210 40% 96%);
  --color-muted-foreground: hsl(215 16% 47%);
  --color-secondary: hsl(210 40% 96%);
  --color-secondary-foreground: hsl(222 47% 11%);
  --color-accent: hsl(210 40% 96%);
  --color-accent-foreground: hsl(222 47% 11%);
  --color-border: hsl(214 32% 91%);
  --color-input: hsl(214 32% 91%);
  --color-ring: hsl(38 92% 50%);
  --color-destructive: hsl(0 72% 51%);
  --color-destructive-foreground: hsl(0 0% 98%);
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;
}

/* Dark mode overrides */
.dark {
  --color-background: hsl(222 47% 6%);
  --color-foreground: hsl(210 40% 98%);
  --color-card: hsl(222 47% 9%);
  --color-card-foreground: hsl(210 40% 98%);
  --color-muted: hsl(217 33% 12%);
  --color-muted-foreground: hsl(215 20% 65%);
  --color-secondary: hsl(217 33% 17%);
  --color-secondary-foreground: hsl(210 40% 98%);
  --color-accent: hsl(217 33% 17%);
  --color-accent-foreground: hsl(210 40% 98%);
  --color-border: hsl(217 33% 17%);
  --color-input: hsl(217 33% 17%);
  --color-destructive: hsl(0 62% 31%);
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground font-sans antialiased;
  }
}
```

### shadcn utils

```typescript
// web/src/client/lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### Route Page Stub Pattern

Every stub page follows this exact pattern (using named export + `Component` for lazy loading):

```tsx
// web/src/client/pages/Inbox.tsx
export function Component() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Inbox</h1>
      <p className="text-muted-foreground">Coming in Phase 3</p>
    </div>
  );
}
```

### Critical Lessons (MUST follow)

1. **API path match**: Every frontend fetch MUST match actual Hono route file
2. **SSE parsing**: generic `onmessage` → `JSON.parse(event.data)` → `{ type, data }`
3. **API key rawKey**: Only returned on POST create — save to localStorage immediately
4. **No button nesting**: Don't put `<Button>` inside `<DialogTrigger>` — use `asChild`
5. **questionsJson**: DB stores as JSON string, parse on read
6. **submitAnswer response**: Returns `{ success: true }`, NOT the question object
7. **Verify routes**: Before writing any frontend API call, check actual route file

---

## Testing Plan (TDD - tests first)

> Phase 1 is scaffolding — tests are deferred to Phase 2 when API endpoints exist.
> The "test" for Phase 1 is: dev server boots, health endpoint responds, TypeScript compiles.

- [ ] Verification: `tsc --noEmit` passes in web/ directory
- [ ] Verification: `vite dev` starts without errors
- [ ] Verification: `GET /api/health` returns `{ status: "ok" }`
- [ ] Verification: React app renders at `http://localhost:5173/`
- [ ] Verification: `drizzle-kit push` creates all 5 tables in local.db

---

## Implementation Plan

### Batch 1: All source files (6 coders in parallel, ~8 min)

- [ ] **Coder A** — Project config files
- [ ] **Coder B** — Build & TypeScript config
- [ ] **Coder C** — Database schema & client
- [ ] **Coder D** — Server core & auth middleware
- [ ] **Coder E** — React client skeleton (all pages)
- [ ] **Coder F** — Styles, utils & constants

### Batch 2: Install & initialize (sequential, ~4 min)

- [ ] Run `npm install` in web/ directory
- [ ] Run `npx shadcn@latest init -d` to initialize shadcn (may need to merge globals.css)
- [ ] Run `npx shadcn@latest add button card input dialog badge tabs -y` to add base components
- [ ] Run `npx drizzle-kit push` to create tables in local.db
- [ ] Verify: `npx tsc --noEmit`
- [ ] Verify: start dev server and test `/api/health`

---

## Parallelization Plan

### Batch 1 (parallel — 6 coders)

#### Coder A: Project Config Files

**Files:** `web/package.json`, `web/index.html`, `web/.env.example`, `web/vercel.json`, `web/components.json`

- [ ] Create `web/package.json` with all dependencies listed in Background & Research, scripts: `"dev": "vite"`, `"build": "vite build --mode client && vite build"`, `"preview": "vite preview"`, `"typecheck": "tsc --noEmit"`, `"db:push": "drizzle-kit push"`, `"db:generate": "drizzle-kit generate"`, `"db:studio": "drizzle-kit studio"`. Set `"type": "module"`, `"private": true`.
- [ ] Create `web/index.html` — standard Vite React entry: `<!DOCTYPE html>` with `<div id="root">`, `<script type="module" src="/src/client/main.tsx">`, charset/viewport meta, title "AUQ – Ask User Questions"
- [ ] Create `web/.env.example` with these vars (no values): `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `TURSO_DATABASE_URL=file:./local.db`, `TURSO_AUTH_TOKEN=`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `CORS_ORIGIN=http://localhost:5173`
- [ ] Create `web/vercel.json`: `{ "rewrites": [{ "source": "/api/(.*)", "destination": "/api" }, { "source": "/((?!assets/).*)", "destination": "/index.html" }] }`
- [ ] Create `web/components.json` for shadcn/ui: `{ "$schema": "https://ui.shadcn.com/schema.json", "style": "default", "rsc": false, "tsx": true, "tailwind": { "config": "", "css": "src/client/styles/globals.css", "baseColor": "slate", "cssVariables": true }, "aliases": { "components": "@/components", "utils": "@/lib/utils", "ui": "@/components/ui", "lib": "@/lib", "hooks": "@/hooks" } }`

#### Coder B: Build & TypeScript Config

**Files:** `web/vite.config.ts`, `web/tsconfig.json`, `web/tsconfig.node.json`, `web/drizzle.config.ts`

- [ ] Create `web/vite.config.ts` — exactly as shown in Background & Research section. Uses `@vitejs/plugin-react`, `@tailwindcss/vite`, `@hono/vite-dev-server` with entry `src/server/index.ts`. Path alias `@` → `src/client`.
- [ ] Create `web/tsconfig.json` — target: ES2022, module: ESNext, moduleResolution: bundler, jsx: react-jsx, strict: true, paths: `{ "@/*": ["./src/client/*"] }`, include: `["src"]`, references to tsconfig.node.json
- [ ] Create `web/tsconfig.node.json` — for vite.config.ts and drizzle.config.ts: target ES2022, module ESNext, include: `["vite.config.ts", "drizzle.config.ts"]`
- [ ] Create `web/drizzle.config.ts` — exactly as shown in Background & Research section. dialect: "turso", schema: "./src/server/db/schema.ts", out: "./drizzle"

#### Coder C: Database Schema & Client

**Files:** `web/src/server/db/schema.ts`, `web/src/server/db/index.ts`, `web/src/shared/types.ts`

- [ ] Create `web/src/server/db/schema.ts` — all 5 tables exactly as shown in Background & Research: `workspaces`, `apiKeys`, `questions`, `answers`, `pushSubscriptions`. Include all indexes. Use `text("id").primaryKey()` (nanoid will be generated in route handlers). Column names: use camelCase in Drizzle but the DB column names should be camelCase too (Drizzle default).
- [ ] Create `web/src/server/db/index.ts` — Drizzle client initialization with `@libsql/client` as shown in Background & Research. Import and pass `* as schema` to `drizzle()` for relational queries.
- [ ] Create `web/src/shared/types.ts` — export TypeScript types: `QuestionStatus = "pending" | "in_progress" | "completed" | "rejected" | "timed_out" | "abandoned"`, type `Workspace`, `ApiKey`, `Question`, `Answer`, `PushSubscription` matching the DB schema columns. Also export `InferSelectModel` types from schema using `typeof schema.workspaces.$inferSelect` etc.

#### Coder D: Server Core & Auth Middleware

**Files:** `web/src/server/index.ts`, `web/src/server/middleware/auth.ts`

- [ ] Create `web/src/server/middleware/auth.ts` — exactly as shown in Background & Research. Two middlewares: `bearerAuth` (SHA-256 hash lookup in api_keys table, check expiry, update lastUsedAt, set workspaceId on context) and `clerkAuth` (placeholder — extract token, TODO for Phase 2 Clerk backend verification, set clerkUserId on context). Export `hashKey` function for reuse. Use `createMiddleware` from `hono/factory`.
- [ ] Create `web/src/server/index.ts` — exactly as shown in Background & Research. Import `hono`, `hono/cors`, `hono/logger`. Set up CORS for `/api/*` with configurable origin. Add `GET /api/health` returning `{ status: "ok", timestamp: Date.now() }`. Add commented-out route group imports for Phase 2. Export `app` as default.

#### Coder E: React Client Skeleton (All Pages)

**Files:** `web/src/client/main.tsx`, `web/src/client/router.tsx`, `web/src/client/App.tsx`, `web/src/client/pages/Landing.tsx`, `web/src/client/pages/SignIn.tsx`, `web/src/client/pages/SignUp.tsx`, `web/src/client/pages/AppLayout.tsx`, `web/src/client/pages/Inbox.tsx`, `web/src/client/pages/QuestionDetail.tsx`, `web/src/client/pages/Analytics.tsx`, `web/src/client/pages/Settings.tsx`

- [ ] Create `web/src/client/main.tsx` — exactly as shown in Background & Research. `ClerkProvider` wraps `RouterProvider`. Import `router` from `./router`. Import `./styles/globals.css`.
- [ ] Create `web/src/client/router.tsx` — exactly as shown in Background & Research. Use `createBrowserRouter` with lazy-loaded routes. Routes: `/` (Landing), `/sign-in/*` (SignIn), `/sign-up/*` (SignUp), `/app` (AppLayout with children: index→Inbox, `questions/:id`→QuestionDetail, `analytics`→Analytics, `settings`→Settings).
- [ ] Create `web/src/client/App.tsx` — simple root component: `import { Outlet } from "react-router"; export default function App() { return <Outlet />; }` (used if needed as root layout)
- [ ] Create `web/src/client/pages/Landing.tsx` — stub: `export function Component() { return <div className="flex min-h-screen items-center justify-center"><div className="text-center"><h1 className="text-4xl font-bold">AUQ</h1><p className="mt-2 text-muted-foreground">Ask User Questions</p></div></div>; }` — note: exports named `Component` for React Router lazy loading
- [ ] Create `web/src/client/pages/SignIn.tsx` — `import { SignIn } from "@clerk/react-router"; export function Component() { return <div className="flex min-h-screen items-center justify-center"><SignIn /></div>; }`
- [ ] Create `web/src/client/pages/SignUp.tsx` — `import { SignUp } from "@clerk/react-router"; export function Component() { return <div className="flex min-h-screen items-center justify-center"><SignUp /></div>; }`
- [ ] Create `web/src/client/pages/AppLayout.tsx` — stub with `<Outlet />`: protected route wrapper. Import `useAuth` from `@clerk/react-router`, check `isSignedIn`, redirect to `/sign-in` if not. Render `<div className="flex min-h-screen"><aside className="w-64 border-r p-4">Sidebar placeholder</aside><main className="flex-1"><Outlet /></main></div>`.
- [ ] Create stub pages (Inbox, QuestionDetail, Analytics, Settings) — each exports `function Component()` with a heading and "Coming in Phase 3" placeholder text. Use `className="p-6"` wrapper, `text-2xl font-bold` heading.

#### Coder F: Styles, Utils & Constants

**Files:** `web/src/client/styles/globals.css`, `web/src/client/lib/utils.ts`, `web/src/client/lib/constants.ts`

- [ ] Create `web/src/client/styles/globals.css` — exactly as shown in Background & Research. Includes `@import "tailwindcss"`, `@theme { }` block with all color variables (primary amber, background, foreground, card, muted, secondary, accent, border, input, ring, destructive + radii), `.dark` overrides, and `@layer base` with border/body styles.
- [ ] Create `web/src/client/lib/utils.ts` — exactly as shown in Background & Research: `cn()` function using `clsx` + `twMerge`.
- [ ] Create `web/src/client/lib/constants.ts` — export `API_BASE = "/api/v1"`, `APP_NAME = "AUQ"`, `APP_DESCRIPTION = "Ask User Questions"`, `QUESTION_STATUSES` object mapping status to label/color.

### Batch 2 (sequential — after all Batch 1 coders complete)

- [ ] Run `cd web && npm install` — install all dependencies
- [ ] Run `npx shadcn@latest init -d` in web/ — if it conflicts with existing globals.css, prefer our custom theme (re-apply after init if needed)
- [ ] Run `npx shadcn@latest add button card input dialog badge tabs separator dropdown-menu -y` — adds UI component files to `src/client/components/ui/`
- [ ] Run `npx drizzle-kit push` in web/ — creates all 5 tables + indexes in local.db
- [ ] Run `npx tsc --noEmit` — verify TypeScript compiles cleanly; fix any type errors
- [ ] Start dev server with `npm run dev`, verify `GET http://localhost:5173/api/health` returns `{ status: "ok" }` and React app renders at root

### Dependencies

Batch 1 coders are fully independent — no coder reads or writes another coder's files. The directory structure ensures zero conflicts:

- Coder A: `web/` root config files only (no src/)
- Coder B: `web/` root build config files only (no src/)
- Coder C: `web/src/server/db/` + `web/src/shared/`
- Coder D: `web/src/server/index.ts` + `web/src/server/middleware/`
- Coder E: `web/src/client/main.tsx` + `web/src/client/router.tsx` + `web/src/client/App.tsx` + `web/src/client/pages/`
- Coder F: `web/src/client/styles/` + `web/src/client/lib/`

Batch 2 is sequential because npm install must complete before shadcn CLI runs, and drizzle-kit push needs the schema file from Batch 1 Coder C.

### Risk Areas

1. **shadcn init vs custom globals.css conflict**: shadcn init may overwrite globals.css. Mitigation: run shadcn init first, then re-apply our custom theme vars, OR skip `shadcn init` and just run `shadcn add` directly (components.json already exists from Coder A).
2. **Tailwind v4 + shadcn compatibility**: shadcn/ui may not fully support Tailwind v4's CSS-first config yet. Mitigation: if `@theme` doesn't work, fall back to `tailwind.config.ts` with Tailwind v3. Check shadcn docs first.
3. **@clerk/react-router in SPA mode**: The package is designed for React Router v7 framework mode. In pure SPA (declarative) mode, `routerPush`/`routerReplace` props on `<ClerkProvider>` are required. If this doesn't work, fall back to `@clerk/clerk-react`.
4. **@hono/vite-dev-server version**: The dev server plugin API may have changed. If `devServer({ entry })` doesn't work, check for updated import path.
5. **Drizzle turso dialect**: If `dialect: "turso"` isn't recognized, use `dialect: "sqlite"` with `driver: "turso"` in drizzle.config.ts.

---

## Done Criteria

- [ ] `web/` directory exists with complete project structure (~30+ files)
- [ ] `npm install` completes without errors in web/
- [ ] `tsc --noEmit` passes (zero type errors)
- [ ] `npm run dev` starts Vite + Hono dev server
- [ ] `GET /api/health` returns `{ status: "ok", timestamp: <number> }`
- [ ] React app renders at `http://localhost:5173/` (Landing page stub)
- [ ] Clerk sign-in page renders at `/sign-in` (may show Clerk UI or error if no key configured)
- [ ] `local.db` file exists with 5 tables (workspaces, api_keys, questions, answers, push_subscriptions)
- [ ] shadcn/ui components available in `src/client/components/ui/` (button, card, input, dialog, badge, tabs)
- [ ] All route stubs render without errors when navigated to
