---
created: 2026-03-28T00:00:00Z
last_updated: 2026-03-28T00:00:00Z
type: spec
change_id: add-web-ui
status: pending
trigger: "Apply add-web-ui spec: implement task groups 1-10 (shared types through question answering components)"
---

# Plan: Add Web UI — Increment 1 (Tasks 1–10)

## Background & Research

### Research References

- `.slash/workspace/research/spec-add-web-ui-hono-websocket.md` — Hono HTTP + WebSocket setup, static serving, broadcast pattern, graceful shutdown, get-port
- `.slash/workspace/research/spec-add-web-ui-react-spa-setup.md` — Vite + React 19, shadcn/ui init, Tailwind v4, Jotai v2 atoms, react-router v7 hash routing, monorepo workspace setup

### OpenSpec References

- `openspec/changes/add-web-ui/proposal.md` — Change motivation, scope, tech stack
- `openspec/changes/add-web-ui/design.md` — Full architecture: server, WS protocol, SPA structure, Jotai atoms, routing
- `openspec/changes/add-web-ui/tasks.md` — 20 task groups; this plan covers groups 1–10
- `openspec/changes/add-web-ui/specs/web-server/spec.md` — Server lifecycle, WS connection, session/config/history bridges, security
- `openspec/changes/add-web-ui/specs/web-ui/spec.md` — Feature parity specs: session queue, stepper/form, review, reject, elaborate, quick submit, themes, shortcuts

### Key Source Code Snapshots

**`src/config/types.ts` (lines 1-48) — Config schema to extend:**

```typescript
import { z } from "zod";

export const NotificationConfigSchema = z.object({
  enabled: z.boolean().default(true),
  sound: z.boolean().default(true),
});

export type NotificationConfig = z.infer<typeof NotificationConfigSchema>;

export const AUQConfigSchema = z.object({
  maxOptions: z.number().min(2).max(10).default(5),
  maxQuestions: z.number().min(1).max(10).default(5),
  recommendedOptions: z.number().min(1).max(10).default(4),
  recommendedQuestions: z.number().min(1).max(10).default(4),
  sessionTimeout: z.number().min(0).default(0),
  retentionPeriod: z.number().min(0).default(604800000),
  language: z.string().default("auto"),
  theme: z.string().default("system"),
  autoSelectRecommended: z.boolean().default(true),
  renderer: z.enum(["ink", "opentui"]).default("opentui"), // ← add "web"
  staleThreshold: z.number().min(0).default(7200000),
  notifyOnStale: z.boolean().default(true),
  staleAction: z.enum(["warn", "remove", "archive"]).default("warn"),
  notifications: NotificationConfigSchema.default({
    enabled: true,
    sound: true,
  }),
  updateCheck: z.boolean().default(true),
});

export type AUQConfig = z.infer<typeof AUQConfigSchema>;
```

**`bin/auq.tsx` (lines 355-379) — Default TUI launch section where `--web` flag goes:**

```typescript
if (command === "history") {
  const { runHistoryCommand } = await import("../src/cli/commands/history.js");
  await runHistoryCommand(args.slice(1));
  await updateNotification;
  process.exit(0);
}

// Default: Start TUI
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "production";
}

const { getConfig } = await import("../src/config/index.js");
const { initI18n } = await import("../src/i18n/index.js");

const config = getConfig();
initI18n(config.language);

const { runTui } = await import("./tui-app.js");
runTui(config);
```

**`bin/tui-app.tsx` (lines 870-888) — Renderer selection to extend with "web":**

```typescript
export const runTui = async (config?: AUQConfig): Promise<void> => {
  const mergedConfig: AUQConfig = { ...DEFAULT_CONFIG, ...config };
  const rendererType =
    process.env.AUQ_RENDERER || mergedConfig.renderer || "opentui";

  if (rendererType === "opentui") {
    try {
      const opentuiPath = "../src/tui-opentui/app.js";
      const { runTui: runOpenTui } = (await import(opentuiPath)) as {
        runTui: (config: AUQConfig) => Promise<void>;
      };
      await runOpenTui(mergedConfig);
    } catch (err) {
      console.error(`⚠️ OpenTUI failed to initialize: ...`);
      await runInkTui(mergedConfig);
    }
  } else {
    await runInkTui(mergedConfig);
  }
};
```

**`src/session/types.ts` (lines 1-103) — Types to extract to shared package:**

