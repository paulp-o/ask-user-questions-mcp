# AUQ Web Platform - Open Questions & Architecture Decisions

**Version:** 1.0  
**Last Updated:** March 2026  
**Status:** Living Document (Add questions/decisions as they emerge)

---

## Executive Summary

This document captures **architecture decisions**, **known issues**, **missing features**, and **open design questions** for the AUQ Web Platform. It's intended as a decision log and a guide for anyone maintaining, extending, or rebuilding the system.

This is a **living document** — update it as new questions arise or decisions are made.

---

## 1. Architecture Decisions & Tradeoffs

### Decision 1: SvelteKit vs React Router vs Next.js

**Question:** Which framework should the AUQ Web Platform use?

**Options Evaluated:**

| Framework               | Pros                                                       | Cons                                                        |
| ----------------------- | ---------------------------------------------------------- | ----------------------------------------------------------- |
| **SvelteKit** (current) | Minimal bundle size, elegant syntax, fast HMR, full-stack  | Smaller ecosystem, harder to hire, less mature integrations |
| **React Router**        | Large ecosystem, many third-party libs, easy to hire       | Higher bundle size, more boilerplate, JSX verbosity         |
| **Next.js**             | Full-stack, excellent DX, strong ecosystem, Vercel support | Vercel lock-in, opinionated, app router learning curve      |

**Decision Made:** **SvelteKit** for MVP  
**Status:** ✅ Active

**Rationale:**

- Clean separation of server routes and frontend components
- Excellent HMR during development
- Smaller bundle = faster mobile load times
- SVG/CSS animations easier to write
- better-auth Drizzle adapter was SvelteKit-ready

**Considerations for Future:**

- If hiring becomes difficult, migrate to React + TanStack Router
- React would require rewriting all `.svelte` files but keep API routes mostly unchanged
- Estimated migration effort: 6-8 weeks for 1 developer

**Cost of Not Migrating:**

- Limited community support
- Fewer third-party components (must build custom)
- Harder to onboard junior developers

---

### Decision 2: Authentication: Clerk vs better-auth vs Auth.js

**Question:** Which authentication library should handle user accounts and sessions?

**Options Evaluated:**

| Option          | Auth Type              | DB Required        | Cost             | Status                      |
| --------------- | ---------------------- | ------------------ | ---------------- | --------------------------- |
| **Clerk**       | OAuth + Email/Password | No (Clerk-managed) | $25/1M+ users    | Mentioned in `.env.example` |
| **better-auth** | OAuth + Email/Password | Yes (own DB)       | Free + self-host | Current design choice       |
| **Auth.js**     | OAuth + Email/Password | Yes (own DB)       | Free + self-host | Industry standard           |

**Decision Made:** **better-auth** with Drizzle SQLite adapter  
**Status:** 🔄 Proposed (not yet implemented)

**Rationale:**

- Owned by Vercel team, well-maintained
- First-class Drizzle ORM support (unlike Clerk)
- No external dependency (unlike Clerk)
- Email/password + OAuth (GitHub, Google) built-in
- Email verification, password reset included
- Easier to self-host (no vendor lock-in)

**Current State:**

- `.env.example` shows Clerk setup, but this is outdated
- **Action Required:** Update to better-auth when frontend redesign ships

**Known Issues:**

- **svelte-clerk is community-maintained**, not official Clerk SDK
  - May lag behind Clerk API changes
  - Less tested with SvelteKit SSR
  - Consider migrating away from Clerk before production scale

**Alternative Approach (Auth.js/NextAuth):**

- More mature ecosystem
- Works with any framework (Next.js, SvelteKit, Astro, etc.)
- Better long-term stability

**Migration Path (if needed):**

1. Add Auth.js alongside better-auth (both libs can coexist)
2. Gradually migrate sessions to Auth.js
3. Remove better-auth once Auth.js is stable

---

### Decision 3: Real-Time Communication: SSE vs WebSocket

**Question:** How should questions and answers be streamed in real-time?

**Options:**

