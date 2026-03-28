# Design: Web-Based UI for AUQ

## 1. Architecture Overview

```
                        MCP Client (Claude, etc.)
                               │
                        [FastMCP stdio]
                               │
                    src/server.ts (ask_user_questions tool)
                               │
                    SessionManager (filesystem)
                         ┌─────┴─────────────┐
                         │                     │
              TUI (Ink/OpenTUI)      Web Server (Hono)
              [terminal renderer]     [localhost:{port}]
                                          │
                                     WebSocket
                                          │
                                   React 19 SPA
                                    [browser]
```

Both TUI and Web UI are **consumers** of the same SessionManager filesystem. They can coexist — first to write answers.json wins.

## 2. CLI Integration

### Flag Parsing (`bin/auq.tsx`)

Add `--web` flag detection before the default TUI launch:

```typescript
// After existing flag checks, before default TUI launch
const webFlag = args.includes('--web') || args.includes('-w');
const noOpen = args.includes('--no-open');

if (webFlag) {
  const { startWebServer } = await import('../src/web-server/index.js');
  await startWebServer({ open: !noOpen, config: mergedConfig });
  return;
}
```

Also support `renderer: "web"` in config, making `auq` (no flags) launch the web UI when configured.

### Config Schema Extension (`src/config/types.ts`)

```typescript
renderer: z.enum(["ink", "opentui", "web"]).default("opentui")
```

## 3. Web Server (`src/web-server/`)

### Directory Structure

```
src/web-server/
├── index.ts              # Entry point: startWebServer()
├── app.ts                # Hono app with routes
├── ws-handler.ts         # WebSocket message router
├── ws-protocol.ts        # Message type definitions
├── session-bridge.ts     # SessionManager ↔ WebSocket bridge
└── config-bridge.ts      # ConfigLoader ↔ WebSocket bridge
```

### Server Bootstrap (`index.ts`)

```typescript
import { serve } from '@hono/node-server';
import { getAvailablePort } from './port.js';
import open from 'open';

export async function startWebServer(opts: {
  open: boolean;
  config: AUQConfig;
}) {
  const app = createApp(opts.config);
  const port = await getAvailablePort();
  const server = serve({ fetch: app.fetch, port, hostname: '127.0.0.1' });
  const { injectWebSocket } = createWSHandler(app);
  injectWebSocket(server);

  const url = `http://localhost:${port}`;
  console.log(`AUQ Web UI running at ${url}`);

  if (opts.open) await open(url);

  // Graceful shutdown
  const shutdown = () => { server.close(); process.exit(0); };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Keep process alive
  await new Promise(() => {});
}
```

### Static File Serving (`app.ts`)

```typescript
import { serveStatic } from '@hono/node-server/serve-static';

// Serve React SPA from packages/web-ui/dist/
app.use('/*', serveStatic({
  root: resolve(__dirname, '../../packages/web-ui/dist'),
}));

// SPA fallback — all non-asset routes return index.html
app.get('*', (c) => {
  return c.html(readFileSync(resolve(__dirname, '../../packages/web-ui/dist/index.html'), 'utf-8'));
});
```

### Dependencies

| Package | Purpose | Version |
|---------|---------|---------|
| hono | HTTP framework | ^4.x |
| @hono/node-server | Node.js adapter | ^1.19.x |
| @hono/node-ws | WebSocket support | ^1.3.x |
| get-port | Available port detection | ^7.x |
| open | Cross-platform browser launch | ^10.x |

## 4. WebSocket Protocol

### Envelope Format

```typescript
interface WSMessage {
  type: string;        // "resource:action"
  payload?: unknown;   // Action-specific data
  requestId?: string;  // For request-response correlation
  timestamp: string;   // ISO 8601
}
```

### Message Types

#### Session Messages

| Type | Direction | Payload | Description |
|------|-----------|---------|-------------|
| `session:list` | client→server | `{}` | Request all pending sessions |
| `session:list:result` | server→client | `{ sessions: SessionRequest[] }` | Pending session list |
| `session:new` | server→client | `{ session: SessionRequest }` | New session detected (push) |
| `session:answer` | client→server | `{ sessionId, answers: UserAnswer[] }` | Submit answers |
| `session:answer:result` | server→client | `{ sessionId, success: boolean }` | Answer confirmation |
| `session:reject` | client→server | `{ sessionId, reason?: string }` | Reject session |
| `session:reject:result` | server→client | `{ sessionId, success: boolean }` | Rejection confirmation |
| `session:status` | server→client | `{ sessionId, status: string }` | Status change (answered elsewhere, timed out, abandoned) |
| `session:removed` | server→client | `{ sessionId }` | Session removed from filesystem |

#### History Messages

| Type | Direction | Payload | Description |
|------|-----------|---------|-------------|
| `history:list` | client→server | `{ page, pageSize, status?, search? }` | Paginated history query |
| `history:list:result` | server→client | `{ sessions, total, page, pageSize }` | Paginated results |
| `history:detail` | client→server | `{ sessionId }` | Get full session detail |
| `history:detail:result` | server→client | `{ request, answers, status }` | Full session data |

#### Config Messages

| Type | Direction | Payload | Description |
|------|-----------|---------|-------------|
| `config:get` | client→server | `{ scope: "local" \| "global" }` | Read config |
| `config:get:result` | server→client | `{ config: AUQConfig, scope }` | Config data |
| `config:set` | client→server | `{ key, value, scope }` | Set config field |
| `config:set:result` | server→client | `{ success, config }` | Updated config |
| `config:reset` | client→server | `{ key?, scope }` | Reset field or all |
| `config:reset:result` | server→client | `{ success, config }` | Reset result |
| `config:export` | client→server | `{ scope }` | Export config JSON |
| `config:export:result` | server→client | `{ json: string }` | Raw JSON string |
| `config:import` | client→server | `{ json: string, scope }` | Import config JSON |
| `config:import:result` | server→client | `{ success, errors? }` | Import result |

#### System Messages

| Type | Direction | Payload | Description |
|------|-----------|---------|-------------|
| `system:sync` | server→client | `{ sessions, config }` | Full state sync (on connect/reconnect) |
| `system:update` | server→client | `{ version, current }` | Update available |
| `system:ping` | both | `{}` | Keepalive |
| `system:pong` | both | `{}` | Keepalive response |

### Session Bridge (`session-bridge.ts`)

Reuses `EnhancedTUISessionWatcher` from `src/tui/session-watcher.ts` to detect filesystem changes and push to WebSocket clients:

```typescript
import { createTUIWatcher } from '../tui/session-watcher.js';