```typescript
export interface Option {
  description?: string;
  label: string;
}
export interface Question {
  options: Option[];
  prompt: string;
  title: string;
  multiSelect?: boolean;
}
export interface SessionAnswer {
  answers: UserAnswer[];
  sessionId: string;
  timestamp: string;
  callId?: string;
  workingDirectory?: string;
  lastReadAt?: string;
}
export interface SessionConfig {
  baseDir: string;
  maxSessions?: number;
  retentionPeriod?: number;
  sessionTimeout?: number;
}
export interface SessionRequest {
  questions: Question[];
  sessionId: string;
  status:
    | "completed"
    | "elaborate_requested"
    | "in-progress"
    | "pending"
    | "rejected"
    | "rephrase_requested"
    | "timed_out";
  timestamp: string;
  callId?: string;
  workingDirectory?: string;
}
export interface SessionStatus {
  createdAt: string;
  currentQuestionIndex?: number;
  lastModified: string;
  sessionId: string;
  status:
    | "abandoned"
    | "completed"
    | "elaborate_requested"
    | "in-progress"
    | "pending"
    | "rejected"
    | "rephrase_requested"
    | "timed_out";
  totalQuestions: number;
  callId?: string;
  rejectionReason?: string | null;
  workingDirectory?: string;
}
export interface UserAnswer {
  customText?: string;
  questionIndex: number;
  selectedOption?: string;
  selectedOptions?: string[];
  timestamp: string;
}
export const SESSION_FILES = {
  ANSWERS: "answers.json",
  REQUEST: "request.json",
  STATUS: "status.json",
} as const;
export type SessionStatusValue = SessionStatus["status"];
export const DEFAULT_SESSION_CONFIG: Partial<SessionConfig> = {
  baseDir: "~/.local/share/auq/sessions",
  maxSessions: 100,
  retentionPeriod: 604800000,
  sessionTimeout: 0,
};
```

**`src/tui/shared/themes/index.ts` — Theme registry (16 themes):**

```typescript
const builtInThemes: Map<string, Theme> = new Map([
  ["AUQ dark", darkTheme], ["AUQ light", lightTheme], ["nord", nordTheme],
  ["dracula", draculaTheme], ["catppuccin-mocha", catppuccinMochaTheme],
  ["catppuccin-latte", catppuccinLatteTheme], ["solarized-dark", solarizedDarkTheme],
  ["solarized-light", solarizedLightTheme], ["gruvbox-dark", gruvboxDarkTheme],
  ["gruvbox-light", gruvboxLightTheme], ["tokyo-night", tokyoNightTheme],
  ["one-dark", oneDarkTheme], ["monokai", monokaiTheme],
  ["github-dark", githubDarkTheme], ["github-light", githubLightTheme],
  ["rose-pine", rosePineTheme],
]);
export function getTheme(name: string): Theme | undefined { ... }
export function listThemes(): string[] { ... }
```

**`src/tui/shared/themes/types.ts` — Theme interface structure:**

- `theme.name: string`
- `theme.gradient: { start, middle, end }`
- `theme.colors: { bg, surface, surfaceAlt, primary, success, warning, error, info, focused, selected, pending, unansweredHighlight, text, textDim, textBold }`
- `theme.borders: { primary, warning, error, neutral }`
- `theme.components: { header, directory, tabBar, options, input, review, questionDisplay, footer, toast, markdown, sessionDots, sessionPicker }` — each with multiple sub-properties

**`src/config/ConfigLoader.ts` — Config loading API surface:**

```typescript
export function loadConfig(): AUQConfig {
  /* defaults → global → local merge */
}
export function getConfig(): AUQConfig {
  /* cached singleton */
}
export function reloadConfig(): AUQConfig {
  /* clear cache + reload */
}
export function getConfigPaths(): { local; global; localExists; globalExists };
function readConfigFile(filePath: string): Partial<AUQConfig> | null {
  /* Zod partial validation */
}
function getGlobalConfigPath(): string {
  /* ~/.config/auq/.auqrc.json */
}
function getLocalConfigPath(): string {
  /* ./.auqrc.json */
}
```

**SessionManager API surface (key methods for web server bridge):**

```typescript
class SessionManager {
  createSession(questions, workingDirectory?): string;
  saveSessionAnswers(sessionId, answers): void; // ← web bridge calls this
  rejectSession(sessionId, reason?): void; // ← web bridge calls this
  getSessionStatus(sessionId): SessionStatus | null;
  getSessionAnswers(sessionId): SessionAnswer | null;
  getSessionRequest(sessionId): SessionRequest | null;
  getPendingSessions(options?): string[];
  getAllSessionIds(): string[];
  deleteSession(sessionId): void;
  initialize(): void;
  sessionExists(sessionId): boolean;
}
```

