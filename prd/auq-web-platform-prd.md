# AUQ Web Platform - Product Requirements Document

**Version:** 1.0  
**Last Updated:** March 2026  
**Status:** Active Specification

---

## Executive Summary

The **AUQ Web Platform** is a remote question-answering interface that enables AI agents (running via MCP protocol) to delegate user questions to a mobile-friendly web application. Instead of blocking on terminal responses, agents send questions to a persistent backend, and users answer asynchronously through their browser or mobile device. This enables multi-agent workflows where questions from multiple AI instances are collected in a single inbox, with push notifications, analytics, and full workspace/API key management.

**Core tagline:** "Keep your hand on the wheel" — stay in control of AI workflows without blocking on terminal interactions.

---

## 1. Problem Statement

### Current Limitations

**Terminal-Only Interaction**

- Users must be at their terminal to answer agent questions
- Cannot answer from mobile devices, remote machines, or other workspaces
- Questions appear and disappear in terminal output, easy to miss
- No notification system for incoming questions

**No Remote/Async Answering**

- Long-running AI workflows must wait for terminal response
- Agents block until questions are answered (no timeout graceful fallback)
- No way to batch-answer multiple questions from different agents
- Can't defer decision-making to later

**Multi-Agent Parallelism Issues**

- When multiple agents ask questions simultaneously, output is scattered across terminals
- No single view of all pending questions across agents
- Hard to prioritize or organize answers across parallel workflows

**No Analytics or Insight**

- Users can't see patterns in questions (volume, response times, types)
- No visibility into which agents ask most frequently
- No metrics for decision-making speed or workflow optimization

**No Account Management**

- API keys are global/shared, no per-workspace isolation
- No way to revoke or rotate keys safely
- No user accounts or team features
- No usage tracking by user/team

### Why This Matters

AI-powered development is increasingly multi-agentic. Users run Claude Code, Cursor, Windsurf, and other agents in parallel. Each agent may ask clarifying questions. Without a centralized, mobile-friendly, async interface, users either:

- Stay at terminal constantly (exhausting)
- Miss questions and cause agents to timeout (frustrating)
- Can't answer from phone while away from desk (limiting)

---

## 2. Product Overview

### What AUQ Web Platform Does

**For End Users:**

- Receive push notifications when agents ask questions
- Answer questions from phone, tablet, or desktop
- View history of all questions and answers
- See analytics on question volume, response times
- Manage API keys for their agents

**For AI Agents:**

- Call a single MCP tool: `ask_user_questions`
- Send structured question sets (multiple choice, single choice, free-form text)
- Receive answers asynchronously via polling or real-time SSE
- Get elaboration requests if a question is unclear
- Support rejection with explanation for better iteration

**For Teams (Future Pro Tier):**

- Multiple workspaces and users per workspace
- Granular API key permissions
- Team analytics and reporting
- Usage-based billing

### Key Differentiators

| Feature                | AUQ Web                        | Terminal AUQ           | Built-in Question Tools |
| ---------------------- | ------------------------------ | ---------------------- | ----------------------- |
| **Mobile answering**   | ✅ PWA with push notifications | ❌ Terminal-only       | ❌ Terminal-only        |
| **Async/deferred**     | ✅ Answer anytime              | ❌ Blocks agent        | ❌ Blocks agent         |
| **Multi-agent inbox**  | ✅ Single unified view         | ❌ Multiple terminals  | ⚠️ Scattered UI         |
| **Push notifications** | ✅ Native OS notifications     | ❌ No notifications    | ❌ No notifications     |
| **Analytics**          | ✅ Charts & metrics            | ❌ Session logs only   | ❌ No analytics         |
| **Self-hostable**      | ✅ Docker Compose              | ❌ Local-only          | N/A                     |
| **Offline support**    | ✅ Service worker caching      | ❌ Requires connection | N/A                     |

---

## 3. User Personas

### Persona 1: Power User Developer

**Name:** Alex  
**Age:** 32  
**Role:** Senior Engineer / Researcher  
**Context:** Runs multiple long-running AI agents in parallel (Claude Code, Cursor, Windsurf) for code generation, research, refactoring

**Goals:**

- Stay in flow without context-switching to terminal
- See all agent questions in one place
- Answer from phone while away from desk
- Understand which agents ask most/what patterns emerge

**Frustrations:**

- Agents timeout because he missed a question in terminal output
- Multiple agent questions appear simultaneously, hard to keep track
- Can't answer from phone during meetings or breaks
- No visibility into how long answers typically take

**Key Need:** Centralized, mobile-friendly async inbox with notifications

---

### Persona 2: Remote/Mobile User

**Name:** Jamie  
**Age:** 28  
**Role:** Freelance Developer  
**Context:** Works from home, travels frequently, uses mobile hotspot

**Goals:**

- Answer agent questions from phone/tablet
- Get notified when agents ask, not block when not available
- Quick decision-making (1 tap = answer)
- Works offline (with sync on reconnect)

**Frustrations:**

- Can't access terminal from phone or tablet
- SSH requires special setup, still awkward on mobile
- Missing questions because no notifications
- Terminal output unreadable on small screens

**Key Need:** Real PWA with offline support, native notifications

---

### Persona 3: Team Lead / Engineering Manager

**Name:** Sam  
**Age:** 38  
**Role:** Engineering Manager  
**Context:** Oversees team AI usage, needs visibility and control

**Goals:**

- See team's usage patterns (questions/day, response times)
- Rotate API keys for security
- Track which agents/projects ask most
- Plan AI integration improvements

**Frustrations:**

- No way to track team's AI agent activity
- No metrics to justify AI tool investments
- Can't manage multiple team members' API keys
- No audit trail

**Key Need:** Analytics dashboard, team workspace management, API key controls

---

## 4. Core User Flows

### Flow 1: First-Time Setup (Sign Up → Workspace → API Key)

**Duration:** ~2 minutes  
**Goal:** New user creates account, workspace, and gets API key configured

**Steps:**

1. **Landing Page**
   - User visits `https://auq.paulp.dev`
   - Sees hero: "Keep your hand on the wheel" + typewriter animation (Claude Code, Cursor, Windsurf, etc.)
   - Sees feature cards (mobile, notifications, analytics, self-hostable)
   - Sees pricing teaser (Free vs Pro)
   - Clicks "Get Started" button

2. **Sign Up**
   - Directed to `/signup`
   - Three options:
     - Email/password signup
     - GitHub OAuth
     - Google OAuth
   - Enters email or OAuth flow
   - Agrees to terms