export function createSessionBridge(wss: WebSocketServer) {
  const watcher = createTUIWatcher();
  const sessionManager = new SessionManager(config);

  // File system → WebSocket push
  watcher.on('session-created', (sessionId, request) => {
    broadcast(wss, { type: 'session:new', payload: { session: request } });
  });

  // Periodic status check (stale, abandoned, answered elsewhere)
  setInterval(async () => {
    const sessions = await watcher.getPendingSessionsWithStatus();
    // Diff with previous state, push status changes
  }, 2000);

  return { handleMessage, cleanup };
}
```

## 5. React SPA (`packages/web-ui/`)

### Directory Structure

```
packages/web-ui/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── src/
│   ├── main.tsx               # SPA entry point (createRoot)
│   ├── App.tsx                # Root component + router
│   ├── app.css                # Global styles + Tailwind imports
│   ├── lib/
│   │   ├── atoms/
│   │   │   ├── sessions.ts        # Jotai atoms: session list, active session, answers
│   │   │   ├── config.ts          # Jotai atoms: config state, scope
│   │   │   ├── theme.ts           # Jotai atoms: current theme, system detection
│   │   │   ├── history.ts         # Jotai atoms: history list, pagination, filters
│   │   │   └── connection.ts      # Jotai atoms: WebSocket connection status
│   │   ├── ws/
│   │   │   ├── client.ts           # WebSocket client with reconnect logic
│   │   │   └── protocol.ts         # Message type definitions (mirror server)
│   │   ├── utils/
│   │   │   ├── notifications.ts    # Browser Notification API + audio
│   │   │   ├── keyboard.ts         # Global keyboard shortcut handler
│   │   │   └── favicon.ts          # Dynamic favicon badge
│   │   └── components/
│   │       ├── ui/                 # shadcn/ui components
│   │       ├── layout/
│   │       │   ├── Sidebar.tsx          # Session list sidebar
│   │       │   ├── Header.tsx           # Top bar: logo, mode toggle, theme
│   │       │   └── ConnectionBanner.tsx # Reconnecting banner
│   │       ├── questions/
│   │       │   ├── StepperView.tsx      # One-at-a-time stepper
│   │       │   ├── FormView.tsx         # All-at-once form
│   │       │   ├── QuestionCard.tsx     # Single question display
│   │       │   ├── OptionsList.tsx      # Option selection
│   │       │   ├── CustomInput.tsx      # Auto-growing textarea
│   │       │   ├── ElaborateButton.tsx
│   │       │   └── QuickSubmitButton.tsx
│   │       ├── review/
│   │       │   ├── ReviewCard.tsx       # Full-page summary card
│   │       │   └── RejectionModal.tsx   # 2-step rejection dialog
│   │       ├── config/
│   │       │   ├── ConfigEditor.tsx     # Main config page
│   │       │   ├── ConfigSection.tsx    # Grouped form section
│   │       │   ├── ConfigField.tsx      # Individual field renderer
│   │       │   └── ImportExport.tsx     # Import/export controls
│   │       ├── history/
│   │       │   ├── HistoryTable.tsx     # Sortable table with filters
│   │       │   ├── HistoryRow.tsx       # Expandable row with Q&A detail
│   │       │   └── HistoryFilters.tsx   # Status filter + search
│   │       └── waiting/
│   │           └── WaitingScreen.tsx    # No sessions state
│   ├── routes/
│   │   ├── Questions.tsx        # /#/questions (default)
│   │   ├── Config.tsx           # /#/config
│   │   └── History.tsx          # /#/history
│   └── themes/
│       └── generated.css         # Auto-generated CSS custom properties
└── dist/                         # Vite build output (committed for npm)
```

### Routing (Hash-Based)

Using `react-router` v7 with `createHashRouter`:

```tsx
// App.tsx
import { createHashRouter, RouterProvider } from 'react-router-dom';
import Questions from './routes/Questions';
import Config from './routes/Config';
import History from './routes/History';

