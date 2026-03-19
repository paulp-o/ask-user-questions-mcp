# CLI Web Forwarding - Tasks & Implementation Checklist

This document breaks down all work required to implement the cli-web-forwarding change into actionable, ordered tasks organized by phase.

---

## Phase 1: Config Schema Extension (1 day)

**Objective**: Extend AUQConfig with `web.*` fields and validation logic.

### Config Schema

- [ ] **1.1** Add `web` field to `AUQConfig` interface in `packages/core/src/config/types.ts`
  - **Acceptance**: Interface has `web?: { endpoint?, apiKey?, mode?, timeout? }` with JSDoc
  - **Estimated effort**: S (small)

- [ ] **1.2** Add default `web` config in `packages/core/src/config/defaults.ts`
  - **Acceptance**: `DEFAULT_CONFIG.web = { mode: "auto", timeout: 300_000 }`
  - **Estimated effort**: S

### ConfigLoader Enhancements

- [ ] **1.3** Add validation method `validateWebConfig()` to ConfigLoader
  - **Acceptance**: Validates endpoint URL format, apiKey non-empty string, mode enum, timeout positive number
  - **Tests**: Unit tests for validation (valid, invalid endpoint, invalid mode, etc.)
  - **Estimated effort**: M (medium)

- [ ] **1.4** Add helper methods to ConfigLoader
  - **Acceptance**: `getWebEndpoint()`, `getWebApiKey()`, `getWebMode()`, `getWebTimeout()`, `isWebForwardingEnabled()`
  - **Tests**: Unit tests for each helper
  - **Estimated effort**: M

- [ ] **1.5** Update ConfigLoader to use env var `AUQ_DEFAULT_ENDPOINT` as fallback
  - **Acceptance**: `getWebEndpoint()` returns explicit endpoint > env var > undefined
  - **Tests**: Unit tests with env var set/unset
  - **Estimated effort**: S

### Environment & Defaults

- [ ] **1.6** Document env vars needed for web forwarding
  - **Acceptance**: List in config section of code: `AUQ_DEFAULT_ENDPOINT`, `AUQ_API_KEY` (for server)
  - **Estimated effort**: S

- [ ] **1.7** Update `.env.example` (if exists) with web-related vars
  - **Acceptance**: Include `AUQ_DEFAULT_ENDPOINT` and `AUQ_API_KEY` with descriptions
  - **Estimated effort**: S

### Tests

- [ ] **1.8** Write unit tests for config changes
  - **Acceptance**: Tests in `packages/core/src/config/__tests__/`; >80% coverage for new code
  - **Tests**: ConfigLoader web helpers, validation, env var fallback
  - **Estimated effort**: M

- [ ] **1.9** Update existing config tests to work with new schema
  - **Acceptance**: Existing tests still pass; no regressions
  - **Estimated effort**: S

---

## Phase 2: WebForwardingClient Implementation (1.5 days)

**Objective**: Implement HTTP client for session creation, polling, and error handling.

### Core Client

- [ ] **2.1** Create `packages/core/src/web/` directory structure
  - **Acceptance**: `web/`, `web/__tests__/`, `web/WebForwardingClient.ts`, `web/errors.ts` exist
  - **Estimated effort**: S

- [ ] **2.2** Implement `WebForwardingError` class in `packages/core/src/web/errors.ts`
  - **Acceptance**: Extends Error, has `name`, `statusCode`, `details`, `getUserMessage()` method
  - **Tests**: Unit tests for error creation and messages
  - **Estimated effort**: S

- [ ] **2.3** Implement `WebForwardingClient` constructor in `packages/core/src/web/WebForwardingClient.ts`
  - **Acceptance**: Validates endpoint URL, apiKey non-empty; throws on invalid input
  - **Tests**: Unit tests for valid/invalid inputs
  - **Estimated effort**: S

- [ ] **2.4** Implement `createSession()` method
  - **Acceptance**: POST /api/sessions with Bearer auth, returns sessionId, handles errors (401, 4xx, 5xx)
  - **Tests**: Unit tests with mocked fetch (success, auth failure, network error)
  - **Estimated effort**: M

- [ ] **2.5** Implement `pollForAnswers()` method
  - **Acceptance**: Polls GET /api/sessions/[id] every 2s, handles status (pending/completed/rejected), timeout
  - **Tests**: Unit tests with mocked fetch (polling loop, timeout, status detection)
  - **Estimated effort**: L (large)