3. **Account Created**
   - `better-auth` creates user account in DB
   - Session cookie issued
   - User redirected to `/app/inbox`

4. **First-Time Onboarding (in Inbox)**
   - If workspace doesn't exist, show onboarding modal
   - "Welcome! Let's set up your first workspace"
   - Prompt: "Workspace name?" (default: "My Workspace")
   - Creates workspace via `POST /api/v1/workspaces`
   - Modal closes

5. **Navigate to Settings → API Keys**
   - User goes to `/app/settings`
   - Clicks "API Keys" tab
   - Sees "No API keys yet" + "Create new API key" button
   - Clicks button → modal appears

6. **Create API Key**
   - Modal prompts: "Key name?" (e.g., "Claude Dev", "Cursor Key")
   - Calls `POST /api/v1/workspaces/{id}/keys` with name
   - Backend returns full key: `auq_abcdef123...` (60 chars)
   - Frontend displays: "Copy key immediately — it won't be shown again"
   - User copies key → clipboard
   - Key added to `.auqrc.json` or `AUQ_WEB_API_KEY` env var

7. **Verification**
   - In terminal, user runs: `auq ask '{"questions": [...]}'`
   - AUQ CLI finds env var, calls web API
   - Question appears in web inbox
   - User answers in browser
   - CLI receives response and continues

**Success Condition:** User has API key configured and successfully answered an agent question

---

### Flow 2: Agent Asks Question → User Answers (Real-Time)

**Duration:** 5–300 seconds (user-controlled)  
**Goal:** Agent asks question, user gets notified and answers, agent gets response

**Steps:**

1. **Agent Calls MCP Tool** (Claude Code, Cursor, Windsurf, etc.)

   ```
   Agent: "I need to clarify: should this be async or sync?"
   → Calls ask_user_questions MCP tool
   → MCP Server routes to web API if API key set
   ```

2. **MCP Server Sends to Web API**
   - MCP Server receives tool request
   - Calls `POST /api/v1/questions` with:
     - Bearer token (API key)
     - Question list (title, prompt, options, etc.)
   - Returns question ID + metadata
   - MCP starts polling for answers

3. **Web Backend Stores Question**
   - `/api/v1/questions` handler:
     - Validates API key (looks up workspace)
     - Creates question record: `INSERT INTO questions (...)`
     - Creates push notification task
     - Returns `{ id, status, createdAt }`

4. **Push Notifications Sent**
   - Backend queries `push_subscriptions` for workspace
   - Sends Web Push message to all subscribed devices:
     - Title: "New question: {title}"
     - Body: "{prompt}"
     - Action buttons: "View", "Mute"
   - If no subscriptions, question still stored (not lost)

5. **User Gets Notified** (assuming push enabled)
   - Phone/desktop shows native notification
   - User clicks "View" or notification body
   - Opens `/app/inbox` (PWA) or browser

6. **User Sees Question in Inbox**
   - Inbox fetches `GET /api/v1/questions/stream` (SSE)
   - Stream sends `question:created` event with full question data
   - Frontend renders QuestionCard:
     - Status badge: "Pending" (blue)
     - Question title
     - Created timestamp
     - "Answer" button

7. **User Clicks Question to Expand**
   - Navigates to `/app/questions/{id}`
   - Loads QuestionDetail component
   - Shows:
     - Full prompt text (markdown supported)
     - All options as buttons or radio/checkbox
     - Custom input field if "Other" option exists
     - "Submit answer" button
     - Metadata: Agent name (if provided), created time

8. **User Selects Answer**
   - For single-choice: clicks one option
   - For multi-choice: clicks multiple options
   - For custom: types free-form text
   - Can also request elaboration (if UI supports): "I need more details"
   - Or reject: "Not applicable" with optional explanation

9. **User Submits**
   - Clicks "Submit answer" button
   - Frontend calls `POST /api/v1/questions/{id}/answer` with:
     - `selectedOption`: "Option A"
     - OR `selectedOptions`: ["A", "B"]
     - OR `customText`: "Free-form answer"
     - OR `rejected: true` with `rejectionReason`
   - Backend stores answers: `INSERT INTO answers (...)`
   - Updates question status: `"pending"` → `"completed"`

10. **Agent Receives Answer**
    - MCP server was polling `GET /api/v1/questions/{id}`
    - Detects status change to `"completed"`
    - Extracts answer data
    - Formats response back to agent
    - Agent receives answer and continues execution

**Success Condition:** Agent receives answer and resumes execution. User's answer is logged. Inbox updated in real-time.

---

### Flow 3: API Key Management (Create, View, Revoke)

**Duration:** 1–2 minutes  
**Goal:** User safely manages API keys for different agents/projects

**Steps:**

1. **Navigate to Settings**
   - User goes to `/app/settings`
   - Sees tabs: General, API Keys, Notifications, Appearance

2. **View API Keys Tab**
   - Table showing:
     - Key name
     - Created date
     - Last used date
     - Masked key (first 4 + last 4 chars, e.g., `auq_...def123`)
     - Actions: Copy, View, Revoke
   - Example:
     ```
     | Name          | Created    | Last Used  | Key        | Actions   |
     |---------------|-----------|-----------|------------|-----------|
     | Claude Dev    | Mar 10    | Mar 17    | auq_...f1a | ... Revoke |
     | Cursor Key    | Jan 5     | Never     | auq_...8k2 | ... Revoke |
     ```

3. **Create New Key**
   - Click "Create new API key" button
   - Modal appears: "New API Key"
   - Input: Key name (text field, max 50 chars)
   - Click "Create"
   - Backend generates key:
     - Create random 48 bytes
     - Base58 encode
     - Prefix with `auq_`
     - Hash for storage: `SHA256(key)`
     - Store hash in DB: `INSERT INTO api_keys (...)`

4. **Display Key (One-Time)**
   - Modal shows:

     ```
     Your API Key (copy now, won't be shown again):

     auq_abcdef123456789ghijklmnop...xyz

     [Copy Button]
     [Close]
     ```

   - Button copies to clipboard
   - Modal closes after 30 seconds (security)
   - Key removed from display

5. **Use Key**
   - User adds to `AUQ_WEB_API_KEY` env var or `.auqrc.json`
   - AUQ CLI automatically uses it
   - Backend validates token on each request

6. **View Key Info (Non-Sensitive)**
   - Click "View" or key row
   - Shows:
     - Name
     - Created date/time
     - Last used date/time + IP/user agent
     - Workspace it belongs to
     - Actions: Copy (masked), Revoke