const router = createHashRouter([
  { path: '/', element: <Questions /> },
  { path: '/config', element: <Config /> },
  { path: '/history', element: <History /> },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
```

### Jotai State Management

Using Jotai atoms for reactive state:

```typescript
// lib/atoms/sessions.ts
import { atom } from 'jotai';
import type { SessionRequest } from '@auq/shared';

export const sessionsAtom = atom<SessionRequest[]>([]);
export const activeSessionIdAtom = atom<string | null>(null);
export const viewModeAtom = atom<'stepper' | 'form'>('stepper');

export const activeSessionAtom = atom((get) => {
  const sessions = get(sessionsAtom);
  const id = get(activeSessionIdAtom);
  return sessions.find(s => s.sessionId === id) ?? null;
});

export const pendingCountAtom = atom((get) => get(sessionsAtom).length);
```

### WebSocket Client

```typescript
// lib/ws/client.ts
class WSClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private handlers = new Map<string, (payload: unknown) => void>();

  connect(url: string) {
    this.ws = new WebSocket(url);
    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      connectionStore.status = 'connected';
    };
    this.ws.onclose = () => this.reconnect();
    this.ws.onmessage = (event) => {
      const msg: WSMessage = JSON.parse(event.data);
      this.handlers.get(msg.type)?.(msg.payload);
    };
  }

  reconnect() {
    connectionStore.status = 'reconnecting';
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30000);
    setTimeout(() => {
      this.reconnectAttempts++;
      this.connect(this.url);
    }, delay);
  }

  send(type: string, payload?: unknown, requestId?: string) {
    this.ws?.send(JSON.stringify({ type, payload, requestId, timestamp: new Date().toISOString() }));
  }

  on(type: string, handler: (payload: unknown) => void) {
    this.handlers.set(type, handler);
  }
}
```

On reconnect, client sends `session:list` request; server responds with full state via `system:sync`.

### Keyboard Shortcuts

Global keyboard handler matching TUI shortcuts:

| TUI Key | Web Key | Action |
|---------|---------|--------|
| ↑/↓ | ↑/↓ | Navigate options |
| Space | Space | Toggle option (multi) / Select (single) |
| Enter | Enter | Select & advance |
| Tab/Shift+Tab | Tab/Shift+Tab | Next/prev question |
| ←/→ | ←/→ | Prev/next question (stepper mode) |
| Ctrl+R / Ctrl+Enter | Ctrl+Enter | Quick submit with recommended |
| R | R | Select recommended (current) |
| ]/[ | ]/[ | Next/prev session |
| Ctrl+T | Ctrl+T | Cycle theme |
| Esc | Esc | Reject session |
| Shift+Enter | Shift+Enter | Newline in textarea |
| E | E | Elaborate on question |

### Browser Notifications + Audio

```typescript
// lib/utils/notifications.ts
export function notifyNewSession(session: SessionRequest) {
  if (document.visibilityState === 'visible') return;
  
  if (Notification.permission === 'granted') {
    new Notification('AUQ: New Questions', {
      body: `${session.questions.length} question(s) from ${session.workingDirectory || 'unknown'}`,
      tag: session.sessionId, // dedup
    });
  }

  // Audio notification
  const audio = new Audio('/notification.mp3');
  audio.volume = 0.3;
  audio.play().catch(() => {}); // ignore autoplay restrictions
}
```

### Dynamic Tab Title + Favicon

```typescript
// lib/utils/favicon.ts
$effect(() => {
  const count = sessionStore.pendingCount;
  document.title = count > 0 ? `AUQ (${count} pending)` : 'AUQ';
  updateFaviconBadge(count);
});
```

## 6. Shared Types Package (`packages/shared/`)

### Structure

```
packages/shared/
├── package.json          # { "name": "@auq/shared", "type": "module" }
├── tsconfig.json
└── src/
    ├── index.ts
    ├── session-types.ts    # Question, UserAnswer, SessionRequest, SessionStatus, SessionAnswer
    ├── config-types.ts     # AUQConfig, AUQConfigSchema
    └── ws-protocol.ts      # WSMessage, all message type constants
