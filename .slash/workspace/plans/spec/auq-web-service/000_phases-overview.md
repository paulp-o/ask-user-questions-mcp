---
created: 2026-03-15T12:00:00Z
last_updated: 2026-03-15T12:00:00Z
type: spec
change_id: auq-web-service
status: active
trigger: "Build web server-based AUQ that delegates ask_user_questions to external web service with PWA + push notifications"
estimated_phases: 10
---

# Phases Overview: AUQ Web Service

## Background & Research

### Architecture Decisions (Interview Results)
- **Vision**: Open source with optional hosted version. All code open source. Users can self-host.
- **Repo split**: THIS repo gets `packages/shared` + `packages/web-adapter` + MCP server web mode. SEPARATE repo `auq-web-platform` gets SvelteKit app (API + frontend + PWA).
- **Tech stack**: SvelteKit (single-deployable API+frontend), SQLite+Drizzle (DB), Web Push VAPID + polling fallback, simple API key auth, workspace routing.
- **Realtime**: Agent side = polling every 2-5s. Browser side = SSE for instant updates.
- **MCP Elicitation**: Both AUQ native format AND MCP Elicitation via adapter. Same answering UX for TUI and web.
- **Frontend**: SvelteKit PWA (lightest real framework, single deployable).
- **DB**: SQLite sufficient for expected load. Drizzle ORM. Self-hosters can use Postgres if desired.
- **Notifications**: Web Push (VAPID) when configured, polling fallback when not.
- **Auth MVP**: Workspace + API key. Simple session auth for web UI.
- **Deployment**: Serverless (Vercel/CF). Single deployable unit.

### Current Codebase Key Patterns
- SessionManager (src/session/SessionManager.ts): createSession → waitForAnswers (200ms polling) → validate → format response
- Session states: pending → in-progress → completed/rejected/timed_out/abandoned
- Schemas (src/shared/schemas.ts): OptionSchema, QuestionSchema (with factory functions for configurable limits), AskUserQuestionsParametersSchema
- MCP server (src/server.ts): FastMCP, 2 tools (ask_user_questions, get_answered_questions), AbortSignal disconnect handling
- File-based IPC: XDG dirs, atomic file ops (temp+rename), session dirs with request.json/status.json/answers.json
- Build: TypeScript 5.8+, Bun runtime, Vitest, semantic-release

### OpenSpec Artifacts
- Proposal: `openspec/changes/auq-web-service/proposal.md`
- Design: `openspec/changes/auq-web-service/design.md`
- Tasks: `openspec/changes/auq-web-service/tasks.md` (115 tasks across 7 task-phases)

---

## Phase 1: Shared Package Extraction (~8min)
- **Target tasks**: tasks.md lines 5-14 (Phase 1, 10 tasks)
- **Dependencies**: none
- **Scope**: Extract `src/shared/schemas.ts` and `src/session/types.ts` into `packages/shared` (`@paulp-o/auq-shared`). Set up package.json, tsconfig, build. Update main package to re-export from shared. Verify existing tests still pass.
- **Repos affected**: THIS repo only

## Phase 2: Web Adapter Package — Core (~10min)
- **Target tasks**: tasks.md lines 18-25 (Phase 2, first 8 tasks: package setup, WebSessionManager, client, create/start/wait methods, AbortSignal, timeout)
- **Dependencies**: Phase 1 (shared package)
- **Scope**: Create `packages/web-adapter` with `WebSessionManager` class implementing HTTP-based session lifecycle. Core methods: createSession (POST), startSession (create+wait orchestration), waitForAnswers (polling GET every 2-5s). AbortSignal propagation and timeout handling.
- **Repos affected**: THIS repo only

## Phase 3: Web Adapter Package — Resilience & Tests (~8min)
- **Target tasks**: tasks.md lines 26-31 (Phase 2, remaining 6 tasks: error handling, fallback, config, types, unit tests, retry)
- **Dependencies**: Phase 2
- **Scope**: Error handling for network failures, fallback detection (throw specific error when API unavailable), config interface (apiUrl, apiKey, pollInterval), retry logic for transient failures, unit tests with mocked HTTP.
- **Repos affected**: THIS repo only

## Phase 4: MCP Server Web Mode (~10min)
- **Target tasks**: tasks.md lines 35-44 (Phase 3, 10 tasks)
- **Dependencies**: Phase 3 (web adapter complete)
- **Scope**: Add `mode: 'local' | 'web'` config to server.ts. Parse AUQ_WEB_API_URL / AUQ_WEB_API_KEY env vars. Conditionally instantiate WebSessionManager vs SessionManager. Fallback to local on web failure. Health check. Server tests. README update. E2E test with mock API.
- **Repos affected**: THIS repo only

