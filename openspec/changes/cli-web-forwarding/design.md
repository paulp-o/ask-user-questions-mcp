# CLI Web Forwarding - Design Document

## Architecture Overview

### Current (AS-IS) - v4.x without Web Forwarding

```
┌────────────────────────────────────────────────────────────────────┐
│                  auq ask (CLI command)                             │
│                                                                     │
│   Question JSON → stdin → SessionManager → FileStore               │
│                             ↓                                      │
│                         Local TUI                                  │
│                         Watches filesystem                         │
│                         User answers in terminal                   │
│                         ↓                                          │
│                     Response → stdout                              │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│              STDIO MCP Server (separate process)                    │
│                                                                     │
│   ask_user_questions tool → SessionManager → FileStore             │
│                             ↓                                      │
│                         Local TUI (same)                           │
│                         ↓                                          │
│                    Returns answer to MCP client                    │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│              Web Server (separate process)                          │
│                                                                     │
│   HTTP MCP → SQLiteStore (independent DB)                          │
│              ↓                                                     │
│           Web Dashboard (browser)                                  │
│           User answers in browser                                  │
└────────────────────────────────────────────────────────────────────┘

PROBLEM: Three separate question flows, no cross-communication
```

### Target (TO-BE) - v4.x with Web Forwarding

```
┌──────────────────────────────────────────────────────────────────────┐
│  Config: web.apiKey = "sk-xxx", web.endpoint = "http://..."         │
└──────────────────────────────────────────────────────────────────────┘
                              ↓
                    (ConfigLoader reads)
                              ↓

┌──────────────────────────────────────────────────────────────────────┐
│                  auq ask (CLI command)                               │
│                                                                      │
│   Question JSON → [Check web.apiKey configured?]                    │
│                       ├─ YES → WebForwardingClient                  │
│                       │         POST /api/sessions                  │
│                       │         Poll GET /api/sessions/[id]         │
│                       │         (with Bearer token)                 │
│                       │         ↓                                   │
│                       │    Returns to web dashboard                 │
│                       │    ↓                                        │
│                       └─→ User answers in browser                   │
│                           ↓                                         │
│                           Response returned to CLI                  │
│                           ↓                                         │
│                       Response → stdout                             │
│                                                                      │
│                       ├─ NO → SessionManager → FileStore (local)   │
│                              Local TUI                              │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│              STDIO MCP Server (separate process)                      │
│                                                                       │
│   [Check web.apiKey configured?]                                     │
│       ├─ YES → ask_user_questions → WebForwardingClient              │
│       │         POST /api/sessions (with Bearer token)               │
│       │         Poll for answers                                     │
│       │         ↓                                                    │
│       │    Forward question to web dashboard                         │
│       │    ↓                                                         │
│       │    User answers in browser                                   │
│       │    ↓                                                         │
│       │    Return to MCP client                                      │
│       │                                                              │
│       ├─ NO → SessionManager → FileStore (local)                    │
│              Local TUI                                               │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│              Web Server (separate process)                            │
│                                                                       │
│   POST /api/sessions (with auth)                                     │
│       ↓                                                              │
│   Create session in SQLiteStore                                      │
│       ↓                                                              │
│   Emit SSE notification                                              │
│       ↓                                                              │
│   Web Dashboard shows new question                                   │
│       ↓                                                              │
│   User answers in browser                                            │
│       ↓                                                              │
│   POST /api/sessions/[id]/answer                                     │
│       ↓                                                              │
│   Update session status → "completed"                                │
│       ↓                                                              │
│   CLI/MCP polling detects status change                              │
│   Returns answer to caller                                           │
└──────────────────────────────────────────────────────────────────────┘

BENEFIT: Single web server for all questions (CLI + MCP); single source of truth
```

---

## Config Schema Extension

### New Fields in AUQConfig