| Protocol                     | Pros                                                                                     | Cons                                                            |
| ---------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| **SSE (Server-Sent Events)** | Simpler to implement, built-in browser support, auto-reconnect, one-way (questions only) | One-way only (server→client), less suitable for bidirectional   |
| **WebSocket**                | Bidirectional, lower latency, more flexible                                              | More complex, requires heartbeat, harder to scale, proxy issues |

**Decision Made:** **SSE for question streaming, polling for answers**  
**Status:** ✅ Designed, not yet implemented

**Architecture:**

```
Agent asks question
    ↓
POST /api/v1/questions → question stored in DB
    ↓
SSE stream sends: event:question:created
    ↓
User's browser receives event
    ↓
Inbox re-renders with new question (real-time)
    ↓
User submits answer
    ↓
POST /api/v1/questions/{id}/answer → updates DB
    ↓
MCP client polls GET /api/v1/questions/{id} every 1-2 seconds
    ↓
MCP server receives answer and continues

OR (for better UX):
Polling every 1s (with exponential backoff after 30s) vs SSE
```

**Rationale:**

- **SSE is one-way** (server → client only)
- Questions flow downstream: Agent → Backend → Frontend (SSE)
- Answers flow upstream: Frontend → Backend → MCP (polling or future webhook)
- No need for bidirectional communication (yet)
- Simpler to debug and scale

**Future Enhancement (Webhooks):**
Instead of MCP polling, backend sends HTTP POST to agent callback URL when answer arrives. Requires:

1. Agent provides callback webhook URL
2. Backend sends signed POST request
3. MCP server receives answer via webhook (faster than polling)

---

### Decision 4: Database: SQLite vs PostgreSQL

**Question:** Which database should the platform use?

**Options:**

| Database             | Local Dev      | Small Deployment         | Production Scale                       | Cost          |
| -------------------- | -------------- | ------------------------ | -------------------------------------- | ------------- |
| **SQLite** (current) | ✅ Perfect     | ✅ Works (single-writer) | ⚠️ Problematic (no concurrent writers) | Free          |
| **PostgreSQL**       | ✅ Docker easy | ✅ Perfect               | ✅ Scales well                         | $10-50+/month |

**Decision Made:** **SQLite for MVP, migrate to PostgreSQL for production**  
**Status:** ✅ SQLite active, 🔄 PostgreSQL planned for scale

**Current Setup:**

- File-based SQLite at `./data/local.db`
- Works fine for development and single-instance deployment
- Drizzle ORM with SQLite driver

**Known Limitations:**

- **No concurrent writers:** Only one request can write to DB at a time
- **Poor for Kubernetes:** Not suitable for multi-instance horizontal scaling
- **Durability:** No replication or backup management (must manually backup `/data/local.db`)

**Production Migration Plan:**

1. Set up PostgreSQL database (on managed service like AWS RDS)
2. Update DATABASE_URL env var
3. Drizzle ORM changes: Remove SQLite driver, add Postgres driver
4. Run migrations: `drizzle-kit push` (auto-applies to Postgres)
5. No schema changes needed (SQLite and Postgres use same Drizzle schemas)

**Estimated Effort:** 2-4 hours for migration

---

### Decision 5: Frontend Components: shadcn-svelte vs Custom UI

**Question:** Should we use pre-built component libraries or build custom?

**Options:**

| Approach                          | Pros                                                                          | Cons                                                      |
| --------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------- |
| **shadcn-svelte**                 | Copy-paste control, full customization, accessible (bits-ui), no dependencies | Must maintain component code, updates require manual sync |
| **UI Framework** (e.g., SvelteUI) | Pre-built, less maintenance                                                   | Black-box components, less customization, potential bloat |
| **Fully Custom**                  | Complete control                                                              | High effort, accessibility burden, time-consuming         |

**Decision Made:** **shadcn-svelte**  
**Status:** ✅ Chosen, 🔄 Implementation in progress

**Rationale:**

- Copy-paste architecture = full control over component code
- Built on bits-ui (excellent accessibility primitives)
- Works perfectly with Tailwind CSS v4
- Can fork/modify components as needed
- No vendor lock-in