7. **Revoke Key**
   - Click "Revoke" button
   - Confirmation: "Are you sure? Active sessions will be interrupted."
   - On confirm:
     - Backend calls `DELETE /api/v1/workspaces/{id}/keys/{keyId}`
     - Deletes key from `api_keys` table
     - All subsequent requests with that key fail with `401 Unauthorized`
   - Key removed from table
   - Toast notification: "API key revoked"

8. **Use Revoked Key**
   - Agent tries to use revoked key
   - Backend rejects: `401 Unauthorized`
   - MCP server reports error to agent
   - User must create new key and reconfigure

**Success Condition:** User can create, view (masked), and revoke keys without exposing sensitive data multiple times.

---

### Flow 4: Analytics Dashboard (View Metrics)

**Duration:** 30–60 seconds  
**Goal:** User gains insights into their question patterns

**Steps:**

1. **Navigate to Analytics**
   - User goes to `/app/analytics`
   - Page title: "Analytics"
   - Subtitle: "Your question metrics for the last 30 days"

2. **Stats Cards (Top)**
   - Four cards in grid:

     ```
     ┌─────────────┐  ┌─────────────┐
     │   347       │  │   2h 14m    │
     │ Questions   │  │ Avg Response│
     │ (30 days)   │  │ Time        │
     └─────────────┘  └─────────────┘

     ┌─────────────┐  ┌─────────────┐
     │    45%      │  │     156     │
     │  Answered   │  │  Pending    │
     │   Ratio     │  │ (Active)    │
     └─────────────┘  └─────────────┘
     ```

   - Cards refresh on page load

3. **Questions Per Day Chart**
   - Title: "Questions Received (Last 30 Days)"
   - X-axis: Date (Mar 1 → Mar 31)
   - Y-axis: Count (0 → peak)
   - Type: Area chart with line overlay
   - Color: Amber accent
   - Tooltip on hover shows exact count + date
   - Interactive legend to toggle series
   - Example data:
     ```
     Mar 1:  12 questions
     Mar 2:  8 questions
     Mar 5:  34 questions (spike)
     Mar 10: 23 questions
     ...
     ```

4. **Response Time Distribution Chart**
   - Title: "Response Time Distribution"
   - X-axis: Time buckets (0-5min, 5-15min, 15-60min, 1h+)
   - Y-axis: Number of answers
   - Type: Bar chart
   - Color: Amber for normal, highlight if slow
   - Example:
     ```
     0-5 min:   120 (fastest)
     5-15 min:  156
     15-60 min: 52
     1h+:       19 (slowest)
     ```

5. **Answer Rate Chart** (Optional)
   - Title: "Answer Rate Trend"
   - Shows rolling 7-day average of answer rate (%)
   - X-axis: Week dates
   - Y-axis: Percentage (0–100%)
   - Type: Line chart
   - Helps identify when user is most/least responsive

6. **Data Fetching**
   - Page calls `GET /api/v1/analytics`
   - Backend query:
     ```sql
     SELECT
       DATE(created_at) as day,
       COUNT(*) as count
     FROM questions
     WHERE workspace_id = ? AND created_at > NOW() - 30 days
     GROUP BY day
     ORDER BY day
     ```
   - Response schema:
     ```json
     {
       "questionsPerDay": [
         { "date": "2026-03-01", "count": 12 },
         { "date": "2026-03-02", "count": 8 }
       ],
       "avgResponseTimeMs": 834000,
       "answeredCount": 347,
       "pendingCount": 156,
       "rejectedCount": 8,
       "totalCount": 511,
       "responseTimeDistribution": {
         "0-5m": 120,
         "5-15m": 156,
         "15-60m": 52,
         "1h+": 19
       }
     }
     ```

7. **Export Option** (Future)
   - Button: "Export as CSV"
   - Downloads daily metrics as CSV for external analysis

**Success Condition:** User can see clear metrics on their question answering patterns and identify trends.

---

## 5. Feature Requirements

### Priority: P0 (MVP — Must Have)

These features are **required for launch**. Without them, the product is non-functional.

#### 5.1 Authentication & Account Management

**Requirement:** Email/password + OAuth (GitHub, Google) sign-up and login

- [ ] Better-auth integration with Drizzle SQLite adapter
- [ ] User table: `id`, `email`, `name`, `createdAt`, `updatedAt`
- [ ] Session management: `session`, `account`, `verification` tables auto-created
- [ ] Email/password signup with validation (email unique, password min 8 chars)
- [ ] Email verification (optional but recommended for security)
- [ ] GitHub OAuth flow (client ID + secret configured)
- [ ] Google OAuth flow (client ID + secret configured)
- [ ] Login page at `/login` with all three auth methods
- [ ] Signup page at `/signup` with all three auth methods
- [ ] Password reset flow (email-based token)
- [ ] Logout functionality (clear session cookie + API token)
- [ ] Session persistence in localStorage + httpOnly cookie
- [ ] Redirect to `/app/inbox` after successful auth
- [ ] Redirect to `/login?redirect=X` if accessing protected route unauthenticated

---

#### 5.2 Workspace Creation & Management

**Requirement:** Each user can create and manage workspaces (isolated question/key spaces)

- [ ] Workspace table: `id`, `name`, `userId`, `createdAt`, `updatedAt`
- [ ] On signup, create default workspace named "My Workspace"
- [ ] User can create additional workspaces (settings page)
- [ ] Each workspace is isolated: questions, keys, subscriptions per workspace
- [ ] Workspace switcher in app nav (dropdown or separate page)
- [ ] Rename workspace (PATCH endpoint)
- [ ] Delete workspace (cascade deletes keys, questions)
- [ ] User must own workspace to access it (authorization check)

---

#### 5.3 API Key Management

**Requirement:** Users can create, view (masked), and revoke API keys per workspace

**Database:**

- [ ] `api_keys` table with: `id`, `workspace_id`, `key_hash`, `name`, `createdAt`, `expiresAt`, `lastUsedAt`
- [ ] Key hash: SHA256 of actual key (never store plain key)
- [ ] Key format: `auq_` + base58(random 48 bytes) = ~64 chars total

**API Endpoints:**

- [ ] `POST /api/v1/workspaces/{id}/keys` — Create key (returns unhashed key once)
- [ ] `GET /api/v1/workspaces/{id}/keys` — List keys (masked: show first 4 + last 4 only)
- [ ] `DELETE /api/v1/workspaces/{id}/keys/{keyId}` — Revoke key