**Hono + WebSocket key pattern (from research):**

```typescript
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { createNodeWebSocket, type ServerWebSocket } from "@hono/node-ws";
import getPort from "get-port";

const app = new Hono();
const clients = new Set<ServerWebSocket>();
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

app.get(
  "/ws",
  upgradeWebSocket((c) => ({
    onOpen(_, ws) {
      clients.add(ws);
    },
    onMessage(event, ws) {
      /* route messages */
    },
    onClose() {
      clients.delete(ws);
    },
  })),
);

// Static + SPA fallback
app.use("/assets/*", serveStatic({ root: STATIC_ROOT }));
app.get("*", serveStatic({ root: STATIC_ROOT, path: "index.html" }));

const port = await getPort({ port: 3000 });
const server = serve({ fetch: app.fetch, port, hostname: "127.0.0.1" });
injectWebSocket(server);
```

**`package.json` key info:**

- Name: `auq-mcp-server`, version: `3.4.0`
- Existing workspaces: `["packages/opencode-plugin"]` — extend to `["packages/*"]`
- Build script: `"build": "bun run sync-plugin-schemas && bun run generate:skill && tsc && tsc -p tsconfig.opentui.json"`
- Files array: `["dist", "bin/auq", "scripts/postinstall.cjs", "README.md", "LICENSE"]` — needs `packages/web-ui/dist/`, `packages/shared/dist/`
- `tsconfig.json`: extends `@tsconfig/node22`, outDir: `dist`, jsx: `react`, includes `src` + `bin`

### Architecture Decisions

1. **Shared types as workspace package** — `packages/shared/` with `@auq/shared` name, imported by both CLI and SPA
2. **WebSocket-only communication** — no REST API; all messages through WS envelope `{ type, payload, requestId?, timestamp }`
3. **Hono + @hono/node-ws** — lightweight, TypeScript-native, Bun-compatible
4. **React 19 + Vite + shadcn/ui + Jotai + react-router v7** — unified React stack
5. **Hash-based routing** — `createHashRouter` for SPA (no server routes needed)
6. **CSS custom properties for themes** — build script generates CSS from existing theme objects
7. **16 themes** — all existing TUI themes converted to CSS variables via `[data-theme="{name}"]` selectors

---

## Testing Plan (TDD — tests first)

### Task Group 1: Shared Types Package Tests

- [ ] 1.T1 Create `packages/shared/src/__tests__/session-types.test.ts` — verify all session type exports compile and are structurally correct (import check)
- [ ] 1.T2 Create `packages/shared/src/__tests__/config-types.test.ts` — verify AUQConfigSchema validates correctly, including new `"web"` renderer value
- [ ] 1.T3 Create `packages/shared/src/__tests__/ws-protocol.test.ts` — verify WSMessage envelope type, all message type constants exist and are correctly typed

### Task Group 2: Config Schema Extension Tests

- [ ] 2.T1 Add test case in `src/config/__tests__/ConfigLoader.test.ts` — verify `renderer: "web"` passes Zod validation
- [ ] 2.T2 Add test case in `src/config/__tests__/ConfigLoader.test.ts` — verify `renderer: "invalid"` fails Zod validation

### Task Group 4: Web Server Tests

- [ ] 4.T1 Create `src/web-server/__tests__/ws-handler.test.ts` — test WebSocket message routing: valid message dispatched to correct handler, invalid message type returns error
- [ ] 4.T2 Create `src/web-server/__tests__/session-bridge.test.ts` — test session bridge: mock SessionManager, verify `session:list` returns pending sessions, `session:answer` calls saveSessionAnswers, `session:reject` calls rejectSession
- [ ] 4.T3 Create `src/web-server/__tests__/config-bridge.test.ts` — test config bridge: mock ConfigLoader, verify `config:get` returns config, `config:set` validates with Zod, `config:reset` resets correctly
- [ ] 4.T4 Create `src/web-server/__tests__/app.test.ts` — test Hono app: static file serving route exists, SPA fallback returns index.html for unknown paths

### Task Group 5: Theme CSS Generation Tests

- [ ] 5.T1 Create `scripts/__tests__/generate-theme-css.test.ts` — verify CSS generation: all 16 themes produce output, each has `[data-theme="..."]` selector, all color tokens mapped, system preference media queries present

---

## Implementation Plan

### Task Group 1: Shared Types Package Extraction