```

### Migration

1. Move type definitions from `src/session/types.ts` → `packages/shared/src/session-types.ts`
2. Move config schema from `src/config/types.ts` → `packages/shared/src/config-types.ts`
3. Update all imports in `src/` to reference `@auq/shared`
4. React SPA imports from `@auq/shared` directly

## 7. Theme Generation

### Build Script

Convert TUI theme objects (`src/tui/shared/themes/`) to CSS custom properties:

```typescript
// scripts/generate-theme-css.ts
import { themes } from '../src/tui/shared/themes/index.js';

for (const [name, theme] of Object.entries(themes)) {
  output += `[data-theme="${name}"] {\n`;
  output += `  --color-bg: ${theme.colors.background};\n`;
  output += `  --color-text: ${theme.colors.text};\n`;
  output += `  --color-primary: ${theme.colors.primary};\n`;
  output += `  --color-accent: ${theme.colors.accent};\n`;
  // ... all color tokens
  output += `}\n`;
}

writeFileSync('packages/web-ui/src/themes/generated.css', output);
```

Run in build pipeline before Vite build.

### System Theme Detection

```css
@media (prefers-color-scheme: dark) {
  :root { /* map to closest dark AUQ theme */ }
}
@media (prefers-color-scheme: light) {
  :root { /* map to closest light AUQ theme */ }
}
```

## 8. Config Editor

### Grouped Form Sections

| Section | Fields |
|---------|--------|
| **Limits** | maxOptions, maxQuestions, recommendedOptions, recommendedQuestions |
| **Session** | sessionTimeout, retentionPeriod |
| **UI** | renderer, theme, language, autoSelectRecommended |
| **Notifications** | notifications.enabled, notifications.sound |
| **Stale Detection** | staleThreshold, notifyOnStale, staleAction |
| **Updates** | updateCheck |

### Features

- **Local vs Global toggle**: Switch button at top. Shows which file is being edited.
- **Reset to defaults**: Per-field reset icon + "Reset All" button
- **Validation**: Zod schema validation on every field change. Error messages inline.
- **Import/export**: Export button downloads .auqrc.json. Import accepts file upload or paste.

## 9. Session History

### Table Columns

| Column | Sortable | Description |
|--------|----------|-------------|
| Date | ✓ | Session creation timestamp |
| Status | ✓ | completed / rejected / timed_out / abandoned |
| Questions | ✓ | Number of questions |
| Working Dir | ✓ | Source project directory |

### Filtering

- **Status filter**: Dropdown (All, Completed, Rejected, Timed Out, Abandoned)
- **Text search**: Searches question prompts and option labels
- **Pagination**: 20 items per page, prev/next buttons

### Expandable Row Detail

Shows full Q&A for each question: prompt, selected answer(s), custom text, elaborate requests.

## 10. Build Integration

### Package.json Updates

```json
{
  "workspaces": ["packages/*"],
  "scripts": {
    "build": "bun run build:shared && bun run build:web-ui && bun run sync-plugin-schemas && bun run generate:skill && tsc && tsc -p tsconfig.opentui.json",
    "build:shared": "cd packages/shared && tsc",
    "build:web-ui": "bun run generate:themes && cd packages/web-ui && vite build",
    "generate:themes": "bun scripts/generate-theme-css.ts"
  }
}
```

### npm Package Files

Add to `files` array:
- `packages/web-ui/dist/`
- `packages/shared/dist/`

### Size Budget

Target: <1MB gzipped total for web UI assets. React 19 + shadcn/ui + Jotai + Tailwind should produce ~200-400KB gzipped.

## 11. Concurrent Access (TUI + Web UI Coexistence)

Both UIs watch the same session directory. Race condition handling:

1. **First writer wins**: Both use `atomicWriteFile` with lock. First to acquire lock writes answers.json.
2. **Status broadcast**: Web server polls every 2s. If a session is completed by TUI, Web UI receives `session:status` with `completed` and removes it from the queue.
3. **Optimistic UI**: Web UI applies answer immediately, then waits for `session:answer:result` confirmation. If lock fails (TUI answered first), rollback and show toast: "Session was answered in another client."

## 12. Security

- **Bind to 127.0.0.1 only** — never 0.0.0.0
- **Origin header validation** — reject WebSocket upgrades from non-localhost origins
- **No authentication** — same trust model as terminal (local user only)
- **Message size limit** — 1MB per WebSocket message
- **Rate limiting** — 100 messages/second per connection