```typescript
// packages/core/src/config/types.ts

interface AUQConfig {
  // ... existing fields ...

  web?: {
    /**
     * API endpoint for web server.
     * Default: process.env.AUQ_DEFAULT_ENDPOINT if not set
     * Example: "http://localhost:3000" or "https://auq.example.com"
     */
    endpoint?: string;

    /**
     * Bearer token for authenticating to web server.
     * Sent as: Authorization: Bearer <apiKey>
     * No default; if not set, web forwarding disabled.
     * Can be generated in web dashboard (future feature)
     */
    apiKey?: string;

    /**
     * Mode for question routing.
     * - "auto" (default): use web if apiKey/endpoint configured, else local
     * - "web": always use web, fail if not configured
     * - "local": always use local FileStore, ignore web config
     */
    mode?: "auto" | "web" | "local";

    /**
     * Timeout in milliseconds for polling answers from web server.
     * Default: 300000 (5 minutes)
     * CLI will poll GET /api/sessions/[id] every 2–3 seconds up to this timeout.
     */
    timeout?: number;
  };
}
```

### Default Values

```typescript
// packages/core/src/config/defaults.ts

export const DEFAULT_CONFIG: AUQConfig = {
  // ... existing ...
  web: {
    mode: "auto",
    timeout: 300_000, // 5 minutes
    // endpoint and apiKey are optional, no defaults
  },
};
```

### ConfigLoader Updates

```typescript
// packages/core/src/config/ConfigLoader.ts

class ConfigLoader {
  // ... existing methods ...

  /**
   * Validates web config (if present).
   * Throws ConfigValidationError if invalid.
   */
  private validateWebConfig(web?: AUQConfig["web"]): void {
    if (!web) return;

    if (web.endpoint && typeof web.endpoint !== "string") {
      throw new ConfigValidationError("web.endpoint must be a string");
    }

    if (web.apiKey && typeof web.apiKey !== "string") {
      throw new ConfigValidationError("web.apiKey must be a string");
    }

    if (web.mode && !["auto", "web", "local"].includes(web.mode)) {
      throw new ConfigValidationError(
        'web.mode must be "auto", "web", or "local"',
      );
    }

    if (web.timeout && (typeof web.timeout !== "number" || web.timeout <= 0)) {
      throw new ConfigValidationError("web.timeout must be a positive number");
    }
  }

  /**
   * Returns effective endpoint: explicit endpoint > env var > undefined
   */
  getWebEndpoint(): string | undefined {
    if (this.config.web?.endpoint) {
      return this.config.web.endpoint;
    }
    return process.env.AUQ_DEFAULT_ENDPOINT;
  }

  /**
   * Returns effective API key (if configured)
   */
  getWebApiKey(): string | undefined {
    return this.config.web?.apiKey;
  }

  /**
   * Returns effective mode (default: "auto")
   */
  getWebMode(): "auto" | "web" | "local" {
    return this.config.web?.mode ?? "auto";
  }

  /**
   * Returns timeout in ms (default: 5 min)
   */
  getWebTimeout(): number {
    return this.config.web?.timeout ?? 300_000;
  }

  /**
   * Determines if web forwarding is enabled
   * Returns true if apiKey is configured and mode is "web" or ("auto" with endpoint/apiKey)
   */
  isWebForwardingEnabled(): boolean {
    const mode = this.getWebMode();
    const apiKey = this.getWebApiKey();

    if (mode === "local") return false;
    if (mode === "web") return !!apiKey;
    // mode === "auto"
    return !!(
      apiKey &&
      (this.getWebEndpoint() || process.env.AUQ_DEFAULT_ENDPOINT)
    );
  }
}
```

---

## WebForwardingClient Class

### Interface Definition

```typescript
// packages/core/src/web/WebForwardingClient.ts

/**
 * HTTP client for forwarding questions to remote web server.
 * Handles session creation, polling for answers, and error handling.
 */
export class WebForwardingClient {
  constructor(
    private endpoint: string,
    private apiKey: string,
    private timeout: number = 300_000, // 5 minutes
  ) {
    // Validate endpoint is a valid URL
    try {
      new URL(endpoint);
    } catch {
      throw new Error(`Invalid web endpoint URL: ${endpoint}`);
    }

    if (!apiKey) {
      throw new Error("apiKey is required for WebForwardingClient");
    }
  }

  /**
   * Creates a session on the remote web server.
   *
   * @param questions Array of Question objects (same format as local sessions)
   * @returns Session ID assigned by web server
   * @throws WebForwardingError if request fails (network, auth, validation)
   */
  async createSession(questions: Question[]): Promise<string> {
    // Implementation details below
  }

  /**
   * Polls the web server for session answers.
   * Keeps polling until timeout or session completed.
   *
   * @param sessionId ID returned from createSession
   * @returns Answers object with responses
   * @throws WebForwardingError if timeout or rejected
   */
  async pollForAnswers(
    sessionId: string,
    options?: {
      pollInterval?: number; // Default 2000ms
      abortSignal?: AbortSignal;
    },
  ): Promise<Answers> {
    // Implementation details below
  }

  /**
   * Complete flow: create session, poll for answers, return result.
   * Combines createSession + pollForAnswers with error handling.
   */
  async askQuestionsAndWait(
    questions: Question[],
    options?: { abortSignal?: AbortSignal },
  ): Promise<Answers> {
    // Implementation details below
  }
}
```