- [ ] 1.1 Create `packages/shared/package.json` with name `@auq/shared`, type `module`, main `./dist/index.js`, types `./dist/index.d.ts`, exports map
- [ ] 1.2 Create `packages/shared/tsconfig.json` targeting ES2022, module NodeNext, declaration: true, outDir: `dist`
- [ ] 1.3 Create `packages/shared/src/session-types.ts` — move `Option`, `Question`, `SessionAnswer`, `SessionConfig`, `SessionRequest`, `SessionStatus`, `UserAnswer`, `SESSION_FILES`, `SessionStatusValue`, `DEFAULT_SESSION_CONFIG` from `src/session/types.ts`
- [ ] 1.4 Create `packages/shared/src/config-types.ts` — move `NotificationConfigSchema`, `NotificationConfig`, `AUQConfigSchema`, `AUQConfig` from `src/config/types.ts` (keep re-export in original files for backward compat)
- [ ] 1.5 Create `packages/shared/src/ws-protocol.ts` — define `WSMessage` envelope interface and all message type string constants: `session:list`, `session:list:result`, `session:new`, `session:answer`, `session:answer:result`, `session:reject`, `session:reject:result`, `session:status`, `session:removed`, `config:get`, `config:get:result`, `config:set`, `config:set:result`, `config:reset`, `config:reset:result`, `config:export`, `config:export:result`, `config:import`, `config:import:result`, `history:list`, `history:list:result`, `history:detail`, `history:detail:result`, `system:sync`, `system:update`, `system:ping`, `system:pong`
- [ ] 1.6 Create `packages/shared/src/index.ts` — barrel re-export from session-types, config-types, ws-protocol
- [ ] 1.7 Update `src/session/types.ts` to re-export from `@auq/shared` (backward compat): `export { Option, Question, ... } from "@auq/shared"`
- [ ] 1.8 Update `src/config/types.ts` to re-export from `@auq/shared`: `export { AUQConfigSchema, AUQConfig, ... } from "@auq/shared"`
- [ ] 1.9 Update all other import paths in `src/` that import from `../session/types` or `../config/types` — no changes needed since those files still re-export
- [ ] 1.10 Update root `package.json` workspaces from `["packages/opencode-plugin"]` to `["packages/*"]`
- [ ] 1.11 Update root `tsconfig.json` — add path alias `"@auq/shared": ["./packages/shared/src"]` in compilerOptions.paths (with baseUrl: ".")
- [ ] 1.12 Run `bun install` to link workspace package
- [ ] 1.13 Verify existing build passes: `bun run build`
- [ ] 1.14 Verify existing tests pass: `bun run test`

### Task Group 2: Config Schema Extension

- [ ] 2.1 In `packages/shared/src/config-types.ts`, change renderer enum to `z.enum(["ink", "opentui", "web"]).default("opentui")`
- [ ] 2.2 Verify `src/config/types.ts` re-export picks up the change
- [ ] 2.3 Update `bin/tui-app.tsx` `runTui()` — add `if (rendererType === "web")` branch that dynamically imports `../src/web-server/index.js` and calls `startWebServer(mergedConfig)`
- [ ] 2.4 Verify existing config CLI `get`/`set` handlers work with `"web"` value (no code change expected — Zod handles it)

### Task Group 3: CLI --web Flag

- [ ] 3.1 In `bin/auq.tsx`, add `--web`/`-w` flag detection before the "Default: Start TUI" section — check `args.includes('--web') || args.includes('-w')`
- [ ] 3.2 Add `--no-open` flag detection: `args.includes('--no-open')`
- [ ] 3.3 Add `--port` flag detection: parse `--port <number>` from args
- [ ] 3.4 Wire flags: if `--web`, dynamically import `../src/web-server/index.js`, call `startWebServer({ open: !noOpen, port, config })`; then `return` to skip TUI
- [ ] 3.5 Update help text (the `--help` handler) to document `--web`, `--no-open`, `--port` flags

### Task Group 4: Web Server (Hono)

