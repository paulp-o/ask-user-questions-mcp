# Tasks: Add Web-Based UI

## 1. Project Setup & Dependencies

- [ ] 1.1 Add server dependencies to package.json: `hono`, `@hono/node-ws`, `@hono/node-server`, `open`, `get-port`
- [ ] 1.2 Create `src/web-ui/` directory with Svelte 5 project structure (package.json, svelte.config.js, vite.config.ts, tsconfig.json)
- [ ] 1.3 Add Svelte dependencies to web-ui: `svelte`, `@sveltejs/vite-plugin-svelte`, `vite`, `tailwindcss`, `@tailwindcss/vite`
- [ ] 1.4 Initialize shadcn-svelte in `src/web-ui/`: `bits-ui`, `clsx`, `tailwind-merge`, `tailwind-variants`
- [ ] 1.5 Configure `src/web-ui/vite.config.ts` with Svelte plugin and build output to `dist/web-ui/`
- [ ] 1.6 Configure `src/web-ui/svelte.config.js` with `adapter-static` for SPA mode (fallback: index.html)
- [ ] 1.7 Create `src/web-ui/src/app.html` base HTML template
- [ ] 1.8 Create `src/web-ui/src/app.css` with Tailwind CSS imports and CSS custom property definitions for theming
- [ ] 1.9 Add `build:web` script to root package.json: `vite build --config src/web-ui/vite.config.ts`
- [ ] 1.10 Update root `build` script to include `build:web` step after TypeScript compilation
- [ ] 1.11 Add `dist/web-ui/` to `files` field in root package.json for npm publishing
- [ ] 1.12 Exclude `src/web-ui/` from root `tsconfig.json` (Svelte uses its own TS config)

## 2. Config Schema Extension

- [ ] 2.1 Extend `renderer` field in `src/config/types.ts` AUQConfigSchema: `z.enum(["ink", "opentui", "web"])`
- [ ] 2.2 Update `src/shared/schemas.ts` if renderer is referenced there
- [ ] 2.3 Add `webPort` optional field to AUQConfigSchema: `z.number().min(1024).max(65535).optional()` (for fixed port preference)
- [ ] 2.4 Update `src/config/defaults.ts` to include `webPort: undefined` default

## 3. CLI Flag Integration

- [ ] 3.1 Add `--web` flag detection in `bin/auq.tsx` before existing command routing (check `args.includes("--web")`)
- [ ] 3.2 Implement `--web` handler: load config, init i18n, dynamic import `src/web/server.js`, call `startWebServer(config)`
- [ ] 3.3 Add `--web` to help text output in `bin/auq.tsx`
- [ ] 3.4 Support `renderer: "web"` in config as equivalent to `--web` flag (in default command path, after TUI renderer selection)

## 4. Hono Server Core

- [ ] 4.1 Create `src/web/server.ts` with `startWebServer(config: AUQConfig)` export
- [ ] 4.2 Implement runtime detection (`typeof globalThis.Bun !== "undefined"`) for adapter selection
- [ ] 4.3 Implement port selection: use config.webPort if set, otherwise find random available port
- [ ] 4.4 Configure Hono app with CORS middleware (localhost only) and JSON middleware
- [ ] 4.5 Configure `serveStatic` middleware to serve `dist/web-ui/` assets (resolve path relative to module location using `import.meta.url`)
- [ ] 4.6 Add SPA fallback route: serve `index.html` for all non-`/api/` and non-`/assets/` routes
- [ ] 4.7 Implement auto-open browser via `open` package after server starts listening
- [ ] 4.8 Print server URL to stdout: `Web UI available at http://localhost:{port}`
- [ ] 4.9 Implement graceful shutdown on SIGINT/SIGTERM (close server, cleanup watchers)
- [ ] 4.10 Create `src/web/index.ts` barrel export

## 5. WebSocket Hub