### Implementation Details

#### createSession

```typescript
async createSession(questions: Question[]): Promise<string> {
  const url = new URL("/api/sessions", this.endpoint);

  try {
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ questions }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new WebForwardingError("Unauthorized: Invalid API key");
      }
      const text = await response.text();
      throw new WebForwardingError(
        `Failed to create session: ${response.status} ${text}`
      );
    }

    const data = await response.json() as { sessionId: string };
    if (!data.sessionId) {
      throw new WebForwardingError("Server returned no sessionId");
    }

    return data.sessionId;
  } catch (error) {
    if (error instanceof WebForwardingError) throw error;
    throw new WebForwardingError(
      `Network error creating session: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
```

#### pollForAnswers

```typescript
async pollForAnswers(
  sessionId: string,
  options?: { pollInterval?: number; abortSignal?: AbortSignal }
): Promise<Answers> {
  const pollInterval = options?.pollInterval ?? 2000;
  const startTime = Date.now();

  while (true) {
    // Check timeout
    if (Date.now() - startTime > this.timeout) {
      throw new WebForwardingError(
        `Timeout waiting for answers (${this.timeout}ms exceeded)`
      );
    }

    // Check abort signal
    if (options?.abortSignal?.aborted) {
      throw new Error("Polling cancelled");
    }

    try {
      const url = new URL(`/api/sessions/${sessionId}`, this.endpoint);
      const response = await fetch(url.toString(), {
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
        },
        signal: options?.abortSignal,
      });

      if (response.status === 404) {
        throw new WebForwardingError(`Session not found: ${sessionId}`);
      }

      if (!response.ok) {
        throw new WebForwardingError(
          `Failed to fetch session: ${response.status}`
        );
      }

      const session = await response.json() as Session;

      // Check session status
      if (session.status === "completed") {
        return session.answers!;
      }

      if (session.status === "rejected") {
        throw new WebForwardingError(
          `Question rejected: ${session.rejectionReason}`
        );
      }

      // Still pending; wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));

    } catch (error) {
      if (error instanceof WebForwardingError) throw error;
      // Network error; retry
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  }
}
```

#### askQuestionsAndWait

```typescript
async askQuestionsAndWait(
  questions: Question[],
  options?: { abortSignal?: AbortSignal }
): Promise<Answers> {
  const sessionId = await this.createSession(questions);
  return this.pollForAnswers(sessionId, { abortSignal: options?.abortSignal });
}
```

### Error Handling

```typescript
// packages/core/src/web/errors.ts

/**
 * Errors specific to web forwarding operations.
 */
export class WebForwardingError extends Error {
  name = "WebForwardingError";

  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    Object.setPrototypeOf(this, WebForwardingError.prototype);
  }

  /**
   * Returns user-friendly error message.
   */
  getUserMessage(): string {
    if (this.statusCode === 401) {
      return "Web server rejected authentication. Check your API key.";
    }
    if (this.statusCode === 404) {
      return "Session not found on web server.";
    }
    if (this.message.includes("Timeout")) {
      return "Answer not received within timeout. Try again.";
    }
    if (this.message.includes("Network")) {
      return "Could not reach web server. Check endpoint and network.";
    }
    return this.message;
  }
}
```

---

## CLI Integration Changes

### auq ask Command Flow

```typescript
// packages/cli/bin/auq.tsx (ask command)