- [ ] **2.6** Implement `askQuestionsAndWait()` method (combines create + poll)
  - **Acceptance**: Single method for CLI/MCP to call; handles full flow
  - **Tests**: Unit tests for complete flow
  - **Estimated effort**: S

### Integration & Exports

- [ ] **2.7** Create `packages/core/src/web/index.ts` with exports
  - **Acceptance**: Export `WebForwardingClient`, `WebForwardingError`
  - **Estimated effort**: S

- [ ] **2.8** Update `packages/core/src/index.ts` to export web module
  - **Acceptance**: `export { WebForwardingClient, WebForwardingError } from './web'`
  - **Estimated effort**: S

### Comprehensive Tests

- [ ] **2.9** Write unit tests for WebForwardingClient
  - **Acceptance**: >85% coverage; tests in `packages/core/src/web/__tests__/`
  - **Tests**:
    - Success cases (create, poll, complete flow)
    - Auth failures (401, wrong token)
    - Network errors (connection refused, timeout during create)
    - Polling edge cases (timeout, rejection, 404, concurrent requests)
    - Abort signal handling
  - **Estimated effort**: L

- [ ] **2.10** Write integration tests (mocked HTTP)
  - **Acceptance**: Realistic scenarios with mocked fetch
  - **Tests**: Multi-question session, long polling, error recovery
  - **Estimated effort**: M

---

## Phase 3: CLI Integration (1.5 days)

**Objective**: Update CLI `ask` command to detect web config and forward questions.

### CLI Command Changes

- [ ] **3.1** Update `packages/cli/bin/auq.tsx` `ask` command handler
  - **Acceptance**: Detect web config, decide between web/local mode, handle flags
  - **Logic**: See design.md CLI Integration section
  - **Estimated effort**: M

- [ ] **3.2** Add `--web [endpoint]` flag to `ask` command
  - **Acceptance**: `auq ask --web http://localhost:3000 "question"`; overrides config
  - **Tests**: CLI integration tests
  - **Estimated effort**: S

- [ ] **3.3** Add `--local` flag to `ask` command
  - **Acceptance**: `auq ask --local "question"`; forces local mode even if web configured
  - **Tests**: CLI integration tests
  - **Estimated effort**: S

- [ ] **3.4** Update `ask` command to use WebForwardingClient when web enabled
  - **Acceptance**: Creates session, polls for answers, returns JSON to stdout
  - **Error handling**: Catches WebForwardingError, prints user-friendly message, exits with code 1
  - **Estimated effort**: M

### Error Handling

- [ ] **3.5** Add error handling in CLI for web forwarding failures
  - **Acceptance**: Network errors, auth errors, timeouts have helpful messages
  - **Tests**: Integration tests with mock web server failures
  - **Estimated effort**: M

- [ ] **3.6** Add fallback logic (optional): if web fails and mode="auto", try local?
  - **Acceptance**: _Decision pending from user_ — for now, fail on web error
  - **Estimated effort**: M (if implemented)

### Tests

- [ ] **3.7** Write CLI integration tests for web forwarding
  - **Acceptance**: Tests in `packages/cli/__tests__/`
  - **Tests**:
    - Config-based forwarding (apiKey set → web mode)
    - Flag overrides (--local overrides config, --web overrides both)
    - Web forwarding success (mock server returns answers)
    - Web forwarding failure (mock server 401, timeout, etc.)
  - **Estimated effort**: L

- [ ] **3.8** Test backward compatibility: existing `auq ask` still works locally
  - **Acceptance**: No web config → local TUI mode as before
  - **Tests**: Run existing CLI tests; no regressions
  - **Estimated effort**: M

- [ ] **3.9** Verify CLI output format unchanged
  - **Acceptance**: `auq ask` returns same JSON structure (questions + answers) regardless of web/local
  - **Tests**: Compare output of web vs. local mode
  - **Estimated effort**: S

---

## Phase 4: MCP Server Integration (1 day)

**Objective**: Update STDIO MCP server to forward `ask_user_questions` to web if configured.

### MCP Tool Changes

- [ ] **4.1** Update `ask_user_questions` tool in `packages/cli/src/server.ts`
  - **Acceptance**: Check config, decide web/local, call appropriate handler
  - **Logic**: See design.md MCP Server Integration section
  - **Estimated effort**: M

