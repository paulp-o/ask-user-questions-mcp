---
created: 2026-03-17T13:45:00Z
last_updated: 2026-03-17T14:00:00Z
type: spec
change_id: auq-web-platform
plan_number: 2
status: done
trigger: "Phase 2 — Implement all 15 API endpoints with Zod validation, SSE streaming, and wire into Hono server"
depends_on: "001_foundation-db-auth.md"
next: "003_frontend-pages.md"
---

# Plan: Phase 2 — Core API Endpoints (15 endpoints)

## Background & Research

### Current Server State

File: `web/src/server/index.ts` (full content):

```typescript
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
// import workspacesRouter from "./routes/workspaces";
// import apiKeysRouter from "./routes/api-keys";
// import questionsRouter from "./routes/questions";
// import answersRouter from "./routes/answers";
// import analyticsRouter from "./routes/analytics";
// import pushRouter from "./routes/push";
// app.route("/api/v1/workspaces", workspacesRouter);
// app.route("/api/v1/api-keys", apiKeysRouter);
// app.route("/api/v1/questions", questionsRouter);
// app.route("/api/v1/answers", answersRouter);
// app.route("/api/v1/analytics", analyticsRouter);
// app.route("/api/v1/push", pushRouter);

export default app;
```

### Auth Middleware (already implemented)

File: `web/src/server/middleware/auth.ts` (full content):

