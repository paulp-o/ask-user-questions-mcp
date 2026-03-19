# CLI Web Forwarding - OpenSpec Proposal

## Executive Summary

This change enables the CLI and MCP server to forward questions to a remote web server, allowing questions to be answered via a web dashboard instead of locally. It bridges the gap between **local TUI-based answering** and **remote web-based answering**, enabling users to configure their answer mechanism once via config and have both CLI and MCP server use it automatically.

This unlocks three key scenarios:

1. **Web-first answering** - Users prefer the web dashboard over TUI; questions from MCP clients appear there automatically
2. **Hybrid deployments** - Some AI agents ask via CLI (local), others via HTTP (remote); both feed into the same web dashboard
3. **Future SaaS/team integrations** - Config-based endpoint allows switching to cloud-hosted web server without code changes

---

## Motivation

### Current Limitations

**Disconnected question flows:**

- CLI (`auq ask`) creates **local file-based sessions** → TUI answers
- Web server has **independent SQLiteStore** → web dashboard answers
- No cross-communication between them
- Users running web server must choose: use CLI locally OR use web remotely, not both

**MCP server limitations:**

- STDIO server always creates local sessions
- If user wants web-based answering, must run separate web server and manually connect
- No config-based way to route MCP questions to web

**CLI/config fragmentation:**

- No standard way to configure "use web for answering"
- `--web http://localhost:3000` flag cumbersome for repeated use
- No support for SaaS endpoints with auth tokens

### Why This Change Matters

**Unified question answering:**

- Single config (`web.apiKey`, `web.endpoint`) controls where all questions go
- Applies to both `auq ask` CLI command AND STDIO MCP server
- Users can switch between local/web without CLI changes

**Storage unification:**

- All questions (local CLI + remote MCP) end up in same database
- Web dashboard shows questions from all sources
- Single source of truth for session history

**SaaS readiness:**

- Config stores API key and endpoint
- Future: Deploy web server to cloud, configure endpoint → all questions go there
- No code changes needed; pure configuration

**Better UX:**

- Users who prefer web dashboard get automatic routing
- TUI users unaffected (local mode still works)
- Flexible: `auq config set` to enable, unset to disable

---

## Scope

### In Scope (Phase 1–6)

| Phase | Feature                   | Scope                                                                    |
| ----- | ------------------------- | ------------------------------------------------------------------------ |
| **1** | Config schema extension   | Add `web.endpoint`, `web.apiKey`, `web.mode`, `web.timeout` to AUQConfig |
| **2** | WebForwardingClient class | HTTP client in `packages/core` for session creation, polling, auth       |
| **3** | CLI integration           | `auq ask` command detects config, forwards or runs local                 |
| **4** | MCP server integration    | STDIO server forwards `ask_user_questions` to web if config present      |
| **5** | Web API changes           | `POST /api/sessions` endpoint, Bearer token auth middleware              |
| **6** | Tests & edge cases        | Auth failures, timeouts, network errors, polling retry logic             |

### Not in Scope

- **OAuth/advanced auth** - v1 is Bearer token only (simple API key)
- **TLS/certificate validation** - Assumes HTTPS configured separately
- **Response streaming** - Polling only (future: upgrade to WebSocket)
- **Multi-server failover** - Single endpoint only
- **Web server changes to Dashboard UI** - No new screens; existing dashboard works
- **Performance optimizations** - No caching, rate limiting (first implementation)
- **CI/CD integration** - No GitHub Actions for testing web server deployments

### Backward Compatibility

- **Existing CLI users** see no breaking changes; `auq ask` works identically if config not set
- **STDIO server** behaves identically unless `web.apiKey` is configured
- **Config file format** gains new optional fields (backward-compatible)
- **npm package names/versions** unchanged

---

## Success Criteria

### Functional

- [ ] Config schema extended with `web.*` fields; ConfigLoader reads them
- [ ] `auq config set web.apiKey sk-xxx` and `get web.apiKey` work
- [ ] `auq config set web.endpoint` works (optional)
- [ ] WebForwardingClient class successfully creates session via POST and polls for answers
- [ ] CLI forwards questions to web if `web.apiKey` configured; respects `--local` flag
- [ ] `auq ask --web http://localhost:3000` still works (explicit override)
- [ ] STDIO MCP server forwards `ask_user_questions` calls to web if configured
- [ ] Web server validates Bearer token against `AUQ_API_KEY` env var
- [ ] Polling handles timeouts (default 5 min), configurable via `web.timeout`
- [ ] CLI output format unchanged; users see same response structure

### Non-Functional

- [ ] CLI forwarding latency <2 seconds (small session creation + first polling)
- [ ] Web API responds in <500ms for session creation
- [ ] Polling retry logic prevents overwhelming server (2–3 sec interval)
- [ ] Network errors gracefully downgrade to local (if applicable) or return error message
- [ ] No breaking changes to existing config/CLI commands

### Quality