- [ ] **4.2** Implement web forwarding path in MCP server
  - **Acceptance**: Uses WebForwardingClient to create session + poll answers
  - **Error handling**: Catches WebForwardingError, converts to MCP error response
  - **Estimated effort**: M

- [ ] **4.3** Keep local mode path in MCP server unchanged
  - **Acceptance**: If no web config, uses SessionManager + FileStore as before
  - **Estimated effort**: S

### Tests

- [ ] **4.4** Write integration tests for MCP server web forwarding
  - **Acceptance**: Tests in `packages/cli/__tests__/`
  - **Tests**:
    - Config-based forwarding (apiKey set → web mode)
    - Web forwarding success (mock server returns answers)
    - Web forwarding failure (mock server errors)
    - Local fallback (no config → local mode)
  - **Estimated effort**: L

- [ ] **4.5** Test with real MCP client (if available)
  - **Acceptance**: Claude Desktop or similar can connect, ask questions forwarded to web
  - **Manual testing**: One manual test case
  - **Estimated effort**: M

---

## Phase 5: Web Server API Changes (1 day)

**Objective**: Add POST /api/sessions endpoint and auth middleware.

### POST /api/sessions Endpoint

- [ ] **5.1** Create handler for POST /api/sessions in `packages/web/src/app/api/sessions/route.ts`
  - **Acceptance**: Accepts `{ questions: Question[] }`, validates, creates session, returns `{ sessionId }`
  - **Estimated effort**: M

- [ ] **5.2** Validate incoming questions format
  - **Acceptance**: Reuses existing Zod schemas for Question validation
  - **Error handling**: Returns 400 with helpful error message if invalid
  - **Estimated effort**: S

- [ ] **5.3** Emit SSE notification when session created
  - **Acceptance**: Calls `sseEmitter.notifyNewSession(sessionId)` to notify connected dashboards
  - **Estimated effort**: S

### Auth Middleware

- [ ] **5.4** Create auth middleware in `packages/web/src/middleware.ts`
  - **Acceptance**: Validates Bearer token against `AUQ_API_KEY` env var
  - **Error handling**: Returns 401 for missing/invalid token
  - **Estimated effort**: M

- [ ] **5.5** Apply auth middleware to all `/api/` routes
  - **Acceptance**: Middleware intercepts all API requests, checks Bearer token
  - **Tests**: Unit tests for auth logic
  - **Estimated effort**: M

- [ ] **5.6** Handle missing `AUQ_API_KEY` env var
  - **Acceptance**: Logs warning, returns 403 "not configured"
  - **Estimated effort**: S

### Existing Endpoint Updates

- [ ] **5.7** Apply auth middleware to existing GET /api/sessions endpoints
  - **Acceptance**: All session read endpoints require Bearer token
  - **Estimated effort**: S

- [ ] **5.8** Update POST /api/sessions/[id]/answer to require auth
  - **Acceptance**: Answer endpoint also protected by middleware
  - **Estimated effort**: S

### Tests

- [ ] **5.9** Write unit tests for POST /api/sessions endpoint
  - **Acceptance**: Tests in `packages/web/src/app/api/sessions/__tests__/`
  - **Tests**:
    - Valid questions → creates session, returns sessionId
    - Invalid questions → returns 400 with error
    - Missing auth → returns 401
    - Valid auth → proceeds
  - **Estimated effort**: L

- [ ] **5.10** Write unit tests for auth middleware
  - **Acceptance**: Tests in `packages/web/src/__tests__/`
  - **Tests**:
    - Missing Authorization header → 401
    - Invalid Bearer token → 401
    - Valid token → passes through
    - Missing AUQ_API_KEY env var → 403
  - **Estimated effort**: M

---

## Phase 6: Integration Tests & Edge Cases (2 days)

**Objective**: Comprehensive end-to-end testing and edge case handling.

### End-to-End Tests

- [ ] **6.1** Write end-to-end test: CLI → web server → answer
  - **Acceptance**: Real CLI subprocess, mock web server; full request-response cycle
  - **Tests**: Single question, multiple questions, timeout
  - **Estimated effort**: L

- [ ] **6.2** Write end-to-end test: MCP → web server → answer
  - **Acceptance**: Real STDIO subprocess, mock web server; full cycle
  - **Tests**: Single/multiple questions, error handling
  - **Estimated effort**: L

- [ ] **6.3** Test interaction between CLI local and web modes
  - **Acceptance**: Same config file, toggle `web.mode` or use flags
  - **Manual testing**: Verify switching between modes
  - **Estimated effort**: M