```typescript
import { createMiddleware } from "hono/factory";
import { createHash } from "node:crypto";
import { db } from "../db";
import { apiKeys } from "../db/schema";
import { eq } from "drizzle-orm";

// SHA-256 hash helper
export function hashKey(raw: string): string {
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

**CRITICAL: clerkAuth must be upgraded in Phase 2.** Install `@clerk/backend` and use `verifyToken()` to extract `sub` claim (the Clerk userId). Set `c.set("clerkUserId", payload.sub)`.

### DB Schema (5 tables — all created)

File: `web/src/server/db/schema.ts`:

```typescript
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const workspaces = sqliteTable("workspaces", {
  id: text("id").primaryKey(),
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
    keyPrefix: text("keyPrefix").notNull(),
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
    questionsJson: text("questionsJson").notNull(), // JSON string
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
    selectedOptionsJson: text("selectedOptionsJson"), // JSON array
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

### DB Client

File: `web/src/server/db/index.ts`:

```typescript
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

### Shared Types

File: `web/src/shared/types.ts`:

```typescript
import * as schema from "../server/db/schema";

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
```

### Missing Dependencies (must install)

Current `web/package.json` does NOT have: `zod`, `nanoid`, `@clerk/backend`, `web-push`, `@types/web-push`.

### Route File Structure

`web/src/server/routes/` directory does NOT exist. All 6 route files must be created from scratch.

### API Endpoint Table (15 endpoints from PRD §6)

| #   | Method | Path                               | Auth        | Route File    | Purpose                |
| --- | ------ | ---------------------------------- | ----------- | ------------- | ---------------------- |
| 1   | POST   | /api/v1/workspaces                 | Clerk JWT   | workspaces.ts | Create workspace       |
| 2   | GET    | /api/v1/workspaces/:id             | Bearer key  | workspaces.ts | Get workspace          |
| 3   | PATCH  | /api/v1/workspaces/:id             | Bearer key  | workspaces.ts | Update workspace       |
| 4   | POST   | /api/v1/workspaces/:id/keys        | Clerk JWT   | apiKeys.ts    | Create API key         |
| 5   | GET    | /api/v1/workspaces/:id/keys        | Clerk JWT   | apiKeys.ts    | List API keys (masked) |
| 6   | DELETE | /api/v1/workspaces/:id/keys/:keyId | Clerk JWT   | apiKeys.ts    | Revoke API key         |
| 7   | POST   | /api/v1/questions                  | Bearer key  | questions.ts  | Create question        |
| 8   | GET    | /api/v1/questions/:id              | Bearer key  | questions.ts  | Get question + answers |
| 9   | GET    | /api/v1/questions/stream           | query param | questions.ts  | SSE stream             |
| 10  | POST   | /api/v1/questions/:id/answer       | Both        | questions.ts  | Submit answer          |
| 11  | DELETE | /api/v1/questions/:id              | Bearer key  | questions.ts  | Mark abandoned         |
| 12  | GET    | /api/v1/analytics                  | Clerk JWT   | analytics.ts  | Analytics summary      |
| 13  | GET    | /api/v1/push/vapid-key             | None        | push.ts       | Get VAPID public key   |
| 14  | POST   | /api/v1/push/subscribe             | Clerk JWT   | push.ts       | Subscribe to push      |
| 15  | POST   | /api/v1/push/unsubscribe           | Clerk JWT   | push.ts       | Unsubscribe from push  |

### Hono streamSSE Pattern

```typescript
import { streamSSE } from "hono/streaming";

// SSE endpoint pattern
app.get("/stream", async (c) => {
  return streamSSE(c, async (stream) => {
    // Send initial data
    await stream.writeSSE({ data: JSON.stringify({ type: "connected" }), event: "message", id: "0" });

    // Polling loop
    while (true) {
      // Query DB for new questions
      const newQuestions = await db.select()...;
      for (const q of newQuestions) {
        await stream.writeSSE({
          data: JSON.stringify({ type: "question:created", data: q }),
          event: "message",
          id: q.id,
        });
      }

      // Keep-alive
      await stream.writeSSE({ data: JSON.stringify({ type: "keep-alive" }), event: "message", id: String(Date.now()) });
      await stream.sleep(5000); // Poll every 5 seconds
    }
  });
});
```

**CRITICAL SSE LESSON:** Use generic `event: "message"` (which triggers `onmessage` on client), NOT named events like `event: "question:created"`. The type field goes INSIDE the JSON data payload: `{ type: "question:created", data: {...} }`.

### API Key Generation Pattern

```typescript
import { randomBytes, createHash } from "node:crypto";

function generateApiKey(): {
  rawKey: string;
  keyHash: string;
  keyPrefix: string;
} {
  const bytes = randomBytes(32);
  const rawKey = "auq_" + bytes.toString("hex"); // auq_ + 64 hex chars = 68 chars total
  const keyHash = createHash("sha256").update(rawKey).digest("hex");
  const keyPrefix = rawKey.slice(0, 8) + "..." + rawKey.slice(-4); // "auq_abcd...ef12"
  return { rawKey, keyHash, keyPrefix };
}
```

### Submit Answer Response

**CRITICAL:** The phases overview says `{ success: true }`, but PRD §6.4 says:

```json
{
  "id": "ans_def456...",
  "questionId": "ques_abc123...",
  "questionIndex": 0,
  "answeredAt": "2026-03-17T10:35:00Z"
}
```

**Follow the PRD spec** — return the answer object, not just `{ success: true }`. The "lesson" about `{ success: true }` is outdated per the actual PRD.

### Route Mounting Pattern

The commented imports in index.ts show the expected pattern:

```typescript
// Correct mounting (PRD paths):
app.route("/api/v1/workspaces", workspacesRouter); // handles /, /:id, /:id/keys, etc.
app.route("/api/v1/questions", questionsRouter); // handles /, /:id, /stream, /:id/answer
app.route("/api/v1/analytics", analyticsRouter); // handles /
app.route("/api/v1/push", pushRouter); // handles /vapid-key, /subscribe, /unsubscribe
```

Note: API keys routes are NESTED under workspaces (`:id/keys`), so they go in the workspaces router OR a separate sub-router. The commented code shows a separate `apiKeysRouter` mounted at `/api/v1/api-keys` — but PRD paths are `/api/v1/workspaces/:id/keys`. **Use the PRD path.** Mount api key routes inside the workspaces router file.

### Clerk Backend JWT Verification Pattern

```typescript
import { verifyToken } from "@clerk/backend";

const token = authHeader.slice(7);
const payload = await verifyToken(token, {
  secretKey: process.env.CLERK_SECRET_KEY!,
});
// payload.sub is the Clerk userId
c.set("clerkUserId", payload.sub);
```

---

## Testing Plan (TDD - tests first)

> Phase 2 tests are manual curl-based verification since the plan is for 15min and setting up vitest+supertest would consume the entire budget. Automated tests come in a follow-up.

- [ ] After all routes implemented: `npx tsc --noEmit` passes with zero errors
- [ ] `npm run dev` starts without errors
- [ ] `curl POST /api/v1/workspaces` with mock Clerk header → 201 + workspace object
- [ ] `curl POST /api/v1/workspaces/:id/keys` → 201 + rawKey returned
- [ ] `curl GET /api/v1/workspaces/:id/keys` → 200 + masked keys list
- [ ] `curl POST /api/v1/questions` with Bearer key → 201 + question created
- [ ] `curl GET /api/v1/questions/:id` → 200 + question + answers
- [ ] `curl GET /api/v1/questions/stream?token=<key>` → SSE stream with keep-alive
- [ ] `curl POST /api/v1/questions/:id/answer` → 200 + answer object
- [ ] `curl GET /api/v1/analytics` → 200 + analytics summary
- [ ] `curl GET /api/v1/push/vapid-key` → 200 + public key (or 501 if not configured)

---

## Implementation Plan

### Pre-requisite: Install missing dependencies

- [ ] Run `npm install zod nanoid @clerk/backend` in web/
- [ ] Run `npm install -D @types/web-push` in web/ (web-push itself deferred to Phase 4 when we implement actual push sending)

### Batch 1: Shared schemas + all 6 route files (5 coders in parallel)

- [ ] **Coder A** — Zod schemas + upgrade clerkAuth middleware
- [ ] **Coder B** — Workspaces routes (3 endpoints) + API Keys routes (3 endpoints)
- [ ] **Coder C** — Questions routes (5 endpoints including SSE + answer)
- [ ] **Coder D** — Analytics route (1 endpoint) + Push routes (3 endpoints)
- [ ] **Coder E** — Wire all routes into server index.ts + update shared types

### Batch 2: Dependency install + verification (sequential)

- [ ] Install dependencies: `npm install zod nanoid @clerk/backend`
- [ ] Run `npx tsc --noEmit` — fix any type errors
- [ ] Start dev server and test health + at least 3 endpoints with curl
- [ ] Test SSE stream endpoint with curl

---

## Parallelization Plan

### Batch 1 (parallel — 5 coders)

#### Coder A: Zod Schemas + Clerk Auth Upgrade

**Files:** `web/src/shared/schemas.ts` (CREATE), `web/src/server/middleware/auth.ts` (EDIT)

- [ ] Create `web/src/shared/schemas.ts` with ALL Zod validation schemas:

  ```typescript
  import { z } from "zod";

  // === Workspace schemas ===
  export const createWorkspaceSchema = z.object({
    name: z.string().min(1).max(100),
  });

  export const updateWorkspaceSchema = z.object({
    name: z.string().min(1).max(100).optional(),
  });

  // === API Key schemas ===
  export const createApiKeySchema = z.object({
    name: z.string().min(1).max(50),
  });

  // === Question schemas ===
  export const createQuestionSchema = z.object({
    title: z.string().max(200).optional(),
    questionsJson: z.array(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        prompt: z.string(),
        type: z.enum(["singleSelect", "multiSelect", "freeText"]),
        options: z
          .array(
            z.object({
              id: z.string(),
              label: z.string(),
              description: z.string().optional(),
            }),
          )
          .optional(),
      }),
    ),
    timeoutMs: z.number().positive().optional(),
  });

  // === Answer schemas ===
  export const submitAnswerSchema = z
    .object({
      questionIndex: z.number().int().min(0),
      selectedOption: z.string().optional(),
      selectedOptions: z.array(z.string()).optional(),
      customText: z.string().optional(),
      rejected: z.boolean().optional(),
      rejectionReason: z.string().optional(),
    })
    .refine(
      (data) =>
        data.selectedOption ||
        data.selectedOptions ||
        data.customText ||
        data.rejected,
      {
        message:
          "Must provide selectedOption, selectedOptions, customText, or rejected",
      },
    );

  // === Push schemas ===
  export const pushSubscribeSchema = z.object({
    subscription: z.object({
      endpoint: z.string().url(),
      keys: z.object({
        p256dh: z.string(),
        auth: z.string(),
      }),
    }),
  });

  export const pushUnsubscribeSchema = z.object({
    endpoint: z.string().url(),
  });

  // === Analytics query schema ===
  export const analyticsQuerySchema = z.object({
    days: z.coerce.number().int().min(1).max(365).default(30),
  });
  ```

- [ ] Upgrade `web/src/server/middleware/auth.ts` — replace the clerkAuth placeholder:
  - Import `verifyToken` from `@clerk/backend`
  - In `clerkAuth`: extract Bearer token, call `verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY! })`, set `c.set("clerkUserId", payload.sub)`
  - Catch errors and return 401
  - Also add a `bearerAuthFromQuery` middleware for SSE: reads `token` query param instead of Authorization header, same SHA-256 lookup logic as `bearerAuth`
  - Export all three: `bearerAuth`, `clerkAuth`, `bearerAuthFromQuery`

#### Coder B: Workspaces + API Keys Routes (6 endpoints)

**Files:** `web/src/server/routes/workspaces.ts` (CREATE)

- [ ] Create `web/src/server/routes/workspaces.ts` as a Hono sub-app with 6 endpoints:

  **Endpoint 1: POST / (Create workspace)** — Auth: `clerkAuth`
  - Validate body with `createWorkspaceSchema`
  - Generate ID with `nanoid()`
  - Get `clerkUserId` from `c.get("clerkUserId")`
  - Insert into `workspaces` table
  - Return 201 with workspace object (id, name, clerkUserId as userId, createdAt, updatedAt)

  **Endpoint 2: GET /:id (Get workspace)** — Auth: `bearerAuth`
  - Get workspace by id from DB
  - Get `workspaceId` from `c.get("workspaceId")` and verify it matches `:id` param (403 if mismatch)
  - Count questions for this workspace
  - Return workspace object with `questionCount`

  **Endpoint 3: PATCH /:id (Update workspace)** — Auth: `bearerAuth`
  - Validate body with `updateWorkspaceSchema`
  - Verify workspace ownership via `c.get("workspaceId")` matching `:id`
  - Update name + updatedAt
  - Return updated workspace

  **Endpoint 4: POST /:id/keys (Create API key)** — Auth: `clerkAuth`
  - Validate body with `createApiKeySchema`
  - Verify user owns workspace: query workspace by id, check `clerkUserId` matches `c.get("clerkUserId")`
  - Generate key: `randomBytes(32).toString("hex")` → prefix with `"auq_"` → SHA-256 hash
  - Store: id (nanoid), workspaceId, keyHash, keyPrefix (`rawKey.slice(0,8) + "..." + rawKey.slice(-4)`), name
  - Return 201 with `{ id, name, key: rawKey, createdAt }` — rawKey ONLY returned here

  **Endpoint 5: GET /:id/keys (List API keys)** — Auth: `clerkAuth`
  - Verify user owns workspace
  - Select all keys for workspace
  - Return masked: `{ keys: [{ id, name, key: keyPrefix, createdAt, lastUsedAt }] }`

  **Endpoint 6: DELETE /:id/keys/:keyId (Revoke key)** — Auth: `clerkAuth`
  - Verify user owns workspace
  - Delete key by id + workspaceId
  - Return 204 No Content

  Pattern for each route:

  ```typescript
  import { Hono } from "hono";
  import { nanoid } from "nanoid";
  import { randomBytes } from "node:crypto";
  import { db } from "../db";
  import { workspaces, apiKeys, questions } from "../db/schema";
  import { eq, and, count } from "drizzle-orm";
  import { bearerAuth, clerkAuth, hashKey } from "../middleware/auth";
  import {
    createWorkspaceSchema,
    updateWorkspaceSchema,
    createApiKeySchema,
  } from "../../shared/schemas";

  const app = new Hono();

  app.post("/", clerkAuth, async (c) => {
    const body = await c.req.json();
    const parsed = createWorkspaceSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
    // ... insert and return
  });

  export default app;
  ```

#### Coder C: Questions Routes (5 endpoints including SSE + answer)

**Files:** `web/src/server/routes/questions.ts` (CREATE)

- [ ] Create `web/src/server/routes/questions.ts` as a Hono sub-app with 5 endpoints:

  **Endpoint 7: POST / (Create question)** — Auth: `bearerAuth`
  - Validate body with `createQuestionSchema`
  - Generate id with `nanoid()`
  - `questionsJson` in the body is an array — **stringify it** before storing: `JSON.stringify(parsed.data.questionsJson)`
  - If `timeoutMs` provided, compute `timeoutAt = new Date(Date.now() + timeoutMs)`
  - Use the first question's prompt as `title` if not provided
  - Insert into `questions` table
  - Return 201: `{ id, status: "pending", title, createdAt, updatedAt }`

  **Endpoint 8: GET /:id (Get question + answers)** — Auth: `bearerAuth`
  - Get question by id
  - Verify `workspaceId` matches `c.get("workspaceId")`
  - Get all answers for this question
  - Parse `questionsJson` from string → array: `JSON.parse(question.questionsJson)`
  - Return: `{ id, status, title, questions: <parsed>, answers: [...], createdAt, updatedAt }`

  **Endpoint 9: GET /stream (SSE)** — Auth: `bearerAuthFromQuery` (reads `token` query param)
  - Use `streamSSE` from `"hono/streaming"`
  - On connect: query all pending questions for workspace, send each as `{ type: "question:created", data: {...} }`
  - Poll loop every 5 seconds: query for questions updated since last check
  - Send keep-alive every 30 seconds: `{ type: "keep-alive" }`
  - **CRITICAL:** Use generic `event: "message"` in `writeSSE`, put type in data JSON:
    ```typescript
    await stream.writeSSE({
      data: JSON.stringify({ type: "question:created", data: questionObj }),
      event: "message",
      id: String(Date.now()),
    });
    ```
  - Handle abort signal to clean up

  **Endpoint 10: POST /:id/answer (Submit answer)** — Auth: `bearerAuth` (both Clerk JWT and Bearer key should work, but use bearerAuth for simplicity — agents submit answers too)
  - Validate body with `submitAnswerSchema`
  - Get question by id, verify workspace ownership
  - Check question status is "pending" or "in_progress" — if already completed/rejected, return 409
  - Insert answer row: id (nanoid), questionId, questionIndex, selectedOption, selectedOptionsJson (stringify array if present), customText, rejected, rejectionReason, answeredAt
  - Determine new status: if `rejected` → "rejected", else → "completed"
  - Update question status + updatedAt
  - Return 200: `{ id, questionId, questionIndex, answeredAt }`

  **Endpoint 11: DELETE /:id (Mark abandoned)** — Auth: `bearerAuth`
  - Get question by id, verify workspace
  - Update status to "abandoned" + updatedAt
  - Return 204 No Content

  **IMPORTANT ordering:** The `/stream` route MUST be registered BEFORE `/:id` to prevent "stream" from matching as an `:id` param.

#### Coder D: Analytics + Push Routes (4 endpoints)

**Files:** `web/src/server/routes/analytics.ts` (CREATE), `web/src/server/routes/push.ts` (CREATE)

- [ ] Create `web/src/server/routes/analytics.ts` with 1 endpoint:

  **Endpoint 12: GET / (Analytics summary)** — Auth: `clerkAuth`
  - Parse query with `analyticsQuerySchema` (default 30 days)
  - Need workspaceId: query workspaces table where `clerkUserId` matches `c.get("clerkUserId")`, get first workspace
  - If no workspace found, return empty analytics
  - Query questions for workspace within date range:
    - `questionsPerDay`: GROUP BY date, COUNT
    - `totalCount`, `answeredCount` (status=completed), `pendingCount`, `rejectedCount`, `abandonedCount`
    - `avgResponseTimeMs`: for completed questions, AVG(answer.answeredAt - question.createdAt) in ms
    - `responseTimeDistribution`: bucket answered questions by response time (0-5m, 5-15m, 15-60m, 1h+)
  - Return the analytics object matching PRD §6.5 response format

- [ ] Create `web/src/server/routes/push.ts` with 3 endpoints:

  **Endpoint 13: GET /vapid-key** — Auth: None (public)
  - Return `{ publicKey: process.env.VAPID_PUBLIC_KEY || "" }`
  - If not configured, return 501: `{ error: "Push notifications not configured" }`

  **Endpoint 14: POST /subscribe** — Auth: `clerkAuth`
  - Validate body with `pushSubscribeSchema`
  - Get workspace for user (query by clerkUserId)
  - Upsert: if endpoint already exists, update keys; else insert new row
  - Return 201: `{ id, createdAt }`

  **Endpoint 15: POST /unsubscribe** — Auth: `clerkAuth`
  - Validate body with `pushUnsubscribeSchema`
  - Delete by endpoint
  - Return 204 No Content

#### Coder E: Wire Routes into Server + Update Types

**Files:** `web/src/server/index.ts` (EDIT), `web/src/shared/types.ts` (EDIT)

- [ ] Edit `web/src/server/index.ts`:
  - Remove ALL commented-out route imports and mounts (lines 20-32)
  - Add real imports:
    ```typescript
    import workspacesRouter from "./routes/workspaces";
    import questionsRouter from "./routes/questions";
    import analyticsRouter from "./routes/analytics";
    import pushRouter from "./routes/push";
    ```
  - Add route mounts after health endpoint:
    ```typescript
    app.route("/api/v1/workspaces", workspacesRouter);
    app.route("/api/v1/questions", questionsRouter);
    app.route("/api/v1/analytics", analyticsRouter);
    app.route("/api/v1/push", pushRouter);
    ```
  - Note: NO separate apiKeys router — those routes are nested inside workspacesRouter at `/:id/keys`

- [ ] Edit `web/src/shared/types.ts`:
  - Add API response types:
    ```typescript
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

