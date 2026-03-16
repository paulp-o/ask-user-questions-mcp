# AUQ Web Service Implementation Tasks

## Phase 1: Shared Package Extraction (~1 session)

- [x] Create `packages/shared/package.json` — configure as NPM package with TypeScript build
- [x] Create `packages/shared/src/schemas.ts` — extract OptionSchema, QuestionSchema, AskUserQuestionsParametersSchema from `src/shared/schemas.ts`
- [x] Create `packages/shared/src/session/types.ts` — extract SessionStatus, SessionRequest, UserAnswer, SESSION_FILES from `src/session/types.ts`
- [x] Create `packages/shared/src/response/format.ts` — extract response formatting utilities and types
- [x] Create `packages/shared/tsconfig.json` — configure TypeScript compilation for library
- [x] Update main `package.json` — add shared package to workspaces and dependencies
- [x] Update `src/shared/schemas.ts` — replace with re-exports from @paulp-o/auq-shared
- [x] Update `src/session/types.ts` — replace with re-exports from @paulp-o/auq-shared
- [x] Add build script for shared package in root package.json
- [x] Test shared package build and import in main package

## Phase 2: Web Adapter Package (~2 sessions)

- [x] Create `packages/web-adapter/package.json` — configure as NPM package with HTTP client dependencies
- [x] Create `packages/web-adapter/src/WebSessionManager.ts` — implement SessionManager interface with HTTP calls
- [x] Create `packages/web-adapter/src/client.ts` — HTTP client with configurable base URL and API key
- [x] Implement `WebSessionManager.createSession()` — POST /api/v1/questions with questions payload
- [x] Implement `WebSessionManager.startSession()` — orchestrate create + wait flow
- [x] Implement `WebSessionManager.waitForAnswers()` — polling GET /api/v1/questions/:id every 2-5s
- [x] Add AbortSignal support in WebSessionManager for request cancellation
- [x] Add timeout handling with configurable timeout values
- [x] Add error handling for network failures and API errors
- [x] Add fallback logic to detect API unavailability and throw specific error
- [x] Create `packages/web-adapter/src/config.ts` — configuration interface for apiUrl, apiKey, pollInterval
- [x] Add TypeScript types and validation using shared package schemas
- [x] Create unit tests for WebSessionManager with mocked HTTP responses
- [x] Add retry logic for transient network failures

## Phase 3: Configuration System (~1 session)

- [x] Create `src/config/loader.ts` — implement config resolution logic (env vars → .auqrc → defaults)
- [x] Create `src/config/parser.ts` — JSON parser for .auqrc files with validation
- [x] Create `src/config/types.ts` — TypeScript interfaces for config (AuqConfig, ConfigSource)
- [x] Implement config loader with priority order: env vars > project .auqrc > home .auqrc > defaults
- [x] Add default hosted URL behavior: use `https://auq.paulp.dev` when api_key provided without api_url
- [x] Create CLI command `auq config set <key> <value>` — update project-level .auqrc
- [x] Create CLI command `auq config get <key>` — read single config value
- [x] Create CLI command `auq config list` — display all config (with masked sensitive values)
- [x] Create CLI command `auq config reset` — remove project-level .auqrc file
- [x] Add `--global` flag to config commands to modify `~/.auqrc` instead of `./.auqrc`
- [x] Implement config file validation with clear error messages
- [x] Add unit tests for config resolution order
- [x] Add integration tests for config CLI commands
- [x] Update TypeScript types in shared package to include ConfigSource type
- [x] Document .auqrc file format and resolution order in README
- [x] Add CLI help documentation for `auq config` command

## Phase 4: MCP Server Web Mode (~1 session)