- [ ] 4.1 Install runtime deps: `bun add hono @hono/node-server @hono/node-ws get-port open`
- [ ] 4.2 Create `src/web-server/index.ts` — `startWebServer(opts: { open: boolean; port?: number; config: AUQConfig })`: get-port, serve on 127.0.0.1, injectWebSocket, browser open, graceful shutdown (SIGINT/SIGTERM), keep-alive promise
- [ ] 4.3 Create `src/web-server/app.ts` — Hono app with: WebSocket upgrade route at `/ws`, static file serving from `packages/web-ui/dist/`, SPA fallback (non-file routes → index.html)
- [ ] 4.4 Create `src/web-server/ws-protocol.ts` — import message types from `@auq/shared/ws-protocol`, re-export for server use; define `broadcast(clients, msg)` helper
- [ ] 4.5 Create `src/web-server/ws-handler.ts` — WebSocket upgrade handler: onOpen (add to clients set, send `system:sync`), onMessage (JSON parse → route by `msg.type` to session/config/history bridge), onClose (remove from clients), onError (log)
- [ ] 4.6 Create `src/web-server/session-bridge.ts`:
  - [ ] 4.6.1 Instantiate `EnhancedTUISessionWatcher`, listen for `session-created` events → broadcast `session:new`
  - [ ] 4.6.2 Handle `session:list` → get pending sessions via watcher.getPendingSessions() + getSessionRequest() for each, return `session:list:result`
  - [ ] 4.6.3 Handle `session:answer` → call SessionManager.saveSessionAnswers(), return `session:answer:result` with success/failure
  - [ ] 4.6.4 Handle `session:reject` → call SessionManager.rejectSession(), return `session:reject:result`
  - [ ] 4.6.5 Implement 2-second polling interval for status changes (stale, abandoned, answered elsewhere) — diff with previous state
  - [ ] 4.6.6 Broadcast `session:status` on status changes, `session:removed` on deletion
- [ ] 4.7 Create `src/web-server/config-bridge.ts`:
  - [ ] 4.7.1 Handle `config:get` → use ConfigLoader to read config for scope (local/global), return `config:get:result`
  - [ ] 4.7.2 Handle `config:set` → validate with Zod, write config file via `fs.writeFileSync`, return `config:set:result`
  - [ ] 4.7.3 Handle `config:reset` → reset field or all fields, write config, return `config:reset:result`
  - [ ] 4.7.4 Handle `config:export` → read raw JSON file, return `config:export:result`
  - [ ] 4.7.5 Handle `config:import` → validate JSON with Zod, write config, return `config:import:result`
- [ ] 4.8 Implement `system:sync` — on WS connect, send full pending session list + current config
- [ ] 4.9 Implement `system:ping`/`system:pong` keepalive
- [ ] 4.10 Implement history bridge:
  - [ ] 4.10.1 Handle `history:list` → scan session directory, filter/sort/paginate, return `history:list:result`
  - [ ] 4.10.2 Handle `history:detail` → read full session data, return `history:detail:result`
- [ ] 4.11 Add Origin header validation for WebSocket upgrades (localhost only)
- [ ] 4.12 Add message size limit (1MB) and rate limiting (100 msg/s)

### Task Group 5: Theme CSS Generation

- [ ] 5.1 Create `scripts/generate-theme-css.ts` — import all 16 themes from `src/tui/shared/themes/index.ts`, iterate: for each theme generate `[data-theme="{name}"]` CSS selector with all color tokens as CSS custom properties (`--color-bg`, `--color-surface`, `--color-primary`, etc.)
- [ ] 5.2 Map all `theme.colors.*`, `theme.borders.*`, and key `theme.components.*` values to CSS variables
- [ ] 5.3 Add `@media (prefers-color-scheme: dark)` mapping to "AUQ dark" theme and `@media (prefers-color-scheme: light)` mapping to "AUQ light" theme as `:root` defaults
- [ ] 5.4 Write output to `packages/web-ui/src/themes/generated.css`
- [ ] 5.5 Add `"generate:themes": "bun scripts/generate-theme-css.ts"` script to root package.json
- [ ] 5.6 Verify all 16 themes produce valid CSS output (run script, check file exists and has correct selectors)

### Task Group 6: React SPA Setup