### Batch 2 (sequential — after all Batch 1 coders complete)

- [ ] Run `cd web && npm install zod nanoid @clerk/backend` — install missing dependencies
- [ ] Run `cd web && npx tsc --noEmit` — fix any type errors found
- [ ] Start dev server: `npm run dev` in web/
- [ ] Test workspace creation: `curl -X POST http://localhost:5173/api/v1/workspaces -H "Content-Type: application/json" -H "Authorization: Bearer test-jwt" -d '{"name":"Test Workspace"}'`
- [ ] Test API key creation: `curl -X POST http://localhost:5173/api/v1/workspaces/<id>/keys -H "Content-Type: application/json" -H "Authorization: Bearer test-jwt" -d '{"name":"Test Key"}'`
- [ ] Test question creation with the returned API key
- [ ] Test SSE stream: `curl -N "http://localhost:5173/api/v1/questions/stream?token=<api_key>"`
- [ ] Test analytics: `curl http://localhost:5173/api/v1/analytics -H "Authorization: Bearer test-jwt"`

### Dependencies

Batch 1 coders have strict file boundaries — no file overlaps:

- **Coder A:** `web/src/shared/schemas.ts` (NEW) + `web/src/server/middleware/auth.ts` (EDIT)
- **Coder B:** `web/src/server/routes/workspaces.ts` (NEW)
- **Coder C:** `web/src/server/routes/questions.ts` (NEW)
- **Coder D:** `web/src/server/routes/analytics.ts` (NEW) + `web/src/server/routes/push.ts` (NEW)
- **Coder E:** `web/src/server/index.ts` (EDIT) + `web/src/shared/types.ts` (EDIT)

