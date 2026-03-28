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
- [ ] 4.3 Create `src/web-server/app.ts` — Hono app with static file serving for React SPA, SPA fallback route
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

## 6. React SPA Setup

- [ ] 6.1 Create `packages/web-ui/` with package.json (react, react-dom, react-router-dom, jotai, vite)
- [ ] 6.2 Initialize shadcn/ui (`npx shadcn@latest init`)
- [ ] 6.3 Set up Tailwind CSS v4 with `@import "tailwindcss"` and theme integration
- [ ] 6.4 Install react-router-dom v7 for hash-based routing
- [ ] 6.5 Create `src/main.tsx` entry point (createRoot) and `src/App.tsx` with createHashRouter setup
- [ ] 6.6 Create route components: `Questions.tsx`, `Config.tsx`, `History.tsx`
- [ ] 6.7 Import generated theme CSS and set up `data-theme` attribute switching
- [ ] 6.8 Verify Vite build produces working static SPA in `dist/`

## 7. WebSocket Client

- [ ] 7.1 Create `lib/ws/protocol.ts` — import message types from @auq/shared
- [ ] 7.2 Create `lib/ws/client.ts` — WSClient class with connect, reconnect (exponential backoff), send, on
- [ ] 7.3 Implement `system:sync` handler — populate all Jotai atoms on connect/reconnect
- [ ] 7.4 Implement reconnect banner via `lib/atoms/connection.ts`

## 8. Jotai Atoms (State Management)

- [ ] 8.1 Create `lib/atoms/sessions.ts` — sessionsAtom, activeSessionIdAtom, viewModeAtom, answersAtom (derived: activeSessionAtom, pendingCountAtom)
- [ ] 8.2 Create `lib/atoms/config.ts` — configAtom, scopeAtom (local/global)
- [ ] 8.3 Create `lib/atoms/theme.ts` — themeAtom, system preference detection via matchMedia
- [ ] 8.4 Create `lib/atoms/history.ts` — historyAtom, paginationAtom, filtersAtom, searchAtom
- [ ] 8.5 Create `lib/atoms/connection.ts` — connectionStatusAtom (connected/reconnecting/disconnected)
- [ ] 8.6 Wire all atoms to WebSocket client message handlers (useEffect hooks or atom subscriptions)

## 9. Layout Components

- [ ] 9.1 Create `Sidebar.tsx` — session list with status indicators, click to switch, stale/abandoned badges
- [ ] 9.2 Create `Header.tsx` — logo, navigation (Questions/Config/History), mode toggle (stepper/form), theme selector, update badge
- [ ] 9.3 Create `ConnectionBanner.tsx` — "Reconnecting..." banner with progress
- [ ] 9.4 Create responsive layout shell (sidebar + main content area, collapsible on mobile)

## 10. Question Answering Components

- [ ] 10.1 Create `StepperView.tsx` — one-at-a-time question navigation with prev/next, progress indicator
- [ ] 10.2 Create `FormView.tsx` — all questions visible, scrollable form
- [ ] 10.3 Create `QuestionCard.tsx` — question prompt display with markdown rendering
- [ ] 10.4 Create `OptionsList.tsx` — radio (single) / checkbox (multi) option selection with recommended highlighting
- [ ] 10.5 Create `CustomInput.tsx` — auto-growing textarea (Enter submits, Shift+Enter newline)
- [ ] 10.6 Create `ElaborateButton.tsx` — toggle elaborate input with multi-line text area
- [ ] 10.7 Create `QuickSubmitButton.tsx` — visible when recommended options exist, triggers Ctrl+Enter
- [ ] 10.8 Create `WaitingScreen.tsx` — empty state when no sessions pending
- [ ] 10.9 Wire stepper/form toggle in header to switch between StepperView and FormView

## 11. Review & Rejection Components

- [ ] 11.1 Create `ReviewCard.tsx` — full-page summary of all Q&A pairs with edit buttons per question
- [ ] 11.2 Create `RejectionModal.tsx` — 2-step modal: confirm → optional reason textarea → submit
- [ ] 11.3 Wire Submit button to send `session:answer` via WebSocket
- [ ] 11.4 Wire Reject to send `session:reject` via WebSocket
- [ ] 11.5 Handle optimistic UI: apply immediately, rollback on failure, show toast on conflict

## 12. Config Editor Components

- [ ] 12.1 Create `ConfigEditor.tsx` — main page with scope toggle (local/global) at top
- [ ] 12.2 Create `ConfigSection.tsx` — collapsible section with title (Limits, Session, UI, Notifications, Stale, Updates)
- [ ] 12.3 Create `ConfigField.tsx` — renders appropriate input per field type (number, enum select, boolean toggle, text)
- [ ] 12.4 Add Zod validation on field change with inline error messages
- [ ] 12.5 Add per-field reset-to-default button
- [ ] 12.6 Add "Reset All" button with confirmation
- [ ] 12.7 Create `ImportExport.tsx` — export downloads .auqrc.json, import accepts file upload or paste
- [ ] 12.8 Wire all config operations to WebSocket (config:get, config:set, config:reset, config:export, config:import)

## 13. History Components

- [ ] 13.1 Create `HistoryTable.tsx` — sortable columns (date, status, questions, working dir)
- [ ] 13.2 Create `HistoryRow.tsx` — expandable row showing full Q&A detail
- [ ] 13.3 Create `HistoryFilters.tsx` — status dropdown, text search input
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
- [ ] 16.3 Wire to Jotai pendingCountAtom reactivity

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
- [ ] 20.8 Verify React SPA builds without errors
- [ ] 20.9 Manual testing: full flow (create session → answer in web UI → verify MCP receives response)
- [ ] 20.10 Manual testing: concurrent TUI + Web UI answering same session
- [ ] 20.11 Manual testing: config editor CRUD operations
- [ ] 20.12 Manual testing: all 16 themes render correctly
- [ ] 20.13 Manual testing: responsive layout at mobile/tablet/desktop breakpoints