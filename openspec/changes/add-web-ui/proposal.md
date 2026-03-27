# Change Proposal: Add Web-Based UI

## Change ID

`add-web-ui`

## Status

pending

## Summary

Add a web-based UI as a third renderer option for the AUQ CLI tool, providing 100% feature parity with the existing TUI (terminal UI) while unlocking richer interaction patterns, responsive design, and a visual config editor. The web UI is served via a local Hono HTTP server, launched with `auq --web`, and communicates over WebSocket for real-time session synchronization.

## Motivation

### Problem Statement

The current AUQ tool offers two terminal-based renderers (Ink and OpenTUI). While these work well for developers in terminal environments, they have inherent limitations:

1. **Accessibility barriers** — Terminal UIs have limited WCAG compliance, no native screen reader support, and constrained visual hierarchy
2. **Mobile/tablet inaccessibility** — Developers who step away from their workstation cannot monitor or answer questions
3. **Limited rich content** — Markdown rendering, syntax highlighting, and complex form layouts are constrained by terminal capabilities
4. **No visual config editor** — Configuration requires manual JSON editing with no validation feedback
5. **Discovery friction** — New users unfamiliar with TUI conventions face a learning curve

### Proposed Solution

Add `"web"` as a third renderer option that:

- Launches a local Hono HTTP server serving a bundled Svelte 5 SPA
- Opens the user's default browser automatically
- Provides full feature parity with the TUI (session queue, question answering, review, rejection, themes, i18n)
- Adds a visual config editor with Zod-powered validation
- Communicates over WebSocket for real-time session arrival and state changes
- Coexists with TUI — both can run simultaneously, first to answer wins

## Scope

### In Scope

1. **CLI Integration** — `--web` flag on default command, `renderer: "web"` config option
2. **Hono Web Server** — Local HTTP server with WebSocket, static asset serving, REST API, graceful shutdown
3. **Svelte 5 SPA** — Complete question-answering UI with shadcn-svelte components
4. **Config Editor** — Grouped form sections, Zod validation, import/export JSON, reset to defaults
5. **Session History** — Table view with filters, search, pagination, expandable detail rows
6. **Theme System** — Same 16 themes from TUI, generated as CSS custom properties
7. **Real-time Sync** — WebSocket-based session push, auto-reconnect with state recovery
8. **Build Integration** — Vite build bundled at npm publish time, included in package
9. **Shared Types Package** — Extract common types to `packages/shared/` workspace package

### Out of Scope

1. **Remote access** — Server binds to 127.0.0.1 only, no authentication, no HTTPS
2. **PWA/offline support** — No service worker, no offline mode
3. **Collaborative editing** — No multi-user session sharing
4. **TUI replacement** — Web UI is additive; TUI renderers remain unchanged
5. **Server-side rendering** — Pure SPA, no SSR/SSG

## Approach

### Architecture Overview

```
┌─────────────────────────┐     ┌──────────────────────────┐
│  MCP Server / AI Agent  │     │  Svelte 5 SPA (Browser)  │
│  (creates sessions)     │     │  shadcn-svelte + TW v4   │
└──────────┬──────────────┘     └──────────┬───────────────┘
           │ writes files                   │ WebSocket + REST
           ▼                                ▼
┌─────────────────────────────────────────────────────────┐
│  SessionManager (filesystem-based IPC)                  │
│  ├── sessions/{id}/request.json                         │
│  ├── sessions/{id}/status.json                          │
│  └── sessions/{id}/answers.json                         │
└──────────┬──────────────────────────────────────────────┘
           │ file watcher events
           ▼
┌─────────────────────────────────────────────────────────┐
│  Hono Web Server (localhost:{port})                     │
│  ├── Static: serves dist/web-ui/ assets                 │
│  ├── REST:  /api/sessions, /api/config, /api/themes     │
│  ├── WS:    /ws — real-time session events              │
│  └── Bridge: EnhancedTUISessionWatcher → WS broadcast   │
└─────────────────────────────────────────────────────────┘
```

### Technology Choices