- [ ] 6.1 Create `packages/web-ui/package.json` — name `@auq/web-ui`, deps: react, react-dom, react-router-dom, jotai; devDeps: vite, @vitejs/plugin-react, tailwindcss, @tailwindcss/vite, typescript; dep on `@auq/shared: "workspace:*"`
- [ ] 6.2 Create `packages/web-ui/tsconfig.json` — target ES2022, jsx react-jsx, moduleResolution bundler, paths `@/*` → `./src/*`, `@auq/shared` → `../../packages/shared/src`
- [ ] 6.3 Create `packages/web-ui/vite.config.ts` — react plugin, tailwindcss plugin, resolve alias `@` → `./src`, build outDir `dist`, manual chunks for vendor splitting
- [ ] 6.4 Create `packages/web-ui/index.html` — basic HTML shell with `<div id="root">`, `<script type="module" src="/src/main.tsx">`
- [ ] 6.5 Create `packages/web-ui/src/app.css` — `@import "tailwindcss"`, import generated theme CSS, base body styles using CSS variables
- [ ] 6.6 Initialize shadcn/ui: create `packages/web-ui/components.json`, create `packages/web-ui/src/lib/utils.ts` with `cn()` utility (clsx + tailwind-merge)
- [ ] 6.7 Install shadcn deps: `bun add clsx tailwind-merge class-variance-authority lucide-react @radix-ui/react-slot` in web-ui package
- [ ] 6.8 Create `packages/web-ui/src/main.tsx` — `createRoot(document.getElementById("root")!).render(<App />)`
- [ ] 6.9 Create `packages/web-ui/src/App.tsx` — Jotai `<Provider>`, `<RouterProvider router={router}>` with `createHashRouter`
- [ ] 6.10 Create route stubs: `packages/web-ui/src/routes/Questions.tsx`, `Config.tsx`, `History.tsx` — placeholder components
- [ ] 6.11 Set up `data-theme` attribute switching — read theme atom, apply to `document.documentElement.dataset.theme`
- [ ] 6.12 Verify Vite dev server starts: `cd packages/web-ui && bunx vite`
- [ ] 6.13 Verify Vite build produces working `dist/`: `cd packages/web-ui && bunx vite build`

### Task Group 7: WebSocket Client

- [ ] 7.1 Create `packages/web-ui/src/lib/ws/protocol.ts` — import WSMessage and all message type constants from `@auq/shared`
- [ ] 7.2 Create `packages/web-ui/src/lib/ws/client.ts` — `WSClient` class: `connect(url)`, `reconnect()` with exponential backoff (1s→30s max, 10 attempts), `send(type, payload?, requestId?)`, `on(type, handler)`, `close()`. Maintain `ws: WebSocket | null`, `reconnectAttempts`, `handlers: Map<string, Function>`
- [ ] 7.3 Implement `system:sync` handler — on message type `system:sync`, populate sessions atom, config atom from payload
- [ ] 7.4 Create reconnect banner atom: `connectionStatusAtom` updated on open/close/reconnect events

### Task Group 8: Jotai Atoms (State Management)

- [ ] 8.1 Create `packages/web-ui/src/lib/atoms/sessions.ts` — `sessionsAtom` (SessionRequest[]), `activeSessionIdAtom` (string|null), `viewModeAtom` ('stepper'|'form'), `answersAtom` (Map<string, Map<number, UserAnswer>>); derived: `activeSessionAtom`, `pendingCountAtom`
- [ ] 8.2 Create `packages/web-ui/src/lib/atoms/config.ts` — `configAtom` (AUQConfig), `scopeAtom` ('local'|'global')
- [ ] 8.3 Create `packages/web-ui/src/lib/atoms/theme.ts` — `themeAtom` (string), system preference detection via `window.matchMedia('(prefers-color-scheme: dark)')`, default theme selection
- [ ] 8.4 Create `packages/web-ui/src/lib/atoms/history.ts` — `historyAtom` (SessionRequest[]), `paginationAtom` ({page, pageSize, total}), `filtersAtom` ({status?}), `searchAtom` (string)
- [ ] 8.5 Create `packages/web-ui/src/lib/atoms/connection.ts` — `connectionStatusAtom` ('connected'|'reconnecting'|'disconnected')
- [ ] 8.6 Create `packages/web-ui/src/lib/ws/hooks.ts` — `useWebSocket()` hook: on mount, create WSClient, connect to `ws://localhost:{port}/ws`, register message handlers that update Jotai atoms via `useSetAtom`; return client instance

### Task Group 9: Layout Components