**Components to Use:**

- Button, Input, Label, Card, Tabs, Dialog, Badge, Separator
- Avatar, Sheet (mobile nav), DropdownMenu, Table
- Tooltip, Switch, Skeleton

**Installation:**

```bash
pnpm dlx shadcn-svelte@latest init
pnpm dlx shadcn-svelte@latest add button input card tabs dialog ...
```

---

### Decision 6: State Management: Svelte Stores vs TanStack Query

**Question:** How should we manage app state (data, loading, caching)?

**Options:**

| Solution                  | Pros                                      | Cons                                                            |
| ------------------------- | ----------------------------------------- | --------------------------------------------------------------- |
| **Svelte Stores (runes)** | Built-in, no dependencies, lightweight    | Requires manual caching/invalidation, verbose                   |
| **TanStack Query**        | Smart caching, auto-refetching, dev tools | Additional dependency, React-focused (SvelteKit support decent) |
| **Zustand**               | Lightweight, flexible                     | Minimal features, still manual caching                          |

**Decision Made:** **Svelte Stores (runes) for UI state + fetch hooks for data**  
**Status:** ✅ Chosen

**Architecture:**

```svelte
// Auth store (Svelte runes)
export let user = $state(null);
export let isAuthenticated = $derived(user !== null);

// Question store with SSE
export let questions = $state([]);

$effect.root(() => {
  const sse = new EventSource('/api/v1/questions/stream?token=...');
  sse.addEventListener('question:created', (e) => {
    questions = [...questions, JSON.parse(e.data)];
  });
  return () => sse.close();
});
```

**Rationale:**

- Svelte 5 runes (`$state`, `$derived`, `$effect`) are perfect for this
- No extra dependencies
- SSE streams fit naturally into reactive stores
- Polling can be handled with `$effect` + setInterval

**Caching Strategy:**