async function handleAskCommand(
  questionsJson: string,
  args: {
    local?: boolean;
    web?: string;
  },
): Promise<void> {
  const config = await configLoader.load();
  const questions = JSON.parse(questionsJson);

  // Determine execution mode
  let useWeb = false;
  let endpoint = args.web; // Explicit --web flag
  let apiKey = config.getWebApiKey();

  if (args.local) {
    // Force local mode
    useWeb = false;
  } else if (args.web) {
    // Explicit --web flag overrides config
    useWeb = true;
  } else if (config.getWebMode() === "local") {
    // Config says local
    useWeb = false;
  } else if (config.getWebMode() === "web") {
    // Config says web; must be configured
    if (!apiKey) {
      throw new Error("web.mode is 'web' but no web.apiKey configured");
    }
    endpoint = config.getWebEndpoint();
    useWeb = true;
  } else {
    // Config says "auto" (default)
    if (apiKey && config.getWebEndpoint()) {
      endpoint = config.getWebEndpoint();
      useWeb = true;
    }
  }

  // Execute
  if (useWeb) {
    const client = new WebForwardingClient(
      endpoint!,
      apiKey!,
      config.getWebTimeout(),
    );
    try {
      const answers = await client.askQuestionsAndWait(questions);
      console.log(JSON.stringify(answers));
    } catch (error) {
      if (error instanceof WebForwardingError) {
        console.error(error.getUserMessage());
        process.exit(1);
      }
      throw error;
    }
  } else {
    // Local TUI mode (existing logic)
    const sessionId = await sessionManager.create(questions);
    const answers = await sessionManager.waitForAnswers(sessionId);
    console.log(JSON.stringify(answers));
  }
}
```

---

## MCP Server Integration Changes

### ask_user_questions Tool

```typescript
// packages/cli/src/server.ts (ask_user_questions tool)

async function askUserQuestions(
  questions: Question[],
): Promise<{ sessionId: string; answers: Answers }> {
  const config = await configLoader.load();

  // Check if web forwarding enabled (same logic as CLI)
  if (config.isWebForwardingEnabled()) {
    const client = new WebForwardingClient(
      config.getWebEndpoint()!,
      config.getWebApiKey()!,
      config.getWebTimeout(),
    );

    try {
      const answers = await client.askQuestionsAndWait(questions);
      // Web server generates its own sessionId; we return it for reference
      // (MCP client doesn't see this; answers are returned directly)
      return {
        sessionId: "web-forwarded",
        answers,
      };
    } catch (error) {
      if (error instanceof WebForwardingError) {
        throw new MCPError(error.getUserMessage());
      }
      throw error;
    }
  } else {
    // Local TUI mode (existing logic)
    const sessionId = await sessionManager.create(questions);
    const answers = await sessionManager.waitForAnswers(sessionId);
    return { sessionId, answers };
  }
}
```

---

## Web Server API Changes

### POST /api/sessions Endpoint

```typescript
// packages/web/src/app/api/sessions/route.ts

interface CreateSessionRequest {
  questions: Question[];
}

interface CreateSessionResponse {
  sessionId: string;
}