## Phase 5: Web Platform — Project Setup & DB (~10min)
- **Target tasks**: tasks.md lines 48-52 + 59-62 (Phase 4: SvelteKit init, Drizzle setup, schema, migrations, CORS, validation, error handling)
- **Dependencies**: Phase 1 (shared package published or linked)
- **Scope**: Initialize SvelteKit project in separate repo. Set up Drizzle+SQLite with schema for workspaces, api_keys, questions, answers, push_subscriptions. Run initial migration. Add CORS, Zod validation from shared package, consistent error response format.
- **Repos affected**: SEPARATE repo (auq-web-platform)

## Phase 6: Web Platform — API Endpoints (~10min)
- **Target tasks**: tasks.md lines 52-58 + 63-64 (Phase 4: auth middleware, POST/GET/POST-answer/DELETE endpoints, workspace routing, SSE, rate limiting, connection pooling)
- **Dependencies**: Phase 5 (DB and project setup)
- **Scope**: Implement all REST API endpoints: POST /api/v1/questions, GET /:id, POST /:id/answer, DELETE /:id. API key auth middleware. Workspace routing based on key lookup. SSE endpoint for browser. Rate limiting.
- **Repos affected**: SEPARATE repo (auq-web-platform)

## Phase 7: Web Platform — Frontend PWA (~10min)
- **Target tasks**: tasks.md lines 67-82 (Phase 5, 16 tasks)
- **Dependencies**: Phase 6 (API endpoints working)
- **Scope**: SvelteKit pages: workspace selection, question inbox, question detail/answer form. Single-select + multi-select support. SSE integration for real-time. PWA manifest, service worker, push notification subscription UI. Offline caching. Mobile-first responsive. Dark/light theme. Accessibility.
- **Repos affected**: SEPARATE repo (auq-web-platform)

## Phase 8: MCP Elicitation Adapter (~8min)
- **Target tasks**: tasks.md lines 86-96 (Phase 6, 11 tasks)
- **Dependencies**: Phase 1 (shared package) — can be done in parallel with Phases 5-7
- **Scope**: Create `packages/shared/src/adapters/mcp-elicitation.ts`. Implement bidirectional conversion: auqToMcpElicitation() and mcpElicitationToAuq(). Handle multiSelect ↔ array types. Integrate into MCP server for format detection. Update web platform to accept MCP format. Tests.
- **Repos affected**: THIS repo (shared package) + SEPARATE repo (web platform)

## Phase 9: Auth & Workspace Management (~8min)
- **Target tasks**: tasks.md lines 100-108 (Phase 7, first 9 tasks: workspace creation, API key gen, session auth, workspace switching, self-hosting docs, VAPID config, push sending, key expiry, admin)
- **Dependencies**: Phase 7 (frontend exists to add auth to)
- **Scope**: Workspace creation flow in web UI. API key generation and display. Session-based web auth. Workspace switching. VAPID key env config. Push notification sending with web-push. Expired key handling. Basic admin interface.
- **Repos affected**: SEPARATE repo (auq-web-platform)

## Phase 10: Polish, Docs & E2E (~8min)
- **Target tasks**: tasks.md lines 109-115 (Phase 7, remaining 7 tasks: logging, cleanup, errors, deployment guides, e2e tests, README, OpenAPI)
- **Dependencies**: All previous phases
- **Scope**: Logging/monitoring for API usage. Data cleanup for old questions. Comprehensive error messages. Deployment guides (Vercel + self-hosted). End-to-end test for complete flow (agent → web → answer → agent). Project README with architecture overview. OpenAPI spec for API documentation.
- **Repos affected**: Both repos

---

## Dependency Graph

```
Phase 1 (shared pkg) ──┬──→ Phase 2 (adapter core) → Phase 3 (adapter resilience) → Phase 4 (MCP web mode)
                       │
                       ├──→ Phase 5 (web setup+DB) → Phase 6 (API endpoints) → Phase 7 (frontend PWA) → Phase 9 (auth)
                       │
                       └──→ Phase 8 (MCP Elicitation) [parallel with 5-7]

Phase 4 + Phase 7 + Phase 9 → Phase 10 (polish & E2E)
```

## Notes

- Phases 1-4 are in THIS repo. Phases 5-7 and 9 are in the SEPARATE web platform repo. Phase 8 spans both.
- Phase 8 (MCP Elicitation) can be developed in parallel with Phases 5-7 since it only needs the shared package.
- Detailed session plans (001_xxx.md, 002_xxx.md...) will be created when implementation begins.
- The separate repo (auq-web-platform) needs to be created before Phase 5 begins.
- Total estimated time: ~90 minutes across 10 phases (each 8-10 min).