| Layer          | Technology                        | Rationale                                                       |
| -------------- | --------------------------------- | --------------------------------------------------------------- |
| HTTP Server    | Hono + @hono/node-server          | Lightweight, TypeScript-native, WS support, Bun+Node compatible |
| Frontend       | Svelte 5 + Vite                   | Runes reactivity, small bundle, fast build                      |
| UI Components  | shadcn-svelte + Tailwind CSS v4   | Copy-paste components, CSS custom properties for theming        |
| Routing        | svelte-spa-router (hash-based)    | Works without server rewrite rules                              |
| WebSocket      | @hono/node-ws + native browser WS | Integrated with Hono, auto-reconnect client                     |
| Port Selection | get-port                          | Reliable free port detection                                    |
| Browser Launch | open                              | Cross-platform browser opening                                  |

### Key Design Decisions

1. **Renderer pattern** — Web is a third renderer alongside ink/opentui, selected via config or `--web` flag
2. **WebSocket for real-time push, REST for actions** — Session state changes pushed via WS; answer submission, rejection, config changes via REST for reliability
3. **Reuse EnhancedTUISessionWatcher** — Same file watcher that powers TUI, bridged to WS
4. **Build-time asset bundling** — Vite builds SPA to `dist/web-ui/`, included in npm package
5. **Shared types via workspace package** — `packages/shared/` imported by both CLI and SPA
6. **CSS custom properties for themes** — Build script converts theme.ts → CSS, applied to :root via `data-theme` attribute
7. **Coexistence** — TUI and web UI can run simultaneously; first to answer a session wins (atomic file ops)

## Impact Analysis

### Affected Specs

| Spec               | Impact | Details                                                    |
| ------------------ | ------ | ---------------------------------------------------------- |
| cli-interface      | Minor  | Add `--web` flag, `renderer: "web"` config value           |
| tui-application    | None   | TUI remains unchanged                                      |
| session-management | None   | SessionManager API unchanged; web server is a new consumer |

### New Specs Required

| Spec       | Description                                                   |
| ---------- | ------------------------------------------------------------- |
| web-server | Hono server, WS protocol, REST API, session bridge, lifecycle |
| web-ui     | Svelte SPA, components, stores, routing, theme integration    |

### Dependencies

**New npm packages (runtime):**

- `hono` ^4.x
- `@hono/node-server` ^1.19.x
- `@hono/node-ws` ^1.3.x
- `get-port` ^7.x
- `open` ^10.x

**New npm packages (dev/build):**

- `svelte` ^5.37.x
- `@sveltejs/vite-plugin-svelte` ^5.x
- `vite` ^6.x
- `tailwindcss` ^4.x
- `@tailwindcss/vite` ^4.x
- `bits-ui` ^1.x (shadcn-svelte dependency)
- `clsx` ^2.x
- `tailwind-merge` ^2.x
- `svelte-spa-router` ^5.x
- `marked` ^15.x
- `highlight.js` ^11.x

### Risk Assessment

| Risk                         | Severity | Mitigation                                                |
| ---------------------------- | -------- | --------------------------------------------------------- |
| npm package size increase    | Medium   | Target <1MB gzipped; Vite tree-shaking + minification     |
| Bun/Node runtime differences | Medium   | Abstract adapter selection; test both runtimes            |
| WebSocket reliability        | Low      | Auto-reconnect with exponential backoff + full state sync |
| Theme parity                 | Low      | Build script generates CSS from same theme definitions    |
| Concurrent answering race    | Low      | Filesystem atomic operations already handle this          |

## Acceptance Criteria

1. `auq --web` launches local server and opens browser
2. All TUI features work in web UI (session queue, answering, review, rejection, elaborate, themes, i18n)
3. Config editor validates all fields with Zod and saves to `.auqrc.json`
4. Sessions arrive in real-time via WebSocket
5. Auto-reconnect recovers full state after disconnect
6. TUI and web UI can coexist simultaneously
7. `bun run build` produces working `dist/web-ui/` assets
8. npm package size remains under 1MB gzipped
9. All new server code has unit tests
10. WCAG AA basics: keyboard nav, focus management, ARIA labels, sufficient contrast