### Edge Cases & Error Scenarios

- [ ] **6.4** Handle network timeout during session creation
  - **Acceptance**: WebForwardingClient catches timeout, throws helpful error
  - **Tests**: Mock slow server response (>10s)
  - **Estimated effort**: M

- [ ] **6.5** Handle 401 auth error with helpful message
  - **Acceptance**: User sees "Invalid API key" or similar
  - **Tests**: Mock 401 response
  - **Estimated effort**: S

- [ ] **6.6** Handle unreachable endpoint
  - **Acceptance**: Connection refused caught, user sees "Could not reach server"
  - **Tests**: Mock fetch throw (network error)
  - **Estimated effort**: S

- [ ] **6.7** Handle session timeout (no answer for 5+ min)
  - **Acceptance**: Polling stops after timeout, returns timeout error
  - **Tests**: Mock slow response, verify timeout after 5min
  - **Estimated effort**: M

- [ ] **6.8** Handle session rejection (user clicks "reject" in web)
  - **Acceptance**: Web returns status="rejected", CLI receives error with reason
  - **Tests**: Mock server response with rejection
  - **Estimated effort**: S

- [ ] **6.9** Handle AbortSignal (cancellation)
  - **Acceptance**: WebForwardingClient respects AbortSignal, stops polling
  - **Tests**: Abort mid-polling, verify clean exit
  - **Estimated effort**: M

- [ ] **6.10** Handle concurrent questions on same session
  - **Acceptance**: Should not happen (single question at a time), but document
  - **Tests**: Verify behavior, may add safeguard
  - **Estimated effort**: S

### Polling Robustness