export async function POST(request: Request): Promise<Response> {
  // Auth middleware (see below) validates Bearer token

  try {
    const body = (await request.json()) as CreateSessionRequest;

    // Validate questions
    if (!Array.isArray(body.questions) || body.questions.length === 0) {
      return Response.json(
        { error: "questions must be non-empty array" },
        { status: 400 },
      );
    }

    // Create session in SQLiteStore
    const sessionId = await sessionManager.create({
      questions: body.questions,
      createdAt: new Date(),
      status: "pending",
    });

    // Emit SSE notification for real-time dashboard update
    sseEmitter.notifyNewSession(sessionId);

    return Response.json({ sessionId }, { status: 201 });
  } catch (error) {
    console.error("Failed to create session:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

### Auth Middleware

```typescript
// packages/web/src/middleware.ts

export async function middleware(
  request: Request,
): Promise<Response | undefined> {
  // Only apply to /api routes
  if (!request.nextUrl.pathname.startsWith("/api/")) {
    return undefined;
  }

  // Extract Bearer token
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return Response.json(
      { error: "Unauthorized: Missing or invalid Authorization header" },
      { status: 401 },
    );
  }

  const token = authHeader.slice(7); // Remove "Bearer "
  const expectedToken = process.env.AUQ_API_KEY;

  if (!expectedToken) {
    console.warn("AUQ_API_KEY not set; all API requests will be rejected");
    return Response.json(
      { error: "Server not configured for API access" },
      { status: 403 },
    );
  }

  if (token !== expectedToken) {
    return Response.json(
      { error: "Unauthorized: Invalid API key" },
      { status: 401 },
    );
  }

  // Token is valid; continue to handler
  return undefined;
}
```

---

## Error Handling & Edge Cases

### Network Errors

| Scenario              | Handler                                                            |
| --------------------- | ------------------------------------------------------------------ |
| Endpoint unreachable  | WebForwardingClient catches fetch error, throws WebForwardingError |
| Timeout during create | fetch timeout after 10s, throw NetworkError                        |
| Timeout during poll   | After 5 min of polling, throw WebForwardingError("Timeout...")     |
| 401 Unauthorized      | Auth middleware or client validation, clear error message          |
| 404 Not Found         | Session expired on server; throw WebForwardingError                |
| 500 Server Error      | Retry polling (transient), eventually timeout                      |

### Config Errors

| Scenario                       | Handler                                                      |
| ------------------------------ | ------------------------------------------------------------ |
| Invalid endpoint URL           | ConfigLoader or WebForwardingClient constructor throws Error |
| Missing apiKey with mode "web" | CLI throws error at startup; user must configure             |
| Invalid timeout                | ConfigLoader validation error                                |
| Malformed config file          | ConfigLoader reads defaults; uses fallback values            |

### Polling Edge Cases

| Scenario                      | Handler                                                             |
| ----------------------------- | ------------------------------------------------------------------- |
| Session expires while polling | GET returns 404; throw WebForwardingError("Session not found")      |
| User rejects question         | GET returns status="rejected"; throw WebForwardingError with reason |
| Network flakes during polling | Catch fetch error, retry next interval; eventually timeout          |
| AbortSignal fires             | Catch AbortError, throw; allows cancellation                        |

---

## Data Flow Diagrams

### CLI Web Forwarding Flow

```
auq ask '{"questions": [...]}'
       ↓
ConfigLoader.isWebForwardingEnabled() → true
       ↓
WebForwardingClient.createSession(questions)
  ↓
  POST /api/sessions with Bearer token
  ↓
  Web server creates session
  ↓
  Returns { sessionId: "sess-123" }
       ↓
WebForwardingClient.pollForAnswers("sess-123")
  ↓
  Loop: GET /api/sessions/sess-123 every 2s
    ↓
    Response: { status: "pending" }
    → wait 2s, retry
    ↓
    (user answers via web dashboard)
    ↓
    Response: { status: "completed", answers: {...} }
    → return answers
       ↓
CLI outputs JSON response
Exit
```

### MCP Server Web Forwarding Flow

```
MCP Client calls ask_user_questions tool
       ↓
MCP Server: ask_user_questions handler
       ↓
ConfigLoader.isWebForwardingEnabled() → true
       ↓
WebForwardingClient.askQuestionsAndWait(questions)
  ↓
  (same as CLI flow above)
  ↓
  Returns answers
       ↓
MCP Server returns answers to client
```

### Web Dashboard SSE Flow

```
POST /api/sessions
       ↓
sseEmitter.notifyNewSession(sessionId)
       ↓
All /api/sse connections receive message:
  { type: "session-created", sessionId: "..." }
       ↓
Browser dashboard listens to SSE
       ↓
New question appears in session list
       ↓
User clicks to answer
       ↓
POST /api/sessions/[id]/answer with response
       ↓
SessionManager updates status → "completed"
       ↓
Polling CLI detects status change
       ↓
CLI returns answer to caller
```

---

## Security Considerations

### Bearer Token

- **Storage**: Config file (plaintext) — users should restrict file permissions
- **Transmission**: HTTP or HTTPS (user responsible for HTTPS in production)
- **Validation**: Web server compares against `AUQ_API_KEY` env var (string equality)
- **Future**: Could add token rotation, scoped tokens, etc. in v2

### Session Data

- **Questions & answers** transmitted in request body (no encryption in v1)
- **Access control**: Bearer token only; no per-user isolation (v1)
- **Cleanup**: Web dashboard can delete sessions; no automatic expiration (v1)

### Web Server

- **No TLS termination** — assumes reverse proxy (nginx, etc.) for HTTPS
- **No CORS** — intended for internal API access only
- **No rate limiting** — assumes private network (v1)

---

## Backward Compatibility

- **Existing CLI** unaffected if web config not set
- **Existing STDIO server** unaffected if web config not set
- **Config file** gains optional `web.*` fields (no breaking changes)
- **API contracts** (CLI output, MCP response format) unchanged