**Frontend:**

- [ ] Settings page → API Keys tab
- [ ] Table of keys with: name, created, last used, masked key, actions
- [ ] "Create new API key" button → modal → input name → returns full key once → copy button
- [ ] "Revoke" button → confirmation dialog → deletes key
- [ ] Toast notifications on create/revoke

**Authentication:**

- [ ] All API endpoints validate key: `Authorization: Bearer <key>`
- [ ] Look up key by hash in `api_keys` table
- [ ] Check `expiresAt` (if set)
- [ ] Check `workspace_id` for authorization
- [ ] Return 401 if key invalid/expired

---

#### 5.4 Question Inbox (Real-Time SSE)

**Requirement:** Users see pending questions in real-time, with push notifications

**Database:**

- [ ] `questions` table: `id`, `workspace_id`, `status`, `title`, `questionsJson`, `createdAt`, `updatedAt`
- [ ] Status enum: `pending`, `in_progress`, `completed`, `rejected`, `timed_out`, `abandoned`
- [ ] `questionsJson` stores full question list as JSON (from MCP request)

**API Endpoints:**

- [ ] `POST /api/v1/questions` — Create question (called by MCP server)
  - Input: `questionsJson`, `title` (optional)
  - Returns: `{ id, status: "pending", createdAt }`
- [ ] `GET /api/v1/questions/{id}` — Get question + answers
  - Returns: question metadata + all answers for each question index
- [ ] `GET /api/v1/questions/stream` — SSE stream of question events
  - Bearer token via query param: `?token=<key>`
  - Sends events: `question:created`, `question:answered`, `question:expired`
  - Each event includes full question data

**Frontend:**

- [ ] Inbox page at `/app/inbox`
- [ ] Fetches SSE stream on mount: `GET /api/v1/questions/stream?token=<key>`
- [ ] Displays question cards in real-time as events arrive
- [ ] Question status badge: "Pending" (blue), "Answered" (green), "Rejected" (yellow)
- [ ] Sort by: newest first (default), oldest first, status
- [ ] Filter by status: All, Pending, Answered, Rejected
- [ ] Click card to expand (or navigate to `/app/questions/{id}`)
- [ ] Search by title/prompt (client-side or server-side)
- [ ] "Answer" button → opens answer form

**Empty States:**

- [ ] No questions: "No pending questions. You're all caught up! 🎉"
- [ ] Loading: Skeleton cards
- [ ] Error (SSE disconnected): "Connection lost. Reconnecting..." + auto-retry

---

#### 5.5 Question Detail & Answer Form

**Requirement:** Users can answer single questions with multiple choice, multi-choice, or free-form text

**Page:** `/app/questions/{id}`

**Components:**

- [ ] Question card showing:
  - Full prompt (markdown support)
  - Agent name (if provided in MCP request)
  - Created timestamp
  - Status badge
- [ ] Answer form:
  - For `singleSelect`: Radio buttons for each option
  - For `multiSelect`: Checkboxes for each options
  - For `freeText`: Text input or textarea
  - "Other" option with custom text field if supported
- [ ] Action buttons:
  - "Submit answer" (enabled only if answer selected)
  - "Request elaboration" (if supported)
  - "Not applicable / Reject" (with optional reason text field)
- [ ] Confirmation: "Are you sure?" before submitting

**API Endpoints:**

- [ ] `POST /api/v1/questions/{id}/answer` — Submit answer(s)
  - Input: `selectedOption`, `selectedOptions`, `customText`, OR `rejected: true`
  - Creates `answers` table row(s): one per question index
  - Updates question `status` to `"completed"` or `"rejected"`
  - Returns: `{ status, answeredAt }`

**Frontend:**

- [ ] Page loads question: `GET /api/v1/questions/{id}`
- [ ] Renders form based on question type
- [ ] On submit: `POST /api/v1/questions/{id}/answer`
- [ ] On success: show toast "Answer submitted ✓" → redirect to inbox or next question
- [ ] On error: show error toast + retry button

---

#### 5.6 Push Notifications (Web Push API)

**Requirement:** Users get native OS notifications when questions arrive (optional but recommended)

**Database:**

- [ ] `push_subscriptions` table: `id`, `workspace_id`, `endpoint`, `p256dh`, `auth`, `userAgent`, `createdAt`, `lastUsedAt`
- [ ] Stores Web Push API subscription objects

**Backend:**

- [ ] VAPID keys configured: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
- [ ] Endpoint: `GET /api/v1/push/vapid-key` — returns public key (public, no auth needed)
- [ ] Endpoint: `POST /api/v1/push/subscribe` — saves subscription
  - Input: `subscription` object from service worker
  - Stores in `push_subscriptions`
- [ ] Endpoint: `POST /api/v1/push/unsubscribe` — removes subscription
- [ ] On question created: send Web Push to all subscriptions in that workspace
  - Title: `"New Question: {title}"`
  - Body: First 100 chars of prompt
  - Icon: AUQ logo
  - Badge: Notification badge icon
  - Action buttons: "View", "Dismiss"

**Frontend (Service Worker):**

- [ ] Service worker registered on app load
- [ ] On notification click with action="View": open `/app/inbox`
- [ ] On notification click without action: open `/app/questions/{id}` (if available in notification data)
- [ ] Subscription flow:
  - `Settings → Notifications tab`
  - "Enable push notifications" button
  - Browser prompts for permission
  - On grant: subscribe via Web Push API
  - Send subscription to `POST /api/v1/push/subscribe`
  - Button changes to "Disable push notifications"

**Requirements:**

- [ ] HTTPS only (Web Push requires secure context)
- [ ] Graceful fallback if VAPID keys not configured (return 501 Not Implemented on push endpoints)
- [ ] Batching: If 3+ questions arrive within 2 seconds, send single "You have 5 new questions" notification instead of 5 notifications

---

#### 5.7 Core Frontend Pages

**Requirement:** Essential UI pages for users to interact with the system

**Pages to Build:**

1. **Landing Page** (`/`)
   - [ ] Hero section: "Keep your hand on the wheel" + typewriter animation
   - [ ] Feature cards (bento grid): Mobile, Async, Analytics, Notifications, Open Source
   - [ ] Pricing teaser cards: Free vs Pro
   - [ ] CTA button: "Get Started" → `/signup`
   - [ ] Footer: Links, copyright