- [ ] Unit tests for WebForwardingClient (success, auth failure, timeout, retry)
- [ ] Integration tests for CLI forwarding (config + subprocess)
- [ ] Integration tests for STDIO server forwarding
- [ ] Web API tests for new POST endpoint and auth middleware
- [ ] No TypeScript errors (`tsc --noEmit` passes)
- [ ] Documentation for config fields and usage

---

## Risk Assessment

### Technical Risks

| Risk                           | Severity | Mitigation                                                           |
| ------------------------------ | -------- | -------------------------------------------------------------------- |
| **Network timeouts**           | Medium   | Configurable timeout (default 5 min); graceful error handling        |
| **Auth token leakage**         | Medium   | Token stored in plaintext in config; document security best practice |
| **Polling inefficiency**       | Low      | 2–3 sec interval acceptable for user interactions; can upgrade later |
| **Config parsing errors**      | Low      | Validate env var format; fall back to local if malformed             |
| **Race condition on endpoint** | Low      | Web server stateless; SQLiteStore handles concurrent requests        |
| **CORS/auth validation**       | Medium   | Implement strict Bearer token validation; test with curl/Postman     |

### Mitigation Strategies

1. **Network timeouts**: Document `web.timeout` setting; default 5 min is generous for user response
2. **Token security**: Add warning in `web-setup.md` docs; recommend env var for production
3. **Polling**: Start with 2–3 sec interval; monitor in future; can add exponential backoff if needed
4. **Config validation**: ConfigLoader validates `web.apiKey` format (non-empty string); endpoint URL format
5. **Concurrent requests**: Use `better-sqlite3` transactions on SQLiteStore; test with ab/wrk
6. **CORS**: No CORS needed (internal API); Bearer token validation middleware on all routes

### Rollback Plan

- If forwarding proves unstable, set `web.mode: "local"` in config to force local mode
- If auth issues arise, remove `web.apiKey` from config
- `auq` CLI users can pin to v4.x and stay on local mode indefinitely
- Web server remains usable as STDIO forward target via opencode-plugin

---

## Deliverables

### Code Changes

1. **`packages/core/src/config/`** - Extend AUQConfig with web.\* fields
2. **`packages/core/src/`** - New WebForwardingClient class (HTTP, polling, auth)
3. **`packages/cli/bin/auq.tsx`** - Update `ask` command to detect config, forward or run local
4. **`packages/cli/src/server.ts`** - Update `ask_user_questions` tool to forward if config
5. **`packages/web/src/app/api/sessions/route.ts`** - Add POST handler for session creation
6. **`packages/web/src/middleware.ts`** - Bearer token auth middleware

### Documentation

- [ ] Config schema guide (`docs/config-schema.md` or extension to existing)
- [ ] CLI web forwarding setup (`docs/cli-web-forwarding.md`)
- [ ] Web API auth docs (updated `docs/api-docs.md`)
- [ ] Security best practices (env vars, token rotation)
- [ ] Troubleshooting (common errors, polling debug tips)

### Testing

- [ ] WebForwardingClient unit tests (mocked HTTP)
- [ ] CLI integration tests with mock web server
- [ ] STDIO server integration tests with mock web server
- [ ] Web API POST endpoint tests with auth
- [ ] End-to-end test (real CLI → real web server)

---

## Open Questions & Decisions

### Decided

1. ✅ **Config storage**: `web.apiKey` and `web.endpoint` in config file (same as MCP settings)
2. ✅ **Auth method**: Bearer token (simple, no OAuth complexity)
3. ✅ **Polling interval**: 2–3 seconds (reasonable for user interactions)
4. ✅ **Timeout default**: 5 minutes (generous for user to answer)
5. ✅ **Mode control**: `web.mode: "auto" | "web" | "local"` (auto = web if configured, else local)
6. ✅ **CLI flags**: `--web` and `--local` for explicit override

### Pending Clarification

1. **Env var for endpoint**: Should `AUQ_DEFAULT_ENDPOINT` be used if `web.endpoint` not set? _(User confirmed yes)_
2. **Default API key source**: Can API key come from env var (`AUQ_API_KEY`)? _(Out of scope; config only)_

---

## Success Metrics & Validation

### Acceptance Criteria

- `auq config set web.apiKey sk-xxx && auq ask` → question appears in web dashboard
- STDIO MCP server with config → questions routed to web
- `auq ask --local` → forces local mode even if web configured
- Network timeout after 5 min → graceful error, no hang
- Invalid auth token → 401 error with helpful message
- `turbo build && turbo test` → all tests pass

### Manual Testing Checklist

- [ ] Set config, run `auq ask "test question"`, answer via web, see response in CLI
- [ ] Disable web config, run `auq ask`, see TUI answer locally
- [ ] Run Claude Desktop with STDIO endpoint, answer via web dashboard
- [ ] Test timeout by not answering for 5+ min; see timeout error
- [ ] Test with wrong API key; see 401 error
- [ ] Test with unreachable endpoint; see connection error