Batch 2 is sequential: dependencies must be installed before typecheck, and typecheck must pass before manual endpoint testing.

### Risk Areas

1. **Clerk JWT verification may fail without proper setup**: `verifyToken` needs `CLERK_SECRET_KEY` env var. If not set, clerkAuth will 401 everything. Mitigation: add try/catch in clerkAuth, in dev mode log a warning but allow passthrough if `CLERK_SECRET_KEY` is not configured (set a fake userId like `"dev_user"`).
2. **SSE stream route vs `:id` param collision**: `/stream` must be registered BEFORE `/:id` in the Hono router, otherwise "stream" matches as an id. Coder C must put the stream route first.
3. **`nanoid` ESM import**: nanoid v5+ is ESM-only. Since our package.json has `"type": "module"`, this should work. If not, use `import { nanoid } from "nanoid"` (not `require`).
4. **Analytics query complexity**: The response time distribution and per-day aggregation require multiple queries or a complex single query. Keep it simple with separate queries — performance is fine for SQLite with small datasets.
5. **`questionsJson` parsing**: The create endpoint receives an array and must stringify. The get endpoint must parse. The SSE stream must also parse. Every read path must `JSON.parse()`.

---

## Done Criteria

- [ ] `web/src/server/routes/` directory contains 4 files: `workspaces.ts`, `questions.ts`, `analytics.ts`, `push.ts`
- [ ] `web/src/shared/schemas.ts` exists with Zod schemas for all request validation
- [ ] `web/src/server/middleware/auth.ts` has working Clerk JWT verification (with dev fallback)
- [ ] `web/src/server/index.ts` imports and mounts all 4 route groups
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `npm run dev` starts without errors
- [ ] All 15 API endpoints respond with correct status codes
- [ ] SSE stream sends keep-alive events
- [ ] API key creation returns raw key, subsequent list returns masked key
- [ ] Question creation stores `questionsJson` as string, GET returns parsed array
- [ ] Answer submission returns answer object (id, questionId, questionIndex, answeredAt)