2. **Pricing Page** (`/pricing`)
   - [ ] Free tier card: Features, price ($0/month), CTA
   - [ ] Pro tier card: Features, price ($X/month), CTA
   - [ ] Feature comparison table
   - [ ] FAQ section

3. **Login Page** (`/login`)
   - [ ] Email/password form
   - [ ] OAuth buttons: GitHub, Google
   - [ ] "Sign up" link → `/signup`
   - [ ] "Forgot password?" link
   - [ ] better-auth forms/hooks

4. **Signup Page** (`/signup`)
   - [ ] Email/password form
   - [ ] OAuth buttons: GitHub, Google
   - [ ] "Already have account?" → `/login`
   - [ ] Terms/privacy links
   - [ ] better-auth forms/hooks

5. **App Shell** (`/app/+layout.svelte`)
   - [ ] Sidebar navigation (desktop) or hamburger menu (mobile)
   - [ ] Nav items: Inbox, Analytics, Settings, Admin (if user is admin)
   - [ ] User avatar + name in nav
   - [ ] Workspace switcher dropdown
   - [ ] Dark mode toggle
   - [ ] Logout button
   - [ ] Responsive: Sidebar collapsible on mobile

6. **Inbox Page** (`/app/inbox`)
   - [ ] Question card list
   - [ ] Status filters: All, Pending, Answered, Rejected
   - [ ] Sort by: Newest, Oldest, Status
   - [ ] Search by title/prompt
   - [ ] Empty state
   - [ ] Real-time updates via SSE

7. **Question Detail Page** (`/app/questions/{id}`)
   - [ ] Full question + metadata
   - [ ] Answer form (single/multi/free-text)
   - [ ] Submit/reject buttons

8. **Analytics Page** (`/app/analytics`)
   - [ ] Stats cards: Total, Pending, Response time, etc.
   - [ ] Charts: Questions/day, Response time distribution
   - [ ] 30-day view by default

9. **Settings Page** (`/app/settings`)
   - [ ] Tabs: General, API Keys, Notifications, Appearance
   - [ ] General: Profile name, email, delete account
   - [ ] API Keys: List, create, revoke
   - [ ] Notifications: Enable/disable push, email digest
   - [ ] Appearance: Light/dark toggle, font size

10. **Admin Page** (`/app/admin`)
    - [ ] Workspace management table: Name, users, created date, actions
    - [ ] User management (if multi-user workspaces enabled)
    - [ ] System stats: Total questions, total users, etc.
    - [ ] Only visible if user is workspace admin

---

### Priority: P1 (Important — Should Have)

These features improve UX and analytics. Ship them in the first major update or Phase 2.

#### 5.8 Analytics Dashboard (Full)

- [ ] Question volume trends
- [ ] Response time analytics
- [ ] Agent/source breakdown
- [ ] Custom date range selection
- [ ] Export data to CSV
- [ ] Email digest of weekly metrics

#### 5.9 Settings & Preferences

- [ ] Profile page: Edit name, avatar, email
- [ ] Notification settings: Email digest frequency, quiet hours
- [ ] Appearance: Font size, sidebar width
- [ ] Language: English, Korean (i18n)

#### 5.10 Question Metadata & Tagging

- [ ] Optional: Agents can tag questions with categories (e.g., "database", "ui", "deployment")
- [ ] Users can filter inbox by tags
- [ ] Analytics broken down by tag

#### 5.11 Question History & Archiving

- [ ] Completed questions moved to history
- [ ] History searchable by date, keyword, status
- [ ] Archive old questions (> 30 days) to separate view
- [ ] Bulk actions: Mark as read, delete

#### 5.12 Team Features (Pro Tier Foundation)

- [ ] Invite users to workspace (email-based)
- [ ] Role-based access: Admin, Member, Viewer
- [ ] User list in workspace settings
- [ ] Remove users from workspace

---

### Priority: P2 (Nice to Have — Can Ship Later)

These features enable future premium offerings and advanced use cases.

#### 5.13 Billing & Subscription Management

- [ ] Stripe integration
- [ ] Monthly plan selection
- [ ] Invoice history
- [ ] Usage tracking (questions/month)
- [ ] Overage warnings

#### 5.14 Advanced Analytics