- [ ] 5.1 Create `src/web/ws-hub.ts` with `WebSocketHub` class
- [ ] 5.2 Implement client connection tracking using `Set<WSContext>` (Hono's WebSocket context)
- [ ] 5.3 Implement `broadcast(event: ServerEvent)` method to send JSON to all connected clients
- [ ] 5.4 Implement `onConnect` handler: send `{ type: "connected", sessionCount }` with current pending session count
- [ ] 5.5 Implement `onDisconnect` handler: remove client from Set
- [ ] 5.6 Define `ServerEvent` union type: `session:new`, `session:updated`, `session:removed`, `session:timeout`, `config:changed`
- [ ] 5.7 Integrate with Hono WebSocket route: `app.get("/ws", upgradeWebSocket(...))` for Bun / `createNodeWebSocket` for Node
- [ ] 5.8 Abstract Bun vs Node WebSocket setup behind a unified `setupWebSocket(app)` function

## 6. Session Bridge (File Watcher → WebSocket)

- [ ] 6.1 Create `src/web/session-bridge.ts` with `SessionBridge` class
- [ ] 6.2 Instantiate `EnhancedTUISessionWatcher` inside SessionBridge
- [ ] 6.3 On `session-created` event from watcher: load session request, broadcast `session:new` via WebSocketHub
- [ ] 6.4 Implement periodic polling (every 2s) for session status changes (pending → completed/rejected/timed_out) and broadcast `session:updated`
- [ ] 6.5 On session completion/rejection/timeout: broadcast `session:removed`
- [ ] 6.6 Implement `start()` and `stop()` lifecycle methods for SessionBridge
- [ ] 6.7 Wire SessionBridge into server startup/shutdown lifecycle

## 7. REST API Routes

- [ ] 7.1 Create `src/web/routes/sessions.ts` with Hono router
- [ ] 7.2 Implement `GET /api/sessions` — return all pending sessions with request data (using SessionManager.getPendingSessions + getSessionRequest)
- [ ] 7.3 Implement `GET /api/sessions/:id` — return single session with full request + status data
- [ ] 7.4 Implement `GET /api/sessions/:id/status` — return session status only
- [ ] 7.5 Implement `POST /api/sessions/:id/answers` — accept JSON body with UserAnswer[], call SessionManager.saveSessionAnswers(), broadcast `session:updated` via WebSocketHub
- [ ] 7.6 Implement `POST /api/sessions/:id/reject` — accept optional `{ reason: string }`, call SessionManager.rejectSession(), broadcast `session:removed` via WebSocketHub
- [ ] 7.7 Add input validation with Zod on all POST endpoints
- [ ] 7.8 Create `src/web/routes/config.ts` with Hono router
- [ ] 7.9 Implement `GET /api/config` — return current config via getConfig()
- [ ] 7.10 Implement `PUT /api/config` — validate body with AUQConfigSchema.partial(), write to .auqrc.json, call reloadConfig(), broadcast `config:changed`
- [ ] 7.11 Implement `GET /api/config/schema` — return JSON representation of AUQConfigSchema field metadata (types, defaults, constraints)
- [ ] 7.12 Create `src/web/routes/themes.ts` with Hono router
- [ ] 7.13 Implement `GET /api/themes` — return { themes: string[], current: string } from theme registry
- [ ] 7.14 Create `src/web/routes/i18n.ts` with Hono router
- [ ] 7.15 Implement `GET /api/i18n/:lang` — return translation object for requested language
- [ ] 7.16 Implement `GET /api/health` — return { status: "ok", uptime, sessionCount, version }
- [ ] 7.17 Wire all route modules into main Hono app in server.ts

## 8. Svelte SPA — Core Setup

- [ ] 8.1 Create `src/web-ui/src/lib/api/client.ts` — fetch-based REST API client with typed methods (getSessions, getSession, submitAnswers, rejectSession, getConfig, updateConfig, getThemes, getI18n)
- [ ] 8.2 Create `src/web-ui/src/lib/stores/websocket.svelte.ts` — WebSocket connection store with auto-reconnect (exponential backoff), connection status ($state), event dispatcher
- [ ] 8.3 Create `src/web-ui/src/lib/stores/sessions.svelte.ts` — session queue state ($state), derived pending count, active session tracking, WebSocket event handlers for session:new/updated/removed
- [ ] 8.4 Create `src/web-ui/src/lib/stores/config.svelte.ts` — config state ($state), load/save methods via REST
- [ ] 8.5 Create `src/web-ui/src/lib/i18n/index.ts` — translation store ($state), `t()` function, language switching
- [ ] 8.6 Create `src/web-ui/src/lib/themes/index.ts` — theme store ($state), CSS custom property application to :root, theme switching

## 9. Svelte SPA — Layout & Navigation

- [ ] 9.1 Create `src/web-ui/src/routes/+layout.svelte` — root layout with Header, main content area, connection status indicator
- [ ] 9.2 Create `src/web-ui/src/lib/components/Header.svelte` — app title, session count badge, theme selector dropdown, language selector, nav links (Questions / Config)
- [ ] 9.3 Create `src/web-ui/src/lib/components/ConnectionStatus.svelte` — WebSocket connection indicator (connected/disconnected/reconnecting)
- [ ] 9.4 Create `src/web-ui/src/lib/components/SessionQueue.svelte` — sidebar or top bar showing pending sessions with status indicators, click to select active session

## 10. Svelte SPA — Question Answering Flow

- [ ] 10.1 Create `src/web-ui/src/routes/+page.svelte` — main page: session queue + active question view, or WaitingScreen if no sessions
- [ ] 10.2 Create `src/web-ui/src/lib/components/WaitingScreen.svelte` — "Waiting for questions..." display with connection status
- [ ] 10.3 Create `src/web-ui/src/lib/components/QuestionView.svelte` — renders active question with prompt (markdown), tab bar for multi-question navigation, options list, and footer actions
- [ ] 10.4 Create `src/web-ui/src/lib/components/MarkdownPrompt.svelte` — render question prompt as formatted markdown (using `marked` or Svelte markdown component)
- [ ] 10.5 Create `src/web-ui/src/lib/components/OptionsList.svelte` — single-select (radio) and multi-select (checkbox) options with descriptions, recommended highlighting, "Other" custom text input
- [ ] 10.6 Create `src/web-ui/src/lib/components/CustomInput.svelte` — text input for "Other" option with placeholder and validation
- [ ] 10.7 Create `src/web-ui/src/lib/components/TabBar.svelte` — question progress tabs (1/N, 2/N) with completed/current/pending states
- [ ] 10.8 Create `src/web-ui/src/lib/components/ReviewScreen.svelte` — summary of all answers before submission, with edit and submit buttons
- [ ] 10.9 Create `src/web-ui/src/lib/components/RejectDialog.svelte` — modal dialog for session rejection with optional reason text input (using shadcn-svelte Dialog)
- [ ] 10.10 Implement answer state management in session store: track selected options per question, custom text, navigation between questions
- [ ] 10.11 Implement answer submission flow: collect all answers → POST /api/sessions/:id/answers → show success toast → advance to next session
- [ ] 10.12 Implement rejection flow: open RejectDialog → optional reason → POST /api/sessions/:id/reject → advance to next session

## 11. Svelte SPA — Config Editor

- [ ] 11.1 Create `src/web-ui/src/routes/config/+page.svelte` — config editor page with category tabs/sections
- [ ] 11.2 Create `src/web-ui/src/lib/components/ConfigEditor.svelte` — form layout with categorized fields (Limits, Session, UI, Stale Detection, Notifications, Updates)
- [ ] 11.3 Create `src/web-ui/src/lib/components/ConfigField.svelte` — generic form field component that renders appropriate input (number, toggle, select, duration) based on schema type
- [ ] 11.4 Implement number fields with min/max validation for: maxOptions, maxQuestions, recommendedOptions, recommendedQuestions
- [ ] 11.5 Implement duration fields with human-readable display for: sessionTimeout, retentionPeriod, staleThreshold
- [ ] 11.6 Implement toggle fields for: autoSelectRecommended, notifyOnStale, notifications.enabled, notifications.sound, updateCheck
- [ ] 11.7 Implement select/dropdown fields for: language (auto/en/ko), theme (from theme registry), renderer (ink/opentui/web), staleAction (warn/remove/archive)
- [ ] 11.8 Implement real-time Zod validation: validate on blur, show inline error messages, disable Save button on errors
- [ ] 11.9 Implement JSON preview panel: show resulting .auqrc.json as formatted JSON, updated live as form changes
- [ ] 11.10 Implement Save button: PUT /api/config with form values, show success/error toast
- [ ] 11.11 Implement Reset to Defaults button: reset form to DEFAULT_CONFIG values with confirmation dialog

## 12. Svelte SPA — Theme & i18n Integration

- [ ] 12.1 Implement theme application: on theme change, set CSS custom properties on `document.documentElement` for all theme color tokens
- [ ] 12.2 Create Tailwind config that uses CSS custom properties for colors (e.g., `--color-accent`, `--color-background`, `--color-text`, etc.)
- [ ] 12.3 Implement theme persistence: on theme change in UI, update config store → save via REST
- [ ] 12.4 Implement i18n loading: fetch translations on mount and language change via `GET /api/i18n/:lang`
- [ ] 12.5 Wire `t()` function into all components that display user-facing text
- [ ] 12.6 Implement language selector in Header that triggers i18n reload

## 13. shadcn-svelte UI Components

- [ ] 13.1 Install shadcn-svelte base components: Button, Card, Input, Select, Switch, Tabs, Dialog, Badge, Toast (Sonner), Separator, Label
- [ ] 13.2 Configure component aliases in `$lib/components/ui/` path
- [ ] 13.3 Style components to use theme CSS custom properties instead of hardcoded colors
- [ ] 13.4 Create app-specific component variants if needed (e.g., OptionCard, SessionCard)

## 14. Testing — Server Side

- [ ] 14.1 Create `src/web/__tests__/server.test.ts` — test server startup, static file serving, SPA fallback
- [ ] 14.2 Create `src/web/__tests__/routes/sessions.test.ts` — test all session REST endpoints with mock SessionManager
- [ ] 14.3 Create `src/web/__tests__/routes/config.test.ts` — test config GET/PUT with validation
- [ ] 14.4 Create `src/web/__tests__/ws-hub.test.ts` — test WebSocket broadcast, connect/disconnect tracking
- [ ] 14.5 Create `src/web/__tests__/session-bridge.test.ts` — test file watcher → WebSocket event translation
- [ ] 14.6 Test runtime detection (Bun vs Node) adapter selection logic
- [ ] 14.7 Test port selection with get-port fallback
- [ ] 14.8 Test graceful shutdown (SIGINT handler cleans up watchers and connections)

## 15. Testing — Client Side

- [ ] 15.1 Set up Vitest for Svelte component testing in `src/web-ui/`
- [ ] 15.2 Create mock WebSocket and fetch utilities for component tests
- [ ] 15.3 Test OptionsList: single-select and multi-select behavior
- [ ] 15.4 Test QuestionView: navigation between questions, answer state tracking
- [ ] 15.5 Test ReviewScreen: displays all answers correctly, submit/edit actions
- [ ] 15.6 Test ConfigEditor: form validation, save/reset actions
- [ ] 15.7 Test WebSocket store: connection, reconnection, event dispatching
- [ ] 15.8 Test session store: state updates from REST + WebSocket events
- [ ] 15.9 Test i18n: language switching, translation rendering

## 16. Build & Integration

- [ ] 16.1 Verify `bun run build` compiles both TypeScript (server) and Vite (web UI) without errors
- [ ] 16.2 Verify `dist/web-ui/` contains index.html + JS/CSS assets after build
- [ ] 16.3 Verify Hono serves `dist/web-ui/` assets correctly at runtime
- [ ] 16.4 Test `auq --web` end-to-end: server starts → browser opens → questions display → answers submit
- [ ] 16.5 Test `auq --web` with Bun runtime
- [ ] 16.6 Test `auq --web` with Node.js runtime
- [ ] 16.7 Test `auq` (no flag) still launches TUI correctly
- [ ] 16.8 Test `renderer: "web"` in `.auqrc.json` triggers web UI
- [ ] 16.9 Verify npm package includes `dist/web-ui/` in published files
- [ ] 16.10 Run ESLint on all new server files in `src/web/`
- [ ] 16.11 Run Prettier on all new files

## 17. Final Validation

- [ ] 17.1 Run complete test suite: `bun test && npm run test`
- [ ] 17.2 Run build: `bun run build`
- [ ] 17.3 Manual test: full question answering flow in browser (single-select, multi-select, custom text, review, submit)
- [ ] 17.4 Manual test: session rejection with reason in browser
- [ ] 17.5 Manual test: real-time session arrival via WebSocket (start MCP, send question, verify browser updates)
- [ ] 17.6 Manual test: config editor — load, edit, validate, save, verify file updated
- [ ] 17.7 Manual test: theme switching in browser (all 15+ themes)
- [ ] 17.8 Manual test: language switching (en ↔ ko)
- [ ] 17.9 Manual test: WebSocket reconnection (kill and restart server, verify browser reconnects)
- [ ] 17.10 Manual test: multiple pending sessions — queue display, session switching
- [ ] 17.11 Verify no console errors or warnings in browser DevTools
- [ ] 17.12 Verify server logs are clean (no unhandled errors)
- [ ] 17.13 Sign off on feature completion

# Tasks: Add Web-Based UI for AUQ

## 1. Shared Types Package Extraction

- [ ] 1.1 Create `packages/shared/` directory with package.json (`@auq/shared`, type: module)
- [ ] 1.2 Create `packages/shared/tsconfig.json` targeting ES2022, module NodeNext
- [ ] 1.3 Move session type definitions from `src/session/types.ts` to `packages/shared/src/session-types.ts`
- [ ] 1.4 Move config schema/types from `src/config/types.ts` to `packages/shared/src/config-types.ts`
- [ ] 1.5 Create WebSocket protocol types in `packages/shared/src/ws-protocol.ts` (WSMessage envelope, all message type constants)
- [ ] 1.6 Create `packages/shared/src/index.ts` re-exporting all types
- [ ] 1.7 Update all import paths in `src/` to use `@auq/shared` (session types, config types)
- [ ] 1.8 Update root `package.json` to add workspaces: ["packages/*"]
- [ ] 1.9 Update root `tsconfig.json` with project references for shared package
- [ ] 1.10 Verify existing build passes with shared package extraction
- [ ] 1.11 Verify existing tests pass after import path changes

## 2. Config Schema Extension

- [ ] 2.1 Add `"web"` to renderer enum in config schema: `z.enum(["ink", "opentui", "web"])`
- [ ] 2.2 Update config CLI `get` handler to include `web` in renderer display/validation
- [ ] 2.3 Update config CLI `set` handler to accept `web` as valid renderer value
- [ ] 2.4 Update `bin/tui-app.tsx` `runTui()` to handle `renderer === "web"` (delegate to web server)

## 3. CLI --web Flag

- [ ] 3.1 Add `--web` / `-w` flag detection in `bin/auq.tsx` before default TUI launch
- [ ] 3.2 Add `--no-open` flag detection for suppressing browser auto-open
- [ ] 3.3 Add `--port` flag for optional port override
- [ ] 3.4 Wire flags to dynamic import of `src/web-server/index.ts` and call `startWebServer()`
- [ ] 3.5 Update help text to document `--web`, `--no-open`, `--port` flags

## 4. Web Server (Hono)

- [ ] 4.1 Install dependencies: hono, @hono/node-server, @hono/node-ws, get-port, open
- [ ] 4.2 Create `src/web-server/index.ts` — `startWebServer()` entry point with port detection, server start, browser open, graceful shutdown
- [ ] 4.3 Create `src/web-server/app.ts` — Hono app with static file serving for Svelte SPA, SPA fallback route
- [ ] 4.4 Create `src/web-server/ws-protocol.ts` — message type constants and envelope type (import from @auq/shared)
- [ ] 4.5 Create `src/web-server/ws-handler.ts` — WebSocket upgrade, message routing, connection tracking
- [ ] 4.6 Create `src/web-server/session-bridge.ts` — bridge EnhancedTUISessionWatcher events to WS broadcasts
  - [ ] 4.6.1 Instantiate watcher, listen for `session-created` events, broadcast `session:new`
  - [ ] 4.6.2 Handle `session:list` requests — return pending sessions via `session:list:result`
  - [ ] 4.6.3 Handle `session:answer` requests — call SessionManager.saveSessionAnswers(), confirm via `session:answer:result`
  - [ ] 4.6.4 Handle `session:reject` requests — call SessionManager.rejectSession(), confirm via `session:reject:result`
  - [ ] 4.6.5 Implement 2-second polling for status changes (stale, abandoned, answered elsewhere)
  - [ ] 4.6.6 Broadcast `session:status` on status changes, `session:removed` on deletion
- [ ] 4.7 Create `src/web-server/config-bridge.ts` — bridge ConfigLoader to WS messages
  - [ ] 4.7.1 Handle `config:get` — return config for specified scope
  - [ ] 4.7.2 Handle `config:set` — validate with Zod, write config file, return updated config
  - [ ] 4.7.3 Handle `config:reset` — reset field or all fields, write config
  - [ ] 4.7.4 Handle `config:export` — return raw JSON string
  - [ ] 4.7.5 Handle `config:import` — validate JSON with Zod, write config, return result
- [ ] 4.8 Implement `system:sync` — on WebSocket connection, send full session list + config
- [ ] 4.9 Implement `system:update` — check for updates, broadcast if available
- [ ] 4.10 Implement `system:ping` / `system:pong` keepalive
- [ ] 4.11 Implement history bridge
  - [ ] 4.11.1 Handle `history:list` — scan session directory, filter/sort/paginate, return results
  - [ ] 4.11.2 Handle `history:detail` — read full session (request + answers + status)
- [ ] 4.12 Add Origin header validation for WebSocket upgrades (localhost only)
- [ ] 4.13 Add message size limit (1MB) and rate limiting (100 msg/s)

## 5. Theme CSS Generation

- [ ] 5.1 Create `scripts/generate-theme-css.ts` — reads all 16 themes from `src/tui/shared/themes/`, outputs CSS custom properties
- [ ] 5.2 Generate `[data-theme="{name}"]` selectors with all color tokens mapped to CSS variables
- [ ] 5.3 Add system preference media queries mapping to default dark/light themes
- [ ] 5.4 Add `generate:themes` script to package.json
- [ ] 5.5 Wire into build pipeline (runs before `build:web-ui`)
- [ ] 5.6 Verify all 16 themes produce valid CSS output

## 6. Svelte SPA Setup

- [ ] 6.1 Create `packages/web-ui/` with package.json, Svelte 5 + Vite config
- [ ] 6.2 Initialize shadcn-svelte (`npx shadcn-svelte@latest init`)
- [ ] 6.3 Set up Tailwind CSS v4 with `@import "tailwindcss"` and theme integration
- [ ] 6.4 Install svelte-spa-router for hash-based routing
- [ ] 6.5 Create `src/main.ts` entry point and `src/App.svelte` root with router setup
- [ ] 6.6 Create route components: `Questions.svelte`, `Config.svelte`, `History.svelte`
- [ ] 6.7 Import generated theme CSS and set up `data-theme` attribute switching
- [ ] 6.8 Verify Vite build produces working static SPA in `dist/`

## 7. WebSocket Client

- [ ] 7.1 Create `lib/ws/protocol.ts` — import message types from @auq/shared
- [ ] 7.2 Create `lib/ws/client.ts` — WSClient class with connect, reconnect (exponential backoff), send, on
- [ ] 7.3 Implement `system:sync` handler — populate all stores on connect/reconnect
- [ ] 7.4 Implement reconnect banner via `lib/stores/connection.svelte.ts`

## 8. Svelte Stores (State Management)

- [ ] 8.1 Create `lib/stores/sessions.svelte.ts` — session list, active session, view mode, answers state
- [ ] 8.2 Create `lib/stores/config.svelte.ts` — config state, scope (local/global), dirty tracking
- [ ] 8.3 Create `lib/stores/theme.svelte.ts` — current theme, system detection, theme cycling
- [ ] 8.4 Create `lib/stores/history.svelte.ts` — history list, pagination, filters, search
- [ ] 8.5 Create `lib/stores/connection.svelte.ts` — connection status (connected/reconnecting/disconnected)
- [ ] 8.6 Wire all stores to WebSocket client message handlers

## 9. Layout Components

- [ ] 9.1 Create `Sidebar.svelte` — session list with status indicators, click to switch, stale/abandoned badges
- [ ] 9.2 Create `Header.svelte` — logo, navigation (Questions/Config/History), mode toggle (stepper/form), theme selector, update badge
- [ ] 9.3 Create `ConnectionBanner.svelte` — "Reconnecting..." banner with progress
- [ ] 9.4 Create responsive layout shell (sidebar + main content area, collapsible on mobile)

## 10. Question Answering Components

- [ ] 10.1 Create `StepperView.svelte` — one-at-a-time question navigation with prev/next, progress indicator
- [ ] 10.2 Create `FormView.svelte` — all questions visible, scrollable form
- [ ] 10.3 Create `QuestionCard.svelte` — question prompt display with markdown rendering
- [ ] 10.4 Create `OptionsList.svelte` — radio (single) / checkbox (multi) option selection with recommended highlighting
- [ ] 10.5 Create `CustomInput.svelte` — auto-growing textarea (Enter submits, Shift+Enter newline)
- [ ] 10.6 Create `ElaborateButton.svelte` — toggle elaborate input with multi-line text area
- [ ] 10.7 Create `QuickSubmitButton.svelte` — visible when recommended options exist, triggers Ctrl+Enter
- [ ] 10.8 Create `WaitingScreen.svelte` — empty state when no sessions pending
- [ ] 10.9 Wire stepper/form toggle in header to switch between StepperView and FormView

## 11. Review & Rejection Components

- [ ] 11.1 Create `ReviewCard.svelte` — full-page summary of all Q&A pairs with edit buttons per question
- [ ] 11.2 Create `RejectionModal.svelte` — 2-step modal: confirm → optional reason textarea → submit
- [ ] 11.3 Wire Submit button to send `session:answer` via WebSocket
- [ ] 11.4 Wire Reject to send `session:reject` via WebSocket
- [ ] 11.5 Handle optimistic UI: apply immediately, rollback on failure, show toast on conflict

## 12. Config Editor Components

- [ ] 12.1 Create `ConfigEditor.svelte` — main page with scope toggle (local/global) at top
- [ ] 12.2 Create `ConfigSection.svelte` — collapsible section with title (Limits, Session, UI, Notifications, Stale, Updates)
- [ ] 12.3 Create `ConfigField.svelte` — renders appropriate input per field type (number, enum select, boolean toggle, text)
- [ ] 12.4 Add Zod validation on field change with inline error messages
- [ ] 12.5 Add per-field reset-to-default button
- [ ] 12.6 Add "Reset All" button with confirmation
- [ ] 12.7 Create `ImportExport.svelte` — export downloads .auqrc.json, import accepts file upload or paste
- [ ] 12.8 Wire all config operations to WebSocket (config:get, config:set, config:reset, config:export, config:import)

## 13. History Components

- [ ] 13.1 Create `HistoryTable.svelte` — sortable columns (date, status, questions, working dir)
- [ ] 13.2 Create `HistoryRow.svelte` — expandable row showing full Q&A detail
- [ ] 13.3 Create `HistoryFilters.svelte` — status dropdown, text search input
- [ ] 13.4 Add pagination controls (prev/next, page indicator, 20 per page)
- [ ] 13.5 Wire to WebSocket (history:list, history:detail)

## 14. Keyboard Shortcuts

- [ ] 14.1 Create `lib/utils/keyboard.ts` — global keydown listener with context-aware handler
- [ ] 14.2 Map all TUI shortcuts: ↑↓ (options), Space (toggle), Enter (select), Tab/Shift+Tab (questions), ←→ (questions), Ctrl+Enter (quick submit), R (recommended), ]/[ (sessions), Ctrl+T (theme), Esc (reject), E (elaborate), Shift+Enter (newline)
- [ ] 14.3 Handle focus context (options vs textarea vs review) to prevent conflicts with native browser behavior
- [ ] 14.4 Add keyboard shortcut help overlay (? key)

## 15. Notifications & Audio

- [ ] 15.1 Create `lib/utils/notifications.ts` — request Notification permission, send notifications on new session (when tab not visible)
- [ ] 15.2 Add notification sound audio file (`public/notification.mp3`)
- [ ] 15.3 Play audio on new session arrival (respects config notifications.enabled and notifications.sound)
- [ ] 15.4 Add notification permission request on first session arrival (not page load)

## 16. Dynamic Tab Title & Favicon

- [ ] 16.1 Create `lib/utils/favicon.ts` — update document.title with pending count
- [ ] 16.2 Generate favicon badge (canvas-based) showing pending count
- [ ] 16.3 Wire to session store reactivity

## 17. Responsive Design

- [ ] 17.1 Design mobile breakpoints: sidebar collapses to hamburger menu, single-column layout
- [ ] 17.2 Add responsive styles to all layout components
- [ ] 17.3 Ensure touch targets are 44x44px minimum on mobile
- [ ] 17.4 Test on common viewport sizes (320px, 768px, 1024px, 1440px)

## 18. Accessibility

- [ ] 18.1 Add ARIA labels to all interactive elements (buttons, inputs, selects, navigation)
- [ ] 18.2 Ensure keyboard navigation works for all interactive elements (Tab order, Enter/Space activation)
- [ ] 18.3 Add focus visible styles for keyboard users
- [ ] 18.4 Verify color contrast ratios meet WCAG AA (4.5:1 for text, 3:1 for large text) across all 16 themes
- [ ] 18.5 Add skip-to-content link
- [ ] 18.6 Add aria-live regions for dynamic content (new sessions, toasts, connection status)

## 19. Build Integration

- [ ] 19.1 Add `build:shared` script to package.json (`cd packages/shared && tsc`)
- [ ] 19.2 Add `build:web-ui` script (`bun run generate:themes && cd packages/web-ui && vite build`)
- [ ] 19.3 Update main `build` script to run: build:shared → build:web-ui → existing build steps
- [ ] 19.4 Update `prepare` hook to include new build steps
- [ ] 19.5 Add `packages/web-ui/dist/` and `packages/shared/dist/` to npm files array
- [ ] 19.6 Verify full build pipeline works: shared → themes → web-ui → tsc → tsc opentui
- [ ] 19.7 Verify npm package size stays under 1MB gzipped for web-ui assets

## 20. Testing

- [ ] 20.1 Add unit tests for WebSocket protocol message handling (ws-handler.ts)
- [ ] 20.2 Add unit tests for session-bridge (mock SessionManager, verify WS broadcasts)
- [ ] 20.3 Add unit tests for config-bridge (mock ConfigLoader, verify CRUD operations)
- [ ] 20.4 Add unit tests for history bridge (pagination, filtering, sorting)
- [ ] 20.5 Add integration test: start web server, connect WebSocket, send/receive messages
- [ ] 20.6 Add integration test: create session via MCP, verify web UI receives it via WS
- [ ] 20.7 Verify existing TUI tests still pass after shared types extraction
- [ ] 20.8 Verify Svelte SPA builds without errors
- [ ] 20.9 Manual testing: full flow (create session → answer in web UI → verify MCP receives response)
- [ ] 20.10 Manual testing: concurrent TUI + Web UI answering same session
- [ ] 20.11 Manual testing: config editor CRUD operations
- [ ] 20.12 Manual testing: all 16 themes render correctly
- [ ] 20.13 Manual testing: responsive layout at mobile/tablet/desktop breakpoints