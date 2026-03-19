---
created: 2026-03-17T00:00:00Z
last_updated: 2026-03-17T17:00:00Z
type: nonspec
plan_number: 1
status: done
trigger: "Add web API transport to MCP server — when AUQ_API_KEY + AUQ_API_URL are set, send questions to web API instead of local files"
depends_on: none
next: TBD
---

# Plan: Web API Transport Integration

## Background & Research

### Current Architecture

The MCP server uses a **file-based session system**: creates JSON files, waits for answers via polling `answers.json`.

**Core factory** (`src/core/ask-user-questions.ts` lines 43-171):

```typescript
export const createAskUserQuestionsCore = (
  options: AskUserQuestionsCoreOptions = {},
): AskUserQuestionsCore => {
  const baseDir = options.baseDir ?? getSessionDirectory();
  const sessionManager =
    options.sessionManager ?? new SessionManager({ baseDir });
  let initialized = false;

  const ask = async (questions, callId?, workingDirectory?, signal?) => {
    await ensureInitialized();
    const parsedQuestions = QuestionsSchema.parse(questions);
    return sessionManager.startSession(
      normalizeQuestions(parsedQuestions),
      callId,
      workingDirectory,
      signal,
    );
  };
  // ... askNonBlocking, getAnsweredQuestions similarly delegate to sessionManager
};
```

**Key insight**: `ask()` and `askNonBlocking()` both delegate entirely to `SessionManager`. The cleanest approach is to create a **`WebTransport`** that implements the same interface pattern as `SessionManager.startSession()` / `SessionManager.createSession()` / `SessionManager.waitForAnswers()`, then switch transport in the core factory based on config.

### Config System (`src/config/types.ts`):

```typescript
export const AUQConfigSchema = z.object({
  maxOptions: z.number().min(2).max(10).default(5),
  maxQuestions: z.number().min(1).max(10).default(5),
  sessionTimeout: z.number().min(0).default(0),
  // ... UI, stale, notification settings
  updateCheck: z.boolean().default(true),
});
```

Config loaded from `.auqrc.json` (local) and `~/.config/auq/.auqrc.json` (global). No `apiKey`/`apiUrl` fields yet.

### Config defaults (`src/config/defaults.ts`):

```typescript
export const DEFAULT_CONFIG: AUQConfig = {
  maxOptions: 5,
  maxQuestions: 5,
  sessionTimeout: 0,
  language: "auto",
  theme: "system",
  renderer: "opentui",
  // ...
};
```

### Web API Endpoints (from `web/src/server/routes/questions.ts`):

**POST /api/v1/questions** — Create question

- Headers: `Authorization: Bearer <rawKey>`
- Body: `{ title?, questionsJson: [{ id, title?, prompt, type: "singleSelect"|"multiSelect"|"freeText", options?: [{id, label, description?}] }], timeoutMs? }`
- Response 201: `{ id, status: "pending", title, createdAt, updatedAt }`

**GET /api/v1/questions/:id** — Get question + answers

- Headers: `Authorization: Bearer <rawKey>`
- Response 200: `{ id, status, title, questions: [...], answers: [{ id, questionId, questionIndex, selectedOption?, selectedOptionsJson?, customText?, rejected, rejectionReason?, answeredAt }], createdAt, updatedAt }`

**DELETE /api/v1/questions/:id** — Mark abandoned

- Headers: `Authorization: Bearer <rawKey>`
- Response 204

### Question Format Mapping (MCP → Web API)

MCP `Question`:

```typescript
{ prompt: string, title: string, options: [{label, description?}], multiSelect?: boolean }
```

Web `questionsJson` item:

```typescript
{ id: string, title?: string, prompt: string, type: "singleSelect"|"multiSelect"|"freeText", options?: [{id, label, description?}] }
```

Mapping:

- `question.multiSelect === true` → `type: "multiSelect"`
- `question.multiSelect !== true` → `type: "singleSelect"`
- `question.options[i]` → `{ id: String(i), label: option.label, description: option.description }`
- `question.title` → `title`
- `question.prompt` → `prompt`
- Generate question-level `id` as `"q" + index`

### Answer Format Mapping (Web API → MCP)

Web answer:

```typescript
{ questionIndex, selectedOption?, selectedOptionsJson?, customText?, rejected, rejectionReason?, answeredAt }
```

MCP `UserAnswer`:

```typescript
{ questionIndex, selectedOption?, selectedOptions?, customText?, timestamp }
```

Mapping:

- `selectedOption` → `selectedOption` (direct)
- `selectedOptionsJson` → parse JSON → `selectedOptions`
- `customText` → `customText`
- `answeredAt` → `timestamp`
- `rejected === true` → throw `SESSION_REJECTED` (same as file-based)

### CLI Help Text (`bin/auq.tsx` lines 121-125):

```
ENVIRONMENT VARIABLES
  AUQ_RENDERER         Override renderer ("ink" or "opentui")
  AUQ_SESSION_DIR      Custom session storage directory
  XDG_CONFIG_HOME      Custom config directory (default: ~/.config)
  NO_UPDATE_NOTIFIER   Set to "1" to disable update checks
```

### SessionManager.startSession signature (`src/session/SessionManager.ts` lines 395-403):

```typescript
async startSession(
  questions: Question[],
  callId?: string,
  workingDirectory?: string,
  signal?: AbortSignal,
): Promise<{ formattedResponse: string; sessionId: string }>
```

### ResponseFormatter.formatUserResponse (`src/session/ResponseFormatter.ts`):

Used by both `startSession` and `getAnsweredQuestions` to format answers into human-readable text. The WebTransport needs to produce the same `{ formattedResponse, sessionId }` return type so the MCP tool response is identical regardless of transport.

## Testing Plan (TDD - tests first)

> Note: This project uses `vitest`. Existing test patterns should be followed.

- [ ] Create `src/transport/__tests__/web-transport.test.ts` with tests:
  - [ ] Test `mapQuestionsToWeb()` correctly converts MCP Question[] to web questionsJson format
  - [ ] Test `mapWebAnswersToMcp()` correctly converts web answer objects to MCP UserAnswer[]
  - [ ] Test `mapWebAnswersToMcp()` handles rejected questions (throws SESSION_REJECTED)
  - [ ] Test `mapWebAnswersToMcp()` parses selectedOptionsJson string into selectedOptions array
  - [ ] Test `WebTransport.startSession()` calls POST /api/v1/questions, polls GET, formats response
  - [ ] Test `WebTransport.startSession()` handles abort signal
  - [ ] Test `isWebMode()` returns true when both apiKey + apiUrl are set, false otherwise
  - [ ] Test env vars `AUQ_API_KEY` / `AUQ_API_URL` override config values

## Implementation Plan

### Batch 1 (parallel — no file overlap)

**Coder A: Config schema + env var resolution**

- [ ] Add `apiKey` (z.string().optional()) and `apiUrl` (z.string().url().optional()) to `AUQConfigSchema` in `src/config/types.ts`
- [ ] Add `apiKey: undefined` and `apiUrl: undefined` to `DEFAULT_CONFIG` in `src/config/defaults.ts`
- [ ] Create `src/config/resolve-web-config.ts`:
  ```typescript
  export function resolveWebConfig(): { apiKey?: string; apiUrl?: string } {
    const config = getConfig();
    return {
      apiKey: process.env.AUQ_API_KEY || config.apiKey,
      apiUrl: process.env.AUQ_API_URL || config.apiUrl,
    };
  }
  export function isWebMode(): boolean {
    const { apiKey, apiUrl } = resolveWebConfig();
    return Boolean(apiKey && apiUrl);
  }
  ```
- [ ] Update `src/config/index.ts` to re-export `resolveWebConfig` and `isWebMode`

**Coder B: WebTransport implementation**

- [ ] Create `src/transport/web-transport.ts` with:
  - [ ] `mapQuestionsToWeb(questions: Question[]): WebQuestionItem[]` — converts MCP questions to web format
  - [ ] `mapWebAnswersToMcp(webAnswers: WebAnswer[], questions: Question[]): UserAnswer[]` — converts web answers back
  - [ ] `class WebTransport`:
    - Constructor takes `{ apiKey: string; apiUrl: string }`
    - `async startSession(questions, callId?, workingDirectory?, signal?): Promise<{ formattedResponse: string; sessionId: string }>`:
      1. Call `mapQuestionsToWeb(questions)`
      2. POST to `${apiUrl}/api/v1/questions` with Bearer auth
      3. Get back `{ id }` as the web question ID (this is the "sessionId" equivalent)
      4. Poll `GET ${apiUrl}/api/v1/questions/${id}` every 2 seconds
      5. When `status !== "pending"`, check if rejected → throw SESSION_REJECTED
      6. If completed, `mapWebAnswersToMcp()` → `ResponseFormatter.formatUserResponse()`
      7. Return `{ formattedResponse, sessionId: webQuestionId }`
    - `async createSession(questions, workingDirectory?): Promise<string>` — POST only, return question ID
    - `async getAnsweredQuestions(sessionId, blocking?, signal?)` — GET + optional poll, format response
    - `async markAbandoned(sessionId)` — DELETE /api/v1/questions/:id
  - [ ] Handle HTTP errors gracefully (network failures, 401, 404, 500) with clear error messages
  - [ ] Support AbortSignal for cancellation during polling

**Coder C: Help text + CLI env vars**

