# AUQ Web Service Implementation Tasks

## Phase 1: Shared Package Extraction (~1 session)

- [ ] Create `packages/shared/package.json` — configure as NPM package with TypeScript build
- [ ] Create `packages/shared/src/schemas.ts` — extract OptionSchema, QuestionSchema, AskUserQuestionsParametersSchema from `src/shared/schemas.ts`
- [ ] Create `packages/shared/src/session/types.ts` — extract SessionStatus, SessionRequest, UserAnswer, SESSION_FILES from `src/session/types.ts`
- [ ] Create `packages/shared/src/response/format.ts` — extract response formatting utilities and types
- [ ] Create `packages/shared/tsconfig.json` — configure TypeScript compilation for library
- [ ] Update main `package.json` — add shared package to workspaces and dependencies
- [ ] Update `src/shared/schemas.ts` — replace with re-exports from @paulp-o/auq-shared
- [ ] Update `src/session/types.ts` — replace with re-exports from @paulp-o/auq-shared
- [ ] Add build script for shared package in root package.json
- [ ] Test shared package build and import in main package

## Phase 2: Web Adapter Package (~2 sessions)

- [ ] Create `packages/web-adapter/package.json` — configure as NPM package with HTTP client dependencies
- [ ] Create `packages/web-adapter/src/WebSessionManager.ts` — implement SessionManager interface with HTTP calls
- [ ] Create `packages/web-adapter/src/client.ts` — HTTP client with configurable base URL and API key
- [ ] Implement `WebSessionManager.createSession()` — POST /api/v1/questions with questions payload
- [ ] Implement `WebSessionManager.startSession()` — orchestrate create + wait flow
- [ ] Implement `WebSessionManager.waitForAnswers()` — polling GET /api/v1/questions/:id every 2-5s
- [ ] Add AbortSignal support in WebSessionManager for request cancellation
- [ ] Add timeout handling with configurable timeout values
- [ ] Add error handling for network failures and API errors
- [ ] Add fallback logic to detect API unavailability and throw specific error
- [ ] Create `packages/web-adapter/src/config.ts` — configuration interface for apiUrl, apiKey, pollInterval
- [ ] Add TypeScript types and validation using shared package schemas
- [ ] Create unit tests for WebSessionManager with mocked HTTP responses
- [ ] Add retry logic for transient network failures

## Phase 3: Configuration System (~1 session)

- [ ] Create `src/config/loader.ts` — implement config resolution logic (env vars → .auqrc → defaults)
- [ ] Create `src/config/parser.ts` — JSON parser for .auqrc files with validation
- [ ] Create `src/config/types.ts` — TypeScript interfaces for config (AuqConfig, ConfigSource)
- [ ] Implement config loader with priority order: env vars > project .auqrc > home .auqrc > defaults
- [ ] Add default hosted URL behavior: use `https://auq.paulp.dev` when api_key provided without api_url
- [ ] Create CLI command `auq config set <key> <value>` — update project-level .auqrc
- [ ] Create CLI command `auq config get <key>` — read single config value
- [ ] Create CLI command `auq config list` — display all config (with masked sensitive values)
- [ ] Create CLI command `auq config reset` — remove project-level .auqrc file
- [ ] Add `--global` flag to config commands to modify `~/.auqrc` instead of `./.auqrc`
- [ ] Implement config file validation with clear error messages
- [ ] Add unit tests for config resolution order
- [ ] Add integration tests for config CLI commands
- [ ] Update TypeScript types in shared package to include ConfigSource type
- [ ] Document .auqrc file format and resolution order in README
- [ ] Add CLI help documentation for `auq config` command

## Phase 4: MCP Server Web Mode (~1 session)

- [ ] Update `src/server.ts` — load config and auto-detect mode: if `api_key` is present, mode='web', else mode='local'
- [ ] Modify server initialization to conditionally use WebSessionManager vs SessionManager based on auto-detected mode
- [ ] Add fallback logic to catch web adapter errors and retry with local mode
- [ ] Update server configuration schema to include web mode settings from config loader
- [ ] Add logging for mode switching and fallback events
- [ ] Update server tests to cover web mode initialization with config
- [ ] Add health check endpoint to verify web API connectivity
- [ ] Update CLI to use configuration system for web mode settings
- [ ] Update Agent Skills integration to read from shared config
- [ ] Ensure MCP server, CLI, and Agent Skills all use same config source
- [ ] Test end-to-end with mock web API server and config files