- [ ] 9.1 Create `packages/web-ui/src/components/layout/Sidebar.tsx` — session list: map `sessionsAtom`, show question count + working dir + relative time per entry, highlight active session, click to switch `activeSessionIdAtom`, show stale/abandoned badges
- [ ] 9.2 Create `packages/web-ui/src/components/layout/Header.tsx` — logo text "AUQ", nav links (Questions/#/, Config/#/config, History/#/history) via `<NavLink>`, mode toggle button (stepper/form), theme selector dropdown, update badge (future)
- [ ] 9.3 Create `packages/web-ui/src/components/layout/ConnectionBanner.tsx` — conditional on `connectionStatusAtom === 'reconnecting'`: show top banner "Reconnecting..." with progress; on `disconnected`: show "Connection lost" with retry button
- [ ] 9.4 Create `packages/web-ui/src/components/layout/Layout.tsx` — responsive shell: sidebar (left, 280px) + main content area; sidebar collapses to hamburger on mobile (<768px)

### Task Group 10: Question Answering Components

- [ ] 10.1 Create `packages/web-ui/src/components/questions/StepperView.tsx` — one-at-a-time question display: read `activeSessionAtom` and current question index from local state, show QuestionCard + OptionsList + CustomInput + ElaborateButton, Back/Next buttons, progress indicator "Question {n} of {total}"
- [ ] 10.2 Create `packages/web-ui/src/components/questions/FormView.tsx` — scrollable list of all questions as cards, each with OptionsList + CustomInput, Submit button at bottom
- [ ] 10.3 Create `packages/web-ui/src/components/questions/QuestionCard.tsx` — render question prompt (with markdown via `marked` library), question title badge, multiSelect indicator
- [ ] 10.4 Create `packages/web-ui/src/components/questions/OptionsList.tsx` — for single-select: radio group; for multi-select: checkbox group; highlight recommended options (label contains "(Recommended)" case-insensitive); pre-select recommended by default; "Other" always available with CustomInput
- [ ] 10.5 Create `packages/web-ui/src/components/questions/CustomInput.tsx` — auto-growing `<textarea>` for "Other" option: Enter submits/advances, Shift+Enter inserts newline, placeholder "Type your answer..."
- [ ] 10.6 Create `packages/web-ui/src/components/questions/ElaborateButton.tsx` — toggle button "Ask to elaborate" that shows/hides multi-line textarea for elaboration guidance
- [ ] 10.7 Create `packages/web-ui/src/components/questions/QuickSubmitButton.tsx` — visible when any question has recommended options; clicking auto-selects recommended for all unanswered questions and navigates to review
- [ ] 10.8 Create `packages/web-ui/src/components/questions/WaitingScreen.tsx` — empty state when no pending sessions: centered message "Waiting for questions...", subtle animation
- [ ] 10.9 Wire stepper/form toggle in Header to switch `viewModeAtom` between 'stepper' and 'form', preserving answer state

### Build Integration (partial — enough for increment 1)

- [ ] B.1 Add `"build:shared": "cd packages/shared && tsc"` script to root package.json
- [ ] B.2 Add `"build:web-ui": "bun run generate:themes && cd packages/web-ui && bunx vite build"` script to root package.json
- [ ] B.3 Update main `"build"` script to: `bun run build:shared && bun run build:web-ui && bun run sync-plugin-schemas && bun run generate:skill && tsc && tsc -p tsconfig.opentui.json`
- [ ] B.4 Add `"packages/web-ui/dist/"` and `"packages/shared/dist/"` to `files` array in root package.json
- [ ] B.5 Verify full build pipeline: `bun run build` completes without errors
- [ ] B.6 Verify existing tests still pass: `bun run test`

---

## Parallelization Plan

### Batch 1 (parallel — foundation, no file overlaps)

- [ ] **Coder A: Shared Types Package (Task Group 1)** → files: `packages/shared/` (all new files), `src/session/types.ts` (re-export update), `src/config/types.ts` (re-export update), `package.json` (workspaces), `tsconfig.json` (paths)
  - Tasks: 1.T1–1.T3, 1.1–1.14
- [ ] **Coder B: Theme CSS Generation (Task Group 5)** → files: `scripts/generate-theme-css.ts` (new), `scripts/__tests__/generate-theme-css.test.ts` (new)
  - Tasks: 5.T1, 5.1–5.6
  - Note: reads `src/tui/shared/themes/` but does NOT modify it
- [ ] **Coder C: React SPA Scaffold (Task Group 6, without theme integration)** → files: `packages/web-ui/` (all new files except theme-dependent CSS)
  - Tasks: 6.1–6.10, 6.12–6.13
  - Note: creates placeholder theme import; actual generated.css wired in Batch 2

### Batch 2 (parallel — after Batch 1 completes, depends on shared types + SPA scaffold)

- [ ] **Coder D: Config Extension + CLI Flags (Task Groups 2–3)** → files: `packages/shared/src/config-types.ts` (renderer enum), `bin/auq.tsx`, `bin/tui-app.tsx`
  - Tasks: 2.T1–2.T2, 2.1–2.4, 3.1–3.5
  - Depends on: Batch 1 Coder A (shared types exist)
- [ ] **Coder E: Web Server Core (Task Group 4)** → files: `src/web-server/` (all new files), `src/web-server/__tests__/` (all new test files)
  - Tasks: 4.T1–4.T4, 4.1–4.12
  - Depends on: Batch 1 Coder A (shared types for WS protocol), needs `hono` deps installed
- [ ] **Coder F: Theme Integration + SPA Wiring (Task Group 6 remainder)** → files: `packages/web-ui/src/app.css`, `packages/web-ui/src/themes/` (import generated CSS)
  - Tasks: 6.5 (finalize with theme CSS import), 6.11
  - Depends on: Batch 1 Coder B (theme CSS generated), Batch 1 Coder C (SPA scaffold exists)

### Batch 3 (parallel — after Batch 2 completes, depends on web server + SPA)

- [ ] **Coder G: WebSocket Client + Jotai Atoms (Task Groups 7–8)** → files: `packages/web-ui/src/lib/ws/`, `packages/web-ui/src/lib/atoms/`
  - Tasks: 7.1–7.4, 8.1–8.6
  - Depends on: Batch 1 Coder A (shared WS protocol types), Batch 1 Coder C (SPA scaffold)
- [ ] **Coder H: Layout Components (Task Group 9)** → files: `packages/web-ui/src/components/layout/`
  - Tasks: 9.1–9.4
  - Depends on: Batch 1 Coder C (SPA scaffold, routing), can stub atoms initially

### Batch 4 (sequential — after Batch 3, depends on atoms + layout)

- [ ] **Coder I: Question Answering Components (Task Group 10)** → files: `packages/web-ui/src/components/questions/`
  - Tasks: 10.1–10.9
  - Depends on: Batch 3 Coder G (Jotai atoms for sessions, answers, viewMode), Batch 3 Coder H (Layout shell)

### Batch 5 (sequential — final integration)

- [ ] **Coder J: Build Integration + Verification** → files: `package.json` (scripts + files array only)
  - Tasks: B.1–B.6
  - Depends on: ALL previous batches complete

### Dependencies

- **Batch 1** is fully parallel — Coder A (shared types), B (theme CSS), C (SPA scaffold) touch completely separate files
- **Batch 2** needs shared types (from Coder A) and SPA scaffold (from Coder C) to exist
- **Batch 3** needs WS protocol types and SPA scaffold; atoms reference shared types
- **Batch 4** needs atoms defined (Coder G) and layout shell (Coder H) for composition
- **Batch 5** is integration verification — needs everything

### Risk Areas

- **`package.json` contention**: Coder A (workspaces), Coder E (deps install), Coder J (scripts) all touch `package.json`. Mitigation: Coder A does it first; Coder E only runs `bun add`; Coder J only modifies scripts/files arrays.
- **`src/config/types.ts` + `packages/shared/src/config-types.ts`**: Coder A creates the re-export; Coder D modifies the renderer enum in shared. Order: A before D.
- **Import path consistency**: After Coder A extracts types, all other coders must import from `@auq/shared` not old paths. The re-export bridge in `src/session/types.ts` and `src/config/types.ts` mitigates this.
- **Vite build path for static serving**: `src/web-server/app.ts` must resolve `packages/web-ui/dist/` relative to the compiled `dist/src/web-server/app.js`. Use `import.meta.url` + `path.resolve` to calculate correct path.
- **shadcn/ui initialization**: May need manual setup rather than `npx shadcn init` if the interactive CLI doesn't work in CI. Coder C should create `components.json` + `utils.ts` manually.

---

## Done Criteria

- [ ] All tests pass: `bun run test` (existing + new)
- [ ] Full build succeeds: `bun run build`
- [ ] `auq --web` starts Hono server on localhost, opens browser, serves React SPA
- [ ] `auq --web --no-open` starts server without browser open
- [ ] `auq --web --port 4173` uses specified port
- [ ] `renderer: "web"` in config causes `auq` (no flags) to start web server
- [ ] WebSocket connection established between SPA and server
- [ ] `system:sync` sends pending sessions + config on connect
- [ ] Session bridge: new sessions appear in SPA sidebar in real-time
- [ ] Session bridge: `session:answer` and `session:reject` work end-to-end
- [ ] Config bridge: `config:get`, `config:set`, `config:reset` work
- [ ] History bridge: `history:list` returns paginated results
- [ ] All 16 themes generate valid CSS and apply correctly in browser
- [ ] Stepper view navigates questions one-at-a-time with Back/Next
- [ ] Form view shows all questions at once
- [ ] Mode toggle preserves answer state
- [ ] Waiting screen shown when no pending sessions
- [ ] Quick submit selects recommended options
- [ ] Connection banner shows on disconnect, hides on reconnect
- [ ] Diagnostics clean: no TypeScript errors across all packages
- [ ] OpenSpec tasks 1.1–1.11, 2.1–2.4, 3.1–3.5, 4.1–4.13, 5.1–5.6, 6.1–6.8, 7.1–7.4, 8.1–8.6, 9.1–9.4, 10.1–10.9 all checked