- [ ] **6.11** Test polling retry on transient network errors
  - **Acceptance**: If GET request fails, retry after delay (don't immediately fail)
  - **Tests**: Mock intermittent failures
  - **Estimated effort**: M

- [ ] **6.12** Test session expiration during polling
  - **Acceptance**: GET returns 404, WebForwardingClient throws "Session not found"
  - **Tests**: Mock 404 response
  - **Estimated effort**: S

- [ ] **6.13** Verify polling interval correctness
  - **Acceptance**: Measured polling (e.g., with mock delays), verify ~2-3sec between requests
  - **Tests**: Time-based test with jest fake timers
  - **Estimated effort**: M

### Configuration Edge Cases

- [ ] **6.14** Test invalid config combinations
  - **Acceptance**: `mode: "web"` but no apiKey → error at startup
  - **Tests**: Various invalid configs
  - **Estimated effort**: M

- [ ] **6.15** Test fallback to local if endpoint not configured
  - **Acceptance**: apiKey set but endpoint not set, and no env var → use local
  - **Tests**: Mock env var unset, verify local mode
  - **Estimated effort**: S

- [ ] **6.16** Test env var `AUQ_DEFAULT_ENDPOINT` override
  - **Acceptance**: If endpoint not in config but env var set, use env var
  - **Tests**: Mock env var, verify used
  - **Estimated effort**: S

### Full Test Suite

- [ ] **6.17** Run all tests: `turbo test`
  - **Acceptance**: >90% of tests passing; document any skipped tests
  - **Estimated effort**: L

- [ ] **6.18** Run TypeScript check: `turbo build`
  - **Acceptance**: No errors; `tsc --noEmit` passes
  - **Estimated effort**: M

- [ ] **6.19** Code coverage check
  - **Acceptance**: >80% coverage for new code (WebForwardingClient, CLI integration, web endpoints)
  - **Estimated effort**: M

---

## Phase 7: Documentation (1 day)

**Objective**: Write clear docs for users and developers.

### User Documentation

- [ ] **7.1** Write config setup guide (`docs/cli-web-forwarding.md`)
  - **Acceptance**: Step-by-step: set web.apiKey, set web.endpoint, verify with `auq config get web.*`
  - **Includes**: Examples, common errors, troubleshooting
  - **Estimated effort**: M

- [ ] **7.2** Update `docs/web-setup.md` to mention CLI forwarding
  - **Acceptance**: Add section "Using from CLI" with example config
  - **Estimated effort**: S

- [ ] **7.3** Document `AUQ_DEFAULT_ENDPOINT` and `AUQ_API_KEY` env vars
  - **Acceptance**: Explain when/how to use; security implications
  - **Estimated effort**: S

- [ ] **7.4** Write security best practices for web forwarding
  - **Acceptance**: Token storage, HTTPS requirement, private network assumption
  - **Estimated effort**: M

### Developer Documentation

- [ ] **7.5** Document WebForwardingClient API
  - **Acceptance**: JSDoc comments in code, plus `docs/web-forwarding-api.md` if needed
  - **Includes**: Methods, error handling, polling behavior
  - **Estimated effort**: M

- [ ] **7.6** Add architecture diagram to design doc
  - **Acceptance**: Flowchart showing CLI/MCP → WebForwardingClient → web server → polling
  - **Estimated effort**: S

- [ ] **7.7** Write troubleshooting guide
  - **Acceptance**: Common issues: "401 Unauthorized", "Timeout", "Connection refused"
  - **Estimated effort**: M

### Code Documentation

- [ ] **7.8** Add JSDoc comments to WebForwardingClient
  - **Acceptance**: All public methods documented with @param, @returns, @throws
  - **Estimated effort**: S

- [ ] **7.9** Add JSDoc to ConfigLoader web methods
  - **Acceptance**: Explain each helper method clearly
  - **Estimated effort**: S

- [ ] **7.10** Add comments to CLI command changes
  - **Acceptance**: Explain decision logic for web vs. local mode
  - **Estimated effort**: S

---

## Phase 8: Release & Validation (1 day)

**Objective**: Final validation and release readiness.

### Final Testing

- [ ] **8.1** Manual test: full scenario (set config → CLI → web answer → CLI returns)
  - **Acceptance**: All steps work; user sees clean output
  - **Estimated effort**: M

- [ ] **8.2** Manual test: MCP scenario (Claude Desktop → STDIO → web answer)
  - **Acceptance**: Questions forwarded, answers returned to Claude
  - **Estimated effort**: M

- [ ] **8.3** Backward compatibility check
  - **Acceptance**: Existing `auq ask` without config still works locally
  - **Estimated effort**: M

- [ ] **8.4** Performance check
  - **Acceptance**: Web forwarding <2s latency; polling smooth
  - **Estimated effort**: S

### Build & Release

- [ ] **8.5** Update version numbers (if applicable)
  - **Acceptance**: `packages/cli/package.json` version bumped (minor or patch)
  - **Estimated effort**: S

- [ ] **8.6** Update CHANGELOG
  - **Acceptance**: Document new features: web forwarding, config fields, CLI flags
  - **Estimated effort**: S

- [ ] **8.7** Commit changes with OpenSpec message
  - **Acceptance**: `feat(spec: cli-web-forwarding): implement web forwarding for CLI and MCP`
  - **Estimated effort**: S

- [ ] **8.8** Final `turbo build && turbo test` pass
  - **Acceptance**: All tests green; no errors
  - **Estimated effort**: M

---

## Summary

| Phase     | Title                    | Duration   | Tasks        | Status |
| --------- | ------------------------ | ---------- | ------------ | ------ |
| 1         | Config Schema Extension  | 1 day      | 9            | ⬜     |
| 2         | WebForwardingClient      | 1.5 day    | 10           | ⬜     |
| 3         | CLI Integration          | 1.5 day    | 9            | ⬜     |
| 4         | MCP Server Integration   | 1 day      | 5            | ⬜     |
| 5         | Web Server API Changes   | 1 day      | 10           | ⬜     |
| 6         | Integration & Edge Cases | 2 days     | 19           | ⬜     |
| 7         | Documentation            | 1 day      | 10           | ⬜     |
| 8         | Release & Validation     | 1 day      | 8            | ⬜     |
| **Total** | **8 Phases**             | **9 days** | **80 tasks** | —      |

---

## Dependency Graph

```
Phase 1 (Config) ─┐
                  ├─→ Phase 2 (WebForwardingClient)
                  │               ├─→ Phase 3 (CLI)
                  │               ├─→ Phase 4 (MCP)
                  │               └─→ Phase 5 (Web API)
                  │
                  └─→ Phase 3, 4 (depend on config)

Phases 3, 4, 5 ─→ Phase 6 (Integration & E2E)
Phase 6 ────────→ Phase 7 (Documentation)
Phase 7 ────────→ Phase 8 (Release)
```

**Parallelization opportunities:**

- Phases 3, 4, 5 can run in parallel (after Phase 2)
- Phase 7 documentation can start after Phase 5