## Phase 5: Web Platform - API (~2 sessions, separate repo)

- [ ] Initialize SvelteKit project with TypeScript and required dependencies
- [ ] Set up Drizzle ORM with SQLite database configuration
- [ ] Create database schema files for workspaces, api_keys, questions, answers, push_subscriptions
- [ ] Implement database migrations for initial schema
- [ ] Create API key authentication middleware for /api/v1/\* routes
- [ ] Implement POST /api/v1/questions — validate API key, store questions, return requestId
- [ ] Implement GET /api/v1/questions/:id — return status and answers if completed
- [ ] Implement POST /api/v1/questions/:id/answer — validate session, store answers, update status
- [ ] Implement DELETE /api/v1/questions/:id — mark as abandoned
- [ ] Add workspace routing based on API key lookup
- [ ] Implement SSE endpoint GET /api/v1/questions/stream for real-time updates
- [ ] Add CORS configuration for cross-origin requests
- [ ] Add request validation using Zod schemas from shared package
- [ ] Add error handling and consistent API response format
- [ ] Create database connection pooling and transaction handling
- [ ] Add API rate limiting for abuse prevention

## Phase 6: Web Platform - Frontend (~2 sessions, separate repo)

- [ ] Create SvelteKit layout with responsive design and PWA structure
- [ ] Implement workspace selection page for first-time users
- [ ] Create question inbox page showing pending questions for workspace
- [ ] Implement question detail page with answer form
- [ ] Add support for single-select and multi-select question types
- [ ] Integrate SSE for real-time question list updates
- [ ] Implement push notification subscription UI and permissions
- [ ] Create service worker for background sync and push handling
- [ ] Add Web App Manifest for PWA installation
- [ ] Implement offline capability for viewing cached questions
- [ ] Add mobile-first responsive design with touch-friendly controls
- [ ] Create loading states and error handling for network issues
- [ ] Add question history view with completed questions
- [ ] Implement dark/light theme toggle
- [ ] Add accessibility features (ARIA labels, keyboard navigation)
- [ ] Test PWA installation and offline functionality

## Phase 7: MCP Elicitation Adapter (~1 session)

- [ ] Create `packages/shared/src/adapters/mcp-elicitation.ts` — adapter module
- [ ] Implement `auqToMcpElicitation()` — convert QuestionSchema[] to MCP JSON Schema
- [ ] Implement `mcpElicitationToAuq()` — convert MCP schema to QuestionSchema[]
- [ ] Handle multiSelect conversion to array types with enum items
- [ ] Preserve option descriptions and question titles in conversion
- [ ] Add validation for supported MCP schema features
- [ ] Integrate adapter into MCP server for format detection
- [ ] Update web platform to handle MCP format questions
- [ ] Add tests for bidirectional format conversion
- [ ] Update shared package exports to include adapter functions
- [ ] Add documentation for MCP Elicitation support

## Phase 8: Auth & Polish (~1 session)

- [ ] Implement workspace creation flow in web UI
- [ ] Add API key generation and display in workspace settings
- [ ] Implement simple session-based authentication for web UI
- [ ] Add workspace switching capability
- [ ] Create setup documentation for self-hosting
- [ ] Add environment configuration for VAPID keys and database path
- [ ] Implement push notification sending with web-push library
- [ ] Add graceful handling of expired or invalid API keys
- [ ] Create admin interface for workspace management
- [ ] Add logging and monitoring for API usage
- [ ] Implement data cleanup for old completed questions
- [ ] Add comprehensive error messages and user feedback
- [ ] Create deployment guides for Vercel and self-hosted
- [ ] Add end-to-end tests for complete question flow
- [ ] Update project README with architecture overview
- [ ] Create API documentation with OpenAPI spec