- [ ] Drill-down into specific agent's questions
- [ ] Agent-to-agent question routing (A asks B's questions)
- [ ] Response time SLA tracking
- [ ] Custom dashboards

#### 5.15 Multi-Workspace Features

- [ ] Multiple workspaces per user
- [ ] Workspace-to-workspace question delegation
- [ ] Shared question libraries

#### 5.16 API Rate Limiting & Quotas

- [ ] Rate limiting per API key: X requests/minute
- [ ] Question quota per workspace: X questions/month (on Pro)
- [ ] Return `429 Too Many Requests` when exceeded
- [ ] Display remaining quota in settings

#### 5.17 Webhooks & Integrations

- [ ] Webhook callbacks when questions answered
- [ ] Slack integration: Send questions to Slack, answer from Slack
- [ ] Zapier/Make integration

#### 5.18 Mobile Native App

- [ ] React Native app (iOS + Android)
- [ ] Offline answer caching
- [ ] Biometric unlock
- [ ] Homescreen widget

---

## 6. API Specification

All endpoints require **Bearer token authentication** via `Authorization: Bearer <api_key>` header, unless marked public.

### 6.1 Base URL

```
https://auq.paulp.dev/api/v1
```

Or self-hosted:

```
https://your-instance.com/api/v1
```

### 6.2 Workspace Endpoints

#### Create Workspace (Bootstrap)

```
POST /api/v1/workspaces
Content-Type: application/json
Authorization: None (public, used during signup)

Request:
{
  "name": "My Workspace"
}

Response (201 Created):
{
  "id": "ws_abc123...",
  "name": "My Workspace",
  "userId": "user_123...",
  "createdAt": "2026-03-17T10:30:00Z",
  "updatedAt": "2026-03-17T10:30:00Z"
}

Errors:
- 400 Bad Request: Missing name
- 409 Conflict: Workspace name already exists for user
```

#### Get Workspace

```
GET /api/v1/workspaces/{id}
Authorization: Bearer <api_key>

Response (200 OK):
{
  "id": "ws_abc123...",
  "name": "My Workspace",
  "userId": "user_123...",
  "questionCount": 347,
  "createdAt": "2026-03-17T10:30:00Z",
  "updatedAt": "2026-03-17T10:30:00Z"
}

Errors:
- 401 Unauthorized: Invalid/missing token
- 403 Forbidden: User doesn't own workspace
- 404 Not Found: Workspace not found
```

#### Update Workspace

```
PATCH /api/v1/workspaces/{id}
Content-Type: application/json
Authorization: Bearer <api_key>

Request:
{
  "name": "New Name"
}

Response (200 OK): Updated workspace object

Errors: 401, 403, 404
```

---

### 6.3 API Key Endpoints

#### Create API Key

```
POST /api/v1/workspaces/{id}/keys
Content-Type: application/json
Authorization: Bearer <api_key>

Request:
{
  "name": "Claude Dev"
}

Response (201 Created):
{
  "id": "key_xyz...",
  "name": "Claude Dev",
  "key": "auq_abcdef123456...",  // ONLY SHOWN ONCE
  "createdAt": "2026-03-17T10:30:00Z"
}

Errors:
- 400 Bad Request: Missing name
- 401 Unauthorized
- 403 Forbidden
```

#### List API Keys

```
GET /api/v1/workspaces/{id}/keys
Authorization: Bearer <api_key>

Response (200 OK):
{
  "keys": [
    {
      "id": "key_xyz...",
      "name": "Claude Dev",
      "key": "auq_...f1a",  // Masked: first 4 + last 4
      "createdAt": "2026-03-17T10:30:00Z",
      "lastUsedAt": "2026-03-17T14:22:00Z"
    },
    {
      "id": "key_123...",
      "name": "Cursor Key",
      "key": "auq_...8k2",
      "createdAt": "2026-02-10T09:15:00Z",
      "lastUsedAt": null
    }
  ]
}

Errors: 401, 403, 404
```

#### Revoke API Key

```
DELETE /api/v1/workspaces/{id}/keys/{keyId}
Authorization: Bearer <api_key>

Response (204 No Content)

Errors:
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found: Key not found
```

---

### 6.4 Question Endpoints

#### Create Question (Called by MCP Server)

```
POST /api/v1/questions
Content-Type: application/json
Authorization: Bearer <api_key>

Request:
{
  "title": "Database choice",
  "questionsJson": [
    {
      "id": "q1",
      "title": "Database",
      "prompt": "Should we use PostgreSQL or MongoDB?",
      "type": "singleSelect",
      "options": [
        {"id": "opt1", "label": "PostgreSQL", "description": "ACID, structured"},
        {"id": "opt2", "label": "MongoDB", "description": "NoSQL, flexible"}
      ]
    }
  ]
}

Response (201 Created):
{
  "id": "ques_abc123...",
  "status": "pending",
  "title": "Database choice",
  "createdAt": "2026-03-17T10:30:00Z",
  "updatedAt": "2026-03-17T10:30:00Z"
}

Errors:
- 400 Bad Request: Invalid questionsJson schema
- 401 Unauthorized
- 413 Payload Too Large: questionsJson > 100KB
```

#### Get Question (Polling)

```
GET /api/v1/questions/{id}
Authorization: Bearer <api_key>

Response (200 OK):
{
  "id": "ques_abc123...",
  "status": "completed",  // or "pending", "rejected", etc.
  "title": "Database choice",
  "questions": [...],  // Original questionsJson
  "answers": [
    {
      "questionIndex": 0,
      "selectedOption": "opt1",
      "answeredAt": "2026-03-17T10:35:00Z"
    }
  ],
  "createdAt": "2026-03-17T10:30:00Z",
  "updatedAt": "2026-03-17T10:35:00Z"
}

Errors:
- 401 Unauthorized
- 403 Forbidden: User doesn't own question's workspace
- 404 Not Found
```

#### Stream Questions (SSE)

```
GET /api/v1/questions/stream?token=<api_key>
Accept: text/event-stream
Authorization: Bearer <api_key> (or via query param)

Response: Text stream of Server-Sent Events

Example events:
event: question:created
data: {"id": "ques_xyz...", "title": "...", "status": "pending", ...}

event: question:answered
data: {"id": "ques_xyz...", "status": "completed", "answers": [...]}

event: question:expired
data: {"id": "ques_xyz...", "status": "timed_out", "reason": "30-minute timeout"}

event: keep-alive
data: {}  // Sent every 30 seconds to keep connection alive

Errors:
- 401 Unauthorized
- Connection closes on 404 (workspace deleted)
```

#### Submit Answer

```
POST /api/v1/questions/{id}/answer
Content-Type: application/json
Authorization: Bearer <api_key>

Request (single-select):
{
  "questionIndex": 0,
  "selectedOption": "opt1"
}

Request (multi-select):
{
  "questionIndex": 0,
  "selectedOptions": ["opt1", "opt2"]
}

Request (free-text):
{
  "questionIndex": 0,
  "customText": "Use both based on use case"
}

Request (rejection):
{
  "questionIndex": 0,
  "rejected": true,
  "rejectionReason": "Not applicable to our project"
}

Response (200 OK):
{
  "id": "ans_def456...",
  "questionId": "ques_abc123...",
  "questionIndex": 0,
  "answeredAt": "2026-03-17T10:35:00Z"
}

Errors:
- 400 Bad Request: Missing required field, invalid option
- 401 Unauthorized
- 404 Not Found
- 409 Conflict: Question already answered
```

#### Delete Question (Mark Abandoned)

```
DELETE /api/v1/questions/{id}
Authorization: Bearer <api_key>

Response (204 No Content)

Notes:
- Soft delete: marks status as "abandoned" but keeps record
- Used when agent disconnects and question becomes orphaned

Errors: 401, 403, 404
```

---

### 6.5 Analytics Endpoints

#### Get Analytics Summary

```
GET /api/v1/analytics
Authorization: Bearer <api_key>
Query params: ?days=30  (optional, default 30)

Response (200 OK):
{
  "questionsPerDay": [
    {"date": "2026-02-16", "count": 12},
    {"date": "2026-02-17", "count": 8},
    ...
  ],
  "avgResponseTimeMs": 834000,
  "answeredCount": 347,
  "pendingCount": 156,
  "rejectedCount": 8,
  "abandonedCount": 5,
  "totalCount": 516,
  "responseTimeDistribution": {
    "0-5m": 120,
    "5-15m": 156,
    "15-60m": 52,
    "1h+": 19
  },
  "dailyAverageResponseTime": [
    {"date": "2026-02-16", "avgMs": 720000},
    ...
  ]
}

Errors: 401
```

---

### 6.6 Push Notification Endpoints

#### Get VAPID Public Key

```
GET /api/v1/push/vapid-key
Authorization: None (public)

Response (200 OK):
{
  "publicKey": "base64_encoded_vapid_public_key..."
}
```

#### Subscribe to Push

```
POST /api/v1/push/subscribe
Content-Type: application/json
Authorization: Bearer <api_key>

Request:
{
  "subscription": {
    "endpoint": "https://fcm.googleapis.com/...",
    "keys": {
      "p256dh": "...",
      "auth": "..."
    }
  }
}

Response (201 Created):
{
  "id": "sub_123...",
  "createdAt": "2026-03-17T10:30:00Z"
}

Errors:
- 400 Bad Request: Invalid subscription object
- 401 Unauthorized
- 501 Not Implemented: VAPID keys not configured
```

#### Unsubscribe from Push

```
POST /api/v1/push/unsubscribe
Content-Type: application/json
Authorization: Bearer <api_key>

Request:
{
  "endpoint": "https://fcm.googleapis.com/..."
}

Response (204 No Content)

Errors: 401
```

---

## 7. Data Model

### Database Schema (SQLite with Drizzle ORM)

#### 7.1 Users (better-auth managed)

```sql
CREATE TABLE user (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  emailVerified BOOLEAN DEFAULT FALSE,
  image TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);
```

#### 7.2 Sessions (better-auth managed)

```sql
CREATE TABLE session (
  id TEXT PRIMARY KEY,
  expiresAt INTEGER NOT NULL,
  token TEXT UNIQUE NOT NULL,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  ipAddress TEXT,
  userAgent TEXT,
  userId TEXT NOT NULL REFERENCES user(id)
);
```

#### 7.3 Accounts (better-auth OAuth)

```sql
CREATE TABLE account (
  id TEXT PRIMARY KEY,
  accountId TEXT NOT NULL,
  providerId TEXT NOT NULL,
  userId TEXT NOT NULL REFERENCES user(id),
  accessToken TEXT,
  refreshToken TEXT,
  expiresAt INTEGER,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);
```

#### 7.4 Workspaces

```sql
CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES user(id),
  name TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);
```

#### 7.5 API Keys

```sql
CREATE TABLE api_keys (
  id TEXT PRIMARY KEY,
  workspaceId TEXT NOT NULL REFERENCES workspaces(id),
  keyHash TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  expiresAt INTEGER,
  lastUsedAt INTEGER,
  lastUsedIp TEXT,
  lastUsedUserAgent TEXT
);
```

**Key Hash Computation:**

```
key = "auq_" + base58(random(48 bytes))
keyHash = sha256(key)  // Store this in DB
```

#### 7.6 Questions

```sql
CREATE TABLE questions (
  id TEXT PRIMARY KEY,
  workspaceId TEXT NOT NULL REFERENCES workspaces(id),
  status TEXT NOT NULL CHECK(status IN ('pending', 'in_progress', 'completed', 'rejected', 'timed_out', 'abandoned')),
  title TEXT,
  questionsJson TEXT NOT NULL,  // JSON array of question objects
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  timeoutAt INTEGER  -- Expiration time (optional)
);
```

#### 7.7 Answers

```sql
CREATE TABLE answers (
  id TEXT PRIMARY KEY,
  questionId TEXT NOT NULL REFERENCES questions(id),
  questionIndex INTEGER NOT NULL,
  selectedOption TEXT,  -- For single-select
  selectedOptionsJson TEXT,  -- For multi-select: JSON array
  customText TEXT,  -- For free-text
  rejected BOOLEAN DEFAULT FALSE,
  rejectionReason TEXT,
  answeredAt INTEGER NOT NULL
);
```

#### 7.8 Push Subscriptions

```sql
CREATE TABLE push_subscriptions (
  id TEXT PRIMARY KEY,
  workspaceId TEXT NOT NULL REFERENCES workspaces(id),
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  userAgent TEXT,
  createdAt INTEGER NOT NULL,
  lastUsedAt INTEGER
);
```

### Indexes for Performance

```sql
CREATE INDEX idx_questions_workspace_id ON questions(workspaceId);
CREATE INDEX idx_questions_status ON questions(status);
CREATE INDEX idx_questions_created_at ON questions(createdAt);
CREATE INDEX idx_api_keys_workspace_id ON api_keys(workspaceId);
CREATE INDEX idx_api_keys_key_hash ON api_keys(keyHash);
CREATE INDEX idx_answers_question_id ON answers(questionId);
CREATE INDEX idx_push_subscriptions_workspace_id ON push_subscriptions(workspaceId);
```

---

## 8. Frontend Routes & Pages

### Public Routes (No Auth Required)

| Path       | Component    | Purpose                                  |
| ---------- | ------------ | ---------------------------------------- |
| `/`        | Landing page | Hero + features + pricing teaser + CTA   |
| `/pricing` | Pricing page | Free vs Pro tiers, comparison table, FAQ |
| `/login`   | Login form   | Email/password + OAuth (GitHub, Google)  |
| `/signup`  | Signup form  | Email/password + OAuth                   |

### Authenticated Routes (Require Session)

| Path                  | Component           | Purpose                                            |
| --------------------- | ------------------- | -------------------------------------------------- |
| `/app`                | App shell           | Redirect to `/app/inbox`                           |
| `/app/inbox`          | Inbox               | Question list + SSE stream + filters               |
| `/app/questions/{id}` | Question detail     | Full question + answer form                        |
| `/app/analytics`      | Analytics dashboard | Charts + stats                                     |
| `/app/settings`       | Settings            | Tabs: General, API Keys, Notifications, Appearance |
| `/app/admin`          | Admin panel         | Workspace + user management (admin only)           |

### API Routes (REST)

All under `/api/v1/`:

| Method | Path                            | Auth   | Purpose                    |
| ------ | ------------------------------- | ------ | -------------------------- |
| POST   | `/questions`                    | Bearer | Create question            |
| GET    | `/questions/{id}`               | Bearer | Get question + answers     |
| DELETE | `/questions/{id}`               | Bearer | Mark abandoned             |
| POST   | `/questions/{id}/answer`        | Bearer | Submit answer              |
| GET    | `/questions/stream`             | Bearer | SSE stream                 |
| GET    | `/analytics`                    | Bearer | Get analytics              |
| POST   | `/workspaces`                   | None   | Bootstrap workspace        |
| GET    | `/workspaces/{id}`              | Bearer | Get workspace              |
| PATCH  | `/workspaces/{id}`              | Bearer | Update workspace           |
| POST   | `/workspaces/{id}/keys`         | Bearer | Create API key             |
| GET    | `/workspaces/{id}/keys`         | Bearer | List keys                  |
| DELETE | `/workspaces/{id}/keys/{keyId}` | Bearer | Revoke key                 |
| GET    | `/push/vapid-key`               | None   | Get public VAPID key       |
| POST   | `/push/subscribe`               | Bearer | Register push subscription |
| POST   | `/push/unsubscribe`             | Bearer | Unsubscribe from push      |

---

## 9. Non-Functional Requirements

### Performance

- **Page load:** < 2 seconds (first contentful paint)
- **Inbox render:** < 200ms (SSE messages to UI update)
- **API response time:** < 500ms (p95) for all endpoints
- **Analytics page:** < 1 second to load and render charts
- **Database query:** < 100ms for typical queries

### Scalability

- **Concurrent users:** 10,000+ simultaneously connected (via SSE)
- **Questions/day:** 1M+ questions per day
- **Storage:** SQLite for dev/small deployments, PostgreSQL for production
- **Horizontal scaling:** Stateless API servers + shared database

### Reliability

- **Uptime:** 99.9% (1 nine for beta, target 99.95% for production)
- **SSE reconnection:** Auto-reconnect within 5 seconds on disconnect
- **Question durability:** At-least-once delivery (store before notifying)
- **Backup:** Daily database backups, 30-day retention

### Security

- **HTTPS only:** All endpoints require TLS 1.2+
- **API key hashing:** SHA256(key) stored, plain key never logged
- **Session tokens:** httpOnly + Secure cookies
- **Rate limiting:** 1000 req/min per API key (adjustable per tier)
- **CORS:** Restrict to origin domains
- **CSRF protection:** SvelteKit built-in CSRF tokens
- **SQL injection:** Drizzle ORM parameterized queries
- **XSS protection:** Svelte auto-escaping + CSP headers

### Accessibility

- **WCAG 2.1 AA:** All pages meet accessibility standards
- **Keyboard navigation:** Full keyboard support
- **Screen readers:** All interactive elements labeled
- **Color contrast:** 4.5:1 for text
- **Mobile:** Works on 375px viewport (iPhone SE)

### Mobile & PWA

- **Responsive design:** Mobile-first approach
- **Service worker:** Offline question caching, background sync
- **Install prompt:** "Add to homescreen" works on iOS/Android
- **Touch targets:** 44px minimum for all buttons
- **Network resilience:** Graceful degradation on slow networks

### Internationalization (Phase 2)

- [ ] English (en) — default
- [ ] Korean (ko) — requested
- [ ] Date/time localization
- [ ] Number formatting (decimal separators, etc.)

---

## 10. Recommended Tech Stack

### If Rebuilding from Scratch (e.g., React)

**Frontend:**

- **Framework:** React 19+ with React Router v7 (or Remix)
- **Styling:** Tailwind CSS v4 + shadcn/ui (React components)
- **State:** TanStack Query (data fetching) + Zustand (UI state)
- **Charts:** Recharts or D3 + React wrapper
- **Auth:** next-auth (if using Next.js) or custom auth hooks
- **Build:** Vite

**Backend:**

- **Framework:** Express.js + TypeScript or Fastify
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** Passport.js or jsonwebtoken + bcrypt
- **Validation:** Zod or Yup
- **Hosting:** Docker + Kubernetes or traditional VPS

**Why React over SvelteKit:**

- Larger ecosystem and community
- More third-party component libraries
- Easier to hire developers
- Better TypeScript integration (mature)
- Proven at scale in large orgs

**Current Stack (SvelteKit) Trade-offs:**

- ✅ Smaller bundle, faster initial load
- ✅ Less boilerplate (Svelte is elegant)
- ✅ Excellent developer experience
- ❌ Smaller ecosystem
- ❌ Harder to find developers
- ❌ better-auth is community-maintained

---

## 11. Success Metrics

### Usage Metrics

- **Daily Active Users (DAU):** Target 1,000+ within 3 months
- **Monthly Active Users (MAU):** Target 5,000+ within 6 months
- **Questions answered/day:** Target 50,000+ within 6 months
- **Avg response time:** < 5 minutes (target)

### Quality Metrics

- **Uptime:** 99.9%+
- **Page load time:** < 2s (p95)
- **API latency:** < 500ms (p95)
- **Error rate:** < 0.1%

### Adoption Metrics

- **Signup-to-first-answer:** < 5 minutes
- **API key creation success rate:** > 95%
- **Push notification opt-in:** > 60%
- **30-day retention:** > 70%

### Business Metrics

- **Free-to-Pro conversion:** > 10%
- **MRR (Monthly Recurring Revenue):** Target $10k by end of year
- **Customer acquisition cost (CAC):** < $50
- **Lifetime value (LTV):** > $500

---

## 12. Migration & Rollout Plan

### Phase 1: MVP (Week 1-4)

- [ ] Setup better-auth + Drizzle migrations
- [ ] Build auth pages (login/signup)
- [ ] Build landing + pricing pages
- [ ] Build inbox + answer form
- [ ] Implement API key management
- [ ] Deploy to staging environment

### Phase 2: Polish (Week 5-6)

- [ ] Add push notifications
- [ ] Add analytics dashboard
- [ ] Add settings page + appearance toggle
- [ ] Add admin page
- [ ] Performance optimization
- [ ] Security audit

### Phase 3: Launch (Week 7)

- [ ] Deploy to production
- [ ] DNS + SSL setup
- [ ] Announce publicly
- [ ] Monitor uptime/errors
- [ ] Iterate on feedback

### Phase 4: Pro Features (Month 2+)

- [ ] Team workspace management
- [ ] Billing integration (Stripe)
- [ ] Advanced analytics
- [ ] Mobile app
- [ ] Webhooks + integrations

---

## 13. References

### Related Documentation

- [Design System](./auq-design-system.md)
- [Open Questions & Architecture Decisions](./auq-open-questions.md)
- [Frontend Redesign Proposal](../changes/2026-03-16-frontend-redesign/proposal.md)
- [Technical Design Document](../changes/2026-03-16-frontend-redesign/design.md)

### External Resources

- [SvelteKit Docs](https://kit.svelte.dev)
- [better-auth Docs](https://better-auth.vercel.app)
- [shadcn-svelte Docs](https://www.shadcn-svelte.com)
- [Drizzle ORM Docs](https://orm.drizzle.team)
- [Web Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)

---

**Last Reviewed:** March 2026  
**Next Review:** June 2026 (quarterly)