- [x] Update `src/server.ts` — load config and auto-detect mode: if `api_key` is present, mode='web', else mode='local'
- [x] Modify server initialization to conditionally use WebSessionManager vs SessionManager based on auto-detected mode
- [x] Add fallback logic to catch web adapter errors and retry with local mode
- [x] Update server configuration schema to include web mode settings from config loader
- [x] Add logging for mode switching and fallback events
- [x] Update server tests to cover web mode initialization with config
- [x] Add health check endpoint to verify web API connectivity
- [x] Update CLI to use configuration system for web mode settings
- [x] Update Agent Skills integration to read from shared config
- [x] Ensure MCP server, CLI, and Agent Skills all use same config source
- [x] Test end-to-end with mock web API server and config files

## Phase 5: Web Platform - API (~2 sessions, separate repo)

- [x] Initialize SvelteKit project with TypeScript and required dependencies
- [x] Set up Drizzle ORM with SQLite database configuration
- [x] Create database schema files for workspaces, api_keys, questions, answers, push_subscriptions
- [x] Implement database migrations for initial schema
- [x] Create API key authentication middleware for /api/v1/\* routes
- [x] Implement POST /api/v1/questions — validate API key, store questions, return requestId
- [x] Implement GET /api/v1/questions/:id — return status and answers if completed
- [x] Implement POST /api/v1/questions/:id/answer — validate session, store answers, update status
- [x] Implement DELETE /api/v1/questions/:id — mark as abandoned
- [x] Add workspace routing based on API key lookup
- [x] Implement SSE endpoint GET /api/v1/questions/stream for real-time updates
- [x] Add CORS configuration for cross-origin requests
- [x] Add request validation using Zod schemas from shared package
- [x] Add error handling and consistent API response format
- [x] Create database connection pooling and transaction handling
- [x] Add API rate limiting for abuse prevention

## Phase 6: Web Platform - Frontend (~2 sessions, separate repo)

- [x] Create SvelteKit layout with responsive design and PWA structure
- [x] Implement workspace selection page for first-time users
- [x] Create question inbox page showing pending questions for workspace
- [x] Implement question detail page with answer form
- [x] Add support for single-select and multi-select question types
- [x] Integrate SSE for real-time question list updates
- [x] Implement push notification subscription UI and permissions
- [x] Create service worker for background sync and push handling
- [x] Add Web App Manifest for PWA installation
- [x] Implement offline capability for viewing cached questions
- [x] Add mobile-first responsive design with touch-friendly controls
- [x] Create loading states and error handling for network issues
- [x] Add question history view with completed questions
- [x] Implement dark/light theme toggle
- [x] Add accessibility features (ARIA labels, keyboard navigation)
- [x] Test PWA installation and offline functionality

## Phase 7: MCP Elicitation Adapter (~1 session)

- [x] Create `packages/shared/src/adapters/mcp-elicitation.ts` — adapter module
- [x] Implement `auqToMcpElicitation()` — convert QuestionSchema[] to MCP JSON Schema
- [x] Implement `mcpElicitationToAuq()` — convert MCP schema to QuestionSchema[]
- [x] Handle multiSelect conversion to array types with enum items
- [x] Preserve option descriptions and question titles in conversion
- [x] Add validation for supported MCP schema features
- [x] Integrate adapter into MCP server for format detection
- [x] Update web platform to handle MCP format questions
- [x] Add tests for bidirectional format conversion
- [x] Update shared package exports to include adapter functions
- [x] Add documentation for MCP Elicitation support

## Phase 8: Auth & Polish (~1 session)

- [x] Implement workspace creation flow in web UI
- [x] Add API key generation and display in workspace settings
- [x] Implement simple session-based authentication for web UI
- [x] Add workspace switching capability
- [x] Create setup documentation for self-hosting
- [x] Add environment configuration for VAPID keys and database path
- [x] Implement push notification sending with web-push library
- [x] Add graceful handling of expired or invalid API keys
- [x] Create admin interface for workspace management
- [x] Add logging and monitoring for API usage
- [x] Implement data cleanup for old completed questions
- [x] Add comprehensive error messages and user feedback
- [x] Create deployment guides for Vercel and self-hosted
- [x] Add end-to-end tests for complete question flow
- [x] Update project README with architecture overview
- [x] Create API documentation with OpenAPI spec