- [ ] Update help text in `bin/auq.tsx` (lines 121-125) to add:
  ```
  AUQ_API_KEY          API key for AUQ web platform (enables web mode)
  AUQ_API_URL          AUQ web platform URL (e.g., https://auq.example.com)
  ```
- [ ] Update CONFIG KEYS section (lines 111-119) to add:
  ```
  apiKey          string                     API key for web platform
  apiUrl          string                     Web platform URL
  ```
- [ ] Add WEB MODE section to help text after EXAMPLES:
  ```
  WEB MODE
    When AUQ_API_KEY and AUQ_API_URL are set (via env vars or config),
    questions are sent to the AUQ web platform instead of the local TUI.

    One-time:  AUQ_API_KEY=auq_xxx AUQ_API_URL=http://localhost:5173 auq ask '...'
    Persist:   auq config set apiKey auq_xxx --global
               auq config set apiUrl http://localhost:5173 --global
  ```

### Batch 2 (sequential — depends on Batch 1)

**Coder D: Wire WebTransport into core factory**

- [ ] Modify `src/core/ask-user-questions.ts`:
  - Import `resolveWebConfig`, `isWebMode` from config
  - Import `WebTransport` from transport
  - In `createAskUserQuestionsCore`:
    - At top of factory, check `isWebMode()`
    - If web mode, create `WebTransport` instance with resolved config
    - In `ask()`: if web mode → `webTransport.startSession(normalizeQuestions(parsedQuestions), callId, workingDirectory, signal)`
    - In `askNonBlocking()`: if web mode → `webTransport.createSession(normalizeQuestions(parsedQuestions), workingDirectory)` and return `{ sessionId, questionCount }`
    - In `getAnsweredQuestions()`: if web mode → `webTransport.getAnsweredQuestions(sessionId, blocking, signal)`
    - In `markAbandoned()`: if web mode → `webTransport.markAbandoned(sessionId)`
  - File-based path remains completely untouched for non-web mode
- [ ] Create `src/transport/index.ts` barrel export

### Batch 3 (verification)

- [ ] Run `npm run typecheck:all` (or `npx tsc --noEmit`) — zero errors
- [ ] Run `vitest run` — all tests pass
- [ ] Manual smoke test: start web dev server, create workspace + API key, then:
  ```bash
  AUQ_API_KEY=auq_xxx AUQ_API_URL=http://localhost:5173 npx auq ask '{"questions":[{"prompt":"Test?","title":"Test","options":[{"label":"Yes"},{"label":"No"}]}]}'
  ```
  Verify question appears in web inbox, answer it, verify CLI receives formatted response.

## Parallelization Plan

### Batch 1 (parallel)

- [ ] Coder A: Config schema + env var resolution → files: `src/config/types.ts`, `src/config/defaults.ts`, `src/config/resolve-web-config.ts`, `src/config/index.ts`
- [ ] Coder B: WebTransport class → files: `src/transport/web-transport.ts`, `src/transport/__tests__/web-transport.test.ts`
- [ ] Coder C: CLI help text update → files: `bin/auq.tsx`

### Batch 2 (after Batch 1)

- [ ] Coder D: Wire transport into core → files: `src/core/ask-user-questions.ts`, `src/transport/index.ts`

### Batch 3 (after Batch 2)

- [ ] Verification: typecheck + tests + manual smoke test

### Dependencies

- Coder D needs Coder A's config exports and Coder B's WebTransport class
- Coders A, B, C have no file overlap → fully parallel
- Verification needs all code in place

### Risk Areas

- **Question format mapping**: MCP Question lacks `id` field, web requires it → generate as `"q" + index`
- **Answer format**: web stores `selectedOptionsJson` as string, MCP uses `selectedOptions` array → parse JSON
- **Polling interval**: 2s is reasonable for web, but configurable would be nice
- **Network errors**: fetch can fail silently — need explicit timeout + retry logic
- **ResponseFormatter import**: WebTransport needs to import from `../session/ResponseFormatter` — verify this works with the existing module structure
- **`rejected` status**: Web uses "rejected", MCP uses "rejected" — same string, but web answer has `rejected: boolean` field on individual answers, not session-level

## Done Criteria

- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `vitest run` passes (including new web-transport tests)
- [ ] `auq --help` shows WEB MODE section, AUQ_API_KEY/AUQ_API_URL env vars, apiKey/apiUrl config keys
- [ ] `auq config set apiKey auq_xxx --global` works
- [ ] `auq config set apiUrl http://localhost:5173 --global` works
- [ ] With env vars set, `auq ask '...'` sends POST to web API (verified with running web dev server)
- [ ] Without env vars, existing file-based TUI still works (backward compatible)
- [ ] Abort signal properly cancels polling and sends DELETE to abandon question