- Store questions in memory while user is in inbox
- On navigation away: keep data (don't clear)
- On page refresh: refetch from API
- Manual invalidation on answer submission

---

### Decision 7: API Authentication: API Keys vs OAuth Bearer Tokens

**Question:** How should the API authenticate requests from agents?

**Options:**

| Method                             | Pros                                    | Cons                                        |
| ---------------------------------- | --------------------------------------- | ------------------------------------------- |
| **API Keys (Bearer tokens)**       | Simple, stateless, per-workspace        | Key rotation required, no per-user tracking |
| **OAuth 2.0 (Authorization Code)** | Standard, user-aware, easier revocation | Requires OAuth server, complex for agents   |
| **JWT (Self-Signed)**              | Lightweight, stateless, expiring        | Requires key rotation, complex validation   |

**Decision Made:** **API Keys (hashed Bearer tokens)**  
**Status:** ✅ Designed

**Format:**

```
auq_abcdef1234567890...

Backend storage: SHA256(key) only (plain key never stored)
```

**Request Header:**

```
Authorization: Bearer auq_abcdef1234567890...
```

**Validation:**

1. Extract key from header
2. Hash it: SHA256(key)
3. Look up hash in `api_keys` table
4. Check workspace_id for authorization
5. Update `lastUsedAt` timestamp

**Rationale:**

- Simple for agents to use (copy-paste key)
- Stateless (no session lookup)
- Per-workspace isolation
- Easy to revoke (delete from DB)
- Fit naturally with Drizzle ORM schema

---

## 2. Known Issues & Bugs

### Issue 1: better-sqlite3 Native Binding in SSR

**Problem:**
`better-sqlite3` requires native Node.js bindings (compiled C++). In SSR environments or when using edge runtimes (like Vercel), native bindings may fail.

**Current Status:** ⚠️ Potential issue (not yet hit)

**Symptoms:**

- Error: `cannot find native module at path/to/binding.node`
- Occurs during `build` or server startup
- Works locally but fails in CI/CD

**Mitigation:**

1. Use Docker for deployment (ensures C++ toolchain available)
2. Pre-build native bindings in CI
3. Use PostgreSQL instead (via pg driver, no native bindings)

**Long-term Fix:**
Migrate to **Postgres** instead of SQLite. Drizzle ORM switch is trivial:

```javascript
import { drizzle } from "drizzle-orm/postgres-js";
// vs current: import { drizzle } from 'drizzle-orm/better-sqlite3';
```

---

### Issue 2: API Endpoint Inconsistencies

**Problem:**
Some API endpoints mentioned in design don't exist yet, or naming differs.

**Examples:**

- Missing: `GET /api/v1/workspaces/{id}` — frontend expects this to exist
- Missing: `GET /api/v1/analytics` — supposed to return summary stats
- Inconsistent naming: `/api/v1/questions/{id}/answer` vs `/api/v1/questions/{id}/answers`

**Current Status:** ⚠️ Design-implementation mismatch

**Action Required:**

1. Audit all designed endpoints
2. Create missing ones
3. Test each endpoint with curl before frontend integration
4. Update OpenAPI spec at `/static/openapi.yaml`

---

### Issue 3: Agent Code Generation for Svelte/React

**Problem:**
AI agents (Claude, etc.) consistently generate outdated Svelte 4 patterns when asked to write components, even when prompted about Svelte 5 runes.

**Symptoms:**

- Agents generate `<script>` with `let count: number = 0;` instead of `let count = $state(0)`
- Generate `onMount()` lifecycle instead of `$effect()`
- Use deprecated store subscriptions `$` instead of store runes

**Current Status:** 🔄 Known limitation of LLMs

**Workaround:**

- Provide explicit Svelte 5 examples in system prompts
- Create custom agent skill/tool with Svelte 5 code snippets
- Ask agents to output TypeScript interfaces first, implement manually

---

### Issue 4: SSR Hydration with better-auth Sessions

**Problem:**
better-auth relies on httpOnly cookies for session management. During SSR, the session may not be available in `hooks.server.ts`, causing hydration mismatches.

**Current Status:** 🔄 Needs investigation

**Potential Fix:**
Implement custom session hydration in `+layout.server.ts`:

```typescript
export async function load({ locals }) {
  const session = await auth.api.getSession({ headers: new Headers() });
  return { user: session?.user };
}
```

---

## 3. Missing Features

### Feature Gap 1: No Direct User-to-Workspace Association

**Problem:**
Currently, workspaces are created but don't track which **user** owns them.

**Impact:**

- Can't determine who owns a workspace
- Can't implement team features (invite users to workspace)
- Can't audit who accessed what

**Required Schema Change:**

```sql
ALTER TABLE workspaces ADD COLUMN user_id TEXT REFERENCES user(id);
```

**Estimated Effort:** 2-4 hours

---

### Feature Gap 2: Workspace Bootstrap Has No Auth

**Problem:**
The `POST /api/v1/workspaces` endpoint (used during signup) requires **no authentication**. Anyone can create infinite workspaces.

**Impact:**

- Rate limiting required: Limit to 1 workspace per unauthenticated request
- Or: Only allow authenticated users to create workspaces

**Current Code:**

```typescript
// This endpoint has NO Bearer token requirement
export async function POST({ request }) {
  const { name } = await request.json();
  // ... create workspace ...
}
```

**Fix:**
Require authentication during signup (or add rate limiting):

```typescript
export async function POST({ locals, request }) {
  if (!locals.user) return error(401, "Unauthorized");
  // ... create workspace ...
}
```

---

### Feature Gap 3: No Billing / Payment Integration

**Problem:**
Pricing page is informational only. No way to collect payment or enforce limits.

**Missing Components:**

- [ ] Stripe integration
- [ ] Subscription management
- [ ] Invoice tracking
- [ ] Usage limits (e.g., 50 questions/day for Free tier)
- [ ] Payment form at signup (Pro tier)

**Estimated Effort:** 2-3 weeks

**Recommended Approach:**

1. Use Stripe Billing (high-level abstraction)
2. Create `/api/v1/billing` endpoints for subscription management
3. Add usage check: `if (workspace.plan === 'free' && questionsToday >= 50) error(429)`

---

### Feature Gap 4: No Team Features (Invite, Roles, Audit Log)

**Problem:**
Workspaces are single-user. Can't invite teammates or assign roles.

**Missing Components:**

- [ ] Invite users to workspace (email-based)
- [ ] Role-based access (Admin, Member, Viewer)
- [ ] Audit log (who did what, when)
- [ ] User list in workspace

**Example Schema:**

```sql
CREATE TABLE workspace_members (
  workspace_id TEXT REFERENCES workspaces(id),
  user_id TEXT REFERENCES user(id),
  role TEXT CHECK(role IN ('owner', 'admin', 'member', 'viewer')),
  createdAt INTEGER,
  PRIMARY KEY (workspace_id, user_id)
);
```

**Estimated Effort:** 3-4 weeks

---

### Feature Gap 5: No Rate Limiting on Public Endpoints

**Problem:**
`GET /api/v1/push/vapid-key` has no rate limiting. Can be abused for DDoS.

**Missing Components:**

- [ ] Rate limiting middleware (e.g., `bottleneck`, `rate-limit-redis`)
- [ ] Per-IP limits for public endpoints (100/min)
- [ ] Per-API-key limits for authenticated endpoints (1000/min)
- [ ] Return `429 Too Many Requests` when exceeded

**Implementation:**

```typescript
import { RateLimiter } from "bottleneck";

const limiter = new RateLimiter({ minTime: 100 });

export async function GET({ request }) {
  await limiter.schedule(() => Promise.resolve());
  // ... handle request ...
}
```

**Estimated Effort:** 1-2 days

---

### Feature Gap 6: No Webhook Delivery (for answer callbacks)

**Problem:**
Currently, agents must **poll** `GET /api/v1/questions/{id}` every 1-2 seconds to get answers. This is inefficient at scale.

**Ideal Solution:**
Webhook delivery: When answer arrives, backend sends HTTP POST to agent's callback URL.

**Schema:**

```sql
CREATE TABLE question_webhooks (
  id TEXT PRIMARY KEY,
  question_id TEXT REFERENCES questions(id),
  callback_url TEXT NOT NULL,
  created_at INTEGER
);
```

**Implementation:**

```typescript
// When answer submitted:
const webhook = await db.select().from(questionWebhooks).where(...);
if (webhook) {
  await fetch(webhook.callbackUrl, {
    method: 'POST',
    headers: { 'X-AUQ-Signature': sign(answer, secret) },
    body: JSON.stringify(answer)
  });
}
```

**Estimated Effort:** 1-2 weeks

---

## 4. Risk Areas & Mitigation

### Risk 1: svelte-clerk is Community-Maintained

**Risk Level:** ⚠️ Medium

**Problem:**
`svelte-clerk` is not an official Clerk SDK. It's maintained by the community and may lag behind Clerk's official updates.

**Likelihood:** Medium (can diverge over time)

**Impact:** High (auth breakage affects entire app)

**Mitigation:**

1. **Migrate to better-auth** (planned in redesign — does this)
2. Or: **Switch to official Clerk SDK** if it becomes available for SvelteKit
3. Monitor Clerk changelog: https://github.com/sveltejs/kit/discussions
4. Have a contingency plan to migrate to Auth.js if Clerk becomes unsupported

---

### Risk 2: layerchart@next is Pre-Release

**Risk Level:** ⚠️ Medium

**Problem:**
`layerchart@next` (used for analytics charts) is a pre-release version. May have breaking changes before 2.0 official release.

**Likelihood:** Medium (pre-release software)

**Impact:** Medium (affects analytics page only, not core feature)

**Mitigation:**

1. Monitor layerchart releases: https://github.com/melt-ui/layerchart
2. Have alternative: Recharts (React) or Chart.js (vanilla) as backup
3. Pin version in package.json (currently `2.0.0-next.46`)
4. Test thoroughly before updating

---

### Risk 3: Workspace Bootstrap Has No Auth

**Risk Level:** 🔴 High

**Problem:**
Anyone can call `POST /api/v1/workspaces` without authentication and create unlimited workspaces. This enables:

- Spam/abuse
- Storage exhaustion
- Potential DoS

**Likelihood:** High (trivial to exploit)

**Impact:** High (service availability)

**Mitigation:**

1. **Immediate:** Add rate limiting (1 workspace per IP per 24 hours)
2. **Short-term:** Require authentication for workspace creation
3. **Long-term:** Add CAPTCHA or email verification during signup

---

### Risk 4: SQLite Not Suitable for Horizontal Scaling

**Risk Level:** 🔴 High (for production)

**Problem:**
SQLite cannot handle concurrent writes. In multi-instance deployment (Kubernetes, load-balanced VMs), only one instance can write at a time. Others block.

**Likelihood:** High (if scaling beyond single instance)

**Impact:** Very High (severe performance degradation, potential downtime)

**Mitigation:**

1. **Planned:** Migrate to PostgreSQL before scaling
2. **Monitoring:** Track database lock wait times
3. **Fallback:** Limit to single-instance deployment (Docker Compose)

---

## 5. Rebuild Considerations

### If Migrating to React

**Question:** Should we rebuild the AUQ Web Platform in React?

**When to Consider:**

- Hiring difficulty becomes severe (can't find Svelte developers)
- SvelteKit ecosystem gaps become painful
- Team prefers React (familiarity)

**Recommended React Stack:**

```
Frontend:
- React 19 + React Router v7 (or Remix)
- TanStack Query (data fetching + caching)
- Zustand (state management)
- shadcn/ui (component library)
- Tailwind CSS v4 (styling)
- Vitest (testing)

Backend:
- Keep existing SvelteKit API routes (no change)
- Or migrate to Express.js + TypeScript (if rewriting backend)

Build:
- Vite (React support out-of-box)
```

**What to Keep:**

- ✅ API endpoints: `/api/v1/**` (change nothing)
- ✅ Database schema: Same Drizzle ORM (works with both Svelte and React)
- ✅ Push notifications: Web Push API (browser standard)
- ✅ SSE streaming: Works in React too

**What to Rewrite:**

- ❌ All `.svelte` components → `.tsx` components
- ❌ Svelte stores → TanStack Query + Zustand
- ❌ Svelte SSE handling → React hooks with EventSource
- ❌ Form validation: Zod (same) but with React Hook Form

**File Structure (Before → After):**

```
// SvelteKit
src/routes/+page.svelte → src/pages/landing.tsx
src/routes/+layout.svelte → src/layout.tsx
src/lib/stores/ → Removed (use TanStack Query)
src/lib/components/ → Keep shadcn components, adapt syntax

// Express (if rewriting backend)
src/routes/api/ → backend/src/routes/
```

**Estimated Effort:** 8-12 weeks for 2 developers

**Migration Strategy:**

1. Create new React app in `/platforms/web-react` (parallel)
2. Migrate one page at a time: Landing → Login → Inbox → Settings
3. Share API routes (old SvelteKit app still serving backend)
4. Swap router when React version is feature-complete
5. Delete old SvelteKit files

---

### Database: SQLite → PostgreSQL Migration

**When:** Before horizontal scaling or if hitting write concurrency issues

**Steps:**

1. **Setup PostgreSQL:**

   ```bash
   docker run -e POSTGRES_PASSWORD=secret postgres:16
   export DATABASE_URL=postgresql://user:pass@localhost:5432/auq
   ```

2. **Update Drizzle Adapter:**

   ```typescript
   // Before (SQLite)
   import { drizzle } from "drizzle-orm/better-sqlite3";
   import Database from "better-sqlite3";
   const db = new Database("data/local.db");
   export const dbInstance = drizzle(db);

   // After (Postgres)
   import { drizzle } from "drizzle-orm/postgres-js";
   import postgres from "postgres-js";
   const sql = postgres(process.env.DATABASE_URL);
   export const dbInstance = drizzle(sql);
   ```

3. **Run Migrations:**

   ```bash
   pnpm exec drizzle-kit push
   # Auto-creates all tables in Postgres (schema unchanged)
   ```

4. **Update Env:**

   ```bash
   DATABASE_URL=postgresql://user:pass@hostname:5432/auq_prod
   ```

5. **Test:**
   - Run integration tests
   - Verify push notifications still work
   - Check analytics queries performance

**Estimated Effort:** 4-8 hours

---

### Frontend Redesign: Current → Proposed

**Current State (as of Mar 2026):**

- ❌ No marketing pages
- ❌ No proper auth (Clerk + svelte-clerk)
- ❌ Outdated visual design
- ❌ No analytics dashboard
- ❌ No settings UI

**Proposed State (after redesign):**

- ✅ Landing + pricing pages
- ✅ Auth with better-auth (email/password + OAuth)
- ✅ Modern design (Linear/Vercel style)
- ✅ Analytics dashboard with charts
- ✅ Settings page with API key management
- ✅ Push notifications

**Timeline:** 6-8 weeks for 2 frontend developers

---

## 6. Questions for Product/Engineering Leadership

### Q1: Billing Strategy?

**Question:** Should the Pro tier be implemented before or after launch?

**Options:**

- A) Launch free-only (monetize later)
- B) Launch with free + pro tiers
- C) Waitlist for pro features (collect emails, launch later)

**Recommendation:** Option A — Launch free only, add billing in Q2

---

### Q2: Team Features Timeline?

**Question:** When should team/workspace sharing features ship?

**Options:**

- A) In MVP (required for launch)
- B) In Phase 2 (1-2 months after launch)
- C) When customer requests (on-demand)

**Recommendation:** Option B — Build on customer feedback

---

### Q3: Self-Hosting vs Managed SaaS?

**Question:** Should we emphasize self-hosting or managed cloud hosting?

**Options:**

- A) Self-hosting first (Docker Compose)
- B) Managed cloud first (https://auq.paulp.dev)
- C) Both equally

**Recommendation:** Option B — Managed cloud first (better UX), self-hosting as secondary option

---

### Q4: Open Source?

**Question:** Should the web platform be open source?

**Rationale:**

- ✅ Builds trust
- ✅ Community contributions
- ❌ Competitors can fork
- ❌ Support burden

**Recommendation:** Keep private initially, open source after proving the business model

---

## 7. Deprecated / Not Doing

### Not Doing: Mobile Native App

**Why Not:**

- PWA covers 90% of use case
- Expensive to maintain (iOS + Android)
- App store distribution complexity

**Revisit When:** If mobile usage exceeds 40% of traffic

---

### Not Doing: Advanced Scheduling

**Why Not:**

- Adds complexity
- Most questions are ad-hoc
- Users can snooze notifications if needed

**Revisit When:** Customer demand

---

### Not Doing: AI-Generated Responses

**Why Not:**

- Defeats purpose (user input required)
- Legal liability for auto-accepting decisions

---

## 8. Version History

| Version | Date     | Changes                    |
| ------- | -------- | -------------------------- |
| 1.0     | Mar 2026 | Initial decisions document |

---

## 9. How to Use This Document

### For Developers:

1. **Before implementing a feature:** Check "Known Issues" and "Missing Features"
2. **Before choosing a technology:** Check "Architecture Decisions"
3. **When debugging:** Check "Known Issues" for workarounds

### For Product Managers:

1. **Before planning:** Check "Missing Features" and "Rebuild Considerations"
2. **For feature prioritization:** Check "Feature Gaps 1-6" (effort estimates)
3. **For risk management:** Check "Risk Areas"

### For Leadership:

1. **For roadmap planning:** Check "Questions for Product/Engineering Leadership"
2. **For hiring:** Check "Rebuild Considerations → React migration" (talent needs)
3. **For scaling:** Check "Database: SQLite → PostgreSQL Migration"

---

**Last Updated:** March 2026  
**Next Review:** June 2026 (quarterly)  
**Owner:** Engineering Team

---

**Contributing:**

To add a decision, issue, or question:

1. Pick appropriate section
2. Use format: **Numbered issue/decision**
3. Include: Problem, Current Status, Rationale, Mitigation/Action
4. Update version history
5. Notify team in #engineering Slack
