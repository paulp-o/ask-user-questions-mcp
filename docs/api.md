# API Documentation

The `auq-mcp-server` web server exposes three APIs: **HTTP MCP transport**, **REST API**, and **Server-Sent Events (SSE)**.

## HTTP MCP Endpoint

### `POST /api/mcp`

**Streamable HTTP transport** for MCP clients (Claude, other tools, etc.).

This endpoint implements the Model Context Protocol's HTTP transport, allowing remote clients to call MCP tools without STDIO connection.

#### Request

```http
POST /api/mcp HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "resources/list"
}
```

#### Response

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "resources": [
      {
        "uri": "auq://schema/question-request",
        "mimeType": "application/json",
        "name": "Question Request Schema"
      }
    ]
  }
}
```

#### Tools Available

#### `ask_user_questions`

Creates a new question session and returns immediately (non-blocking, unlike CLI).

**Parameters:**

```typescript
{
  title: string;                    // "Session title"
  description?: string;             // "Detailed explanation"
  questions: QuestionRequest[];     // Array of question objects
  timeout?: number;                 // Seconds before auto-timeout (default: 600)
  allowSkip?: boolean;              // Can user skip questions? (default: false)
}
```

**Question Types:**

```typescript
{
  id: string;                       // Unique question ID
  prompt: string;                   // "What is your name?"
  description?: string;             // Additional context
  type: "single-select" | "multi-select" | "custom-input";
  options?: {
    id: string;
    label: string;
  }[];
}
```

**Request Example:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "ask_user_questions",
    "arguments": {
      "title": "Feedback Survey",
      "questions": [
        {
          "id": "q1",
          "prompt": "How satisfied are you?",
          "type": "single-select",
          "options": [
            { "id": "opt1", "label": "Very satisfied" },
            { "id": "opt2", "label": "Satisfied" },
            { "id": "opt3", "label": "Neutral" }
          ]
        }
      ],
      "timeout": 300
    }
  }
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"sessionId\": \"abc-123\", \"status\": \"pending\"}"
      }
    ]
  }
}
```

#### `get_answered_questions`

Retrieve answers for a session (polls until answered or timeout).

**Parameters:**

```typescript
{
  session_id: string; // Session ID from ask_user_questions
}
```

**Request Example:**

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "get_answered_questions",
    "arguments": {
      "session_id": "abc-123"
    }
  }
}
```

**Response (Pending):**

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"status\": \"pending\"}"
      }
    ]
  }
}
```

**Response (Completed):**

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"answers\": [...], \"status\": \"completed\"}"
      }
    ]
  }
}
```

---

## REST API

### Sessions

#### `GET /api/sessions`

List all sessions, optionally filtered by status.

**Query Parameters:**

| Parameter | Type   | Description                                                     |
| --------- | ------ | --------------------------------------------------------------- |
| `status`  | string | Filter by status: `pending`, `completed`, `rejected`, `timeout` |

**Request:**

```bash
curl http://localhost:3000/api/sessions
curl http://localhost:3000/api/sessions?status=pending
```

**Response (200 OK):**

```json
{
  "sessions": [
    {
      "id": "abc-123",
      "status": "pending",
      "createdAt": "2025-03-19T10:30:00Z",
      "questionCount": 3,
      "answered": false
    },
    {
      "id": "def-456",
      "status": "completed",
      "createdAt": "2025-03-19T10:25:00Z",
      "questionCount": 3,
      "answered": true
    }
  ]
}
```

**Error Response (400):**

```json
{
  "error": "Invalid status filter"
}
```

---

#### `GET /api/sessions/[id]`

Retrieve a specific session's details, including questions and answers.

**Request:**

```bash
curl http://localhost:3000/api/sessions/abc-123
```

**Response (200 OK):**

```json
{
  "id": "abc-123",
  "status": "completed",
  "request": {
    "title": "Feedback Survey",
    "questions": [
      {
        "id": "q1",
        "prompt": "How satisfied are you?",
        "description": "Rate your experience",
        "type": "single-select",
        "options": [
          { "id": "opt1", "label": "Very satisfied" },
          { "id": "opt2", "label": "Satisfied" }
        ]
      }
    ]
  },
  "answers": [
    {
      "questionId": "q1",
      "selectedOption": { "id": "opt1", "label": "Very satisfied" },
      "customText": null
    }
  ],
  "createdAt": "2025-03-19T10:30:00Z",
  "updatedAt": "2025-03-19T10:35:00Z"
}
```

**Error Response (404):**

```json
{
  "error": "Session not found"
}
```

---

#### `POST /api/sessions/[id]/answer`

Submit answers for a session.

**Request Body:**

```json
{
  "answers": [
    {
      "questionId": "q1",
      "selectedOption": {
        "id": "opt1",
        "label": "Very satisfied"
      },
      "customText": null
    },
    {
      "questionId": "q2",
      "selectedOption": null,
      "customText": "Free-form response"
    }
  ]
}
```

**Request:**

```bash
curl -X POST http://localhost:3000/api/sessions/abc-123/answer \
  -H "Content-Type: application/json" \
  -d '{
    "answers": [
      {
        "questionId": "q1",
        "selectedOption": {"id": "opt1", "label": "Very satisfied"},
        "customText": null
      }
    ]
  }'
```

**Response (200 OK):**

```json
{
  "success": true
}
```

**Error Response (400):**

```json
{
  "error": "Invalid answers format"
}
```

**Error Response (404):**

```json
{
  "error": "Session not found"
}
```

---

#### `DELETE /api/sessions/[id]`

Delete a session.

**Request:**

```bash
curl -X DELETE http://localhost:3000/api/sessions/abc-123
```

**Response (200 OK):**

```json
{
  "success": true
}
```

**Error Response (404):**

```json
{
  "error": "Session not found"
}
```

---

## Server-Sent Events (SSE)

### `GET /api/sse`

Real-time event stream for session updates. Connect from the browser to receive live notifications.

**Request:**

```javascript
const eventSource = new EventSource("/api/sse");

eventSource.addEventListener("session-created", (event) => {
  const { sessionId } = JSON.parse(event.data);
  console.log("New session:", sessionId);
});

eventSource.addEventListener("session-answered", (event) => {
  const { sessionId } = JSON.parse(event.data);
  console.log("Session answered:", sessionId);
});

eventSource.addEventListener("session-rejected", (event) => {
  const { sessionId, reason } = JSON.parse(event.data);
  console.log("Session rejected:", sessionId, reason);
});
```

#### Events

| Event              | Data                                     | Description                     |
| ------------------ | ---------------------------------------- | ------------------------------- |
| `session-created`  | `{ sessionId: string }`                  | New question session created    |
| `session-answered` | `{ sessionId: string }`                  | Answers submitted for a session |
| `session-rejected` | `{ sessionId: string, reason?: string }` | Session was rejected            |

#### Connection Management

The SSE stream stays open until:

1. Client closes the connection
2. Client navigates away
3. Server crashes

The server sends a "ping" comment every 30 seconds to keep the connection alive:

```
: ping
```

**Example: Real-time dashboard update**

```typescript
import { useEffect, useState } from 'react';

export function SessionList() {
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    // Fetch initial list
    fetchSessions().then(setSessions);

    // Connect to SSE
    const eventSource = new EventSource('/api/sse');

    eventSource.addEventListener('session-created', async () => {
      // Refresh the list
      const updated = await fetchSessions();
      setSessions(updated);
    });

    eventSource.addEventListener('session-answered', async () => {
      // Refresh to show updated status
      const updated = await fetchSessions();
      setSessions(updated);
    });

    return () => eventSource.close();
  }, []);

  return <SessionTable sessions={sessions} />;
}
```

---

## Error Codes

| Code  | Meaning      | Example                             |
| ----- | ------------ | ----------------------------------- |
| `200` | Success      | Session retrieved, answer submitted |
| `400` | Bad Request  | Invalid JSON, malformed parameters  |
| `404` | Not Found    | Session ID doesn't exist            |
| `500` | Server Error | Database error, unhandled exception |

---

## Rate Limiting

Currently **no rate limiting** is implemented. For production deployments, add middleware to limit:

- API requests per IP
- SSE connections per user
- HTTP MCP requests per client

Example (using `express-rate-limit`):

```typescript
import rateLimit from "express-rate-limit";

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

app.use("/api/", apiLimiter);
```

---

## Authentication

Currently **no authentication** is implemented. The API is open to localhost by default.

For production, implement one of:

1. **JWT tokens** — Token-based authentication
2. **API keys** — Simple key validation
3. **OAuth 2.0** — External identity provider
4. **Network isolation** — Firewall rules

Example (simple API key):

```typescript
// Middleware
export async function GET(request: Request) {
  const key = request.headers.get("x-api-key");
  if (key !== process.env.API_KEY) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  // ...
}
```

---

## Pagination

Currently, `/api/sessions` returns all sessions in one response. For large deployments, add pagination:

```typescript
// Future enhancement
GET /api/sessions?page=1&limit=20
```

---

## CORS

By default, CORS is **disabled** (same-origin only). To enable cross-origin access:

```typescript
// In Next.js API route
const headers = new Headers({
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE",
  "Access-Control-Allow-Headers": "Content-Type",
});

return new Response(data, { headers });
```

---

## Examples

### Creating and answering questions (full flow)

**Step 1: Create session via HTTP MCP**

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "ask_user_questions",
      "arguments": {
        "title": "Quick Survey",
        "questions": [
          {
            "id": "q1",
            "prompt": "Your name?",
            "type": "custom-input"
          }
        ]
      }
    }
  }'
```

Response:

```json
{
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"sessionId\": \"session-abc\", \"status\": \"pending\"}"
      }
    ]
  }
}
```

**Step 2: Check session details**

```bash
curl http://localhost:3000/api/sessions/session-abc
```

**Step 3: Submit answer via REST API**

```bash
curl -X POST http://localhost:3000/api/sessions/session-abc/answer \
  -H "Content-Type: application/json" \
  -d '{
    "answers": [
      {
        "questionId": "q1",
        "selectedOption": null,
        "customText": "Alice"
      }
    ]
  }'
```

**Step 4: Get answered session**

```bash
curl http://localhost:3000/api/sessions/session-abc
```

---

## Testing

### Using `curl`

```bash
# Test HTTP MCP endpoint
curl -X POST http://localhost:3000/api/mcp -H "Content-Type: application/json" -d '{...}'

# Test REST API
curl http://localhost:3000/api/sessions
curl http://localhost:3000/api/sessions/abc-123
curl -X POST http://localhost:3000/api/sessions/abc-123/answer -d '{...}'
curl -X DELETE http://localhost:3000/api/sessions/abc-123

# Test SSE
curl --raw http://localhost:3000/api/sse
```

### Using Node.js

```typescript
// POST to HTTP MCP
const response = await fetch('http://localhost:3000/api/mcp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/call', ... })
});
const result = await response.json();

// GET sessions list
const sessions = await fetch('http://localhost:3000/api/sessions').then(r => r.json());

// POST answer
const answerResp = await fetch('http://localhost:3000/api/sessions/abc/answer', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ answers: [...] })
});
```

---

## See Also

- [Web Setup Guide](./web-setup.md) — Running the web server
- [Architecture Guide](./architecture.md) — Design and implementation
- [Migration Guide](./migration-guide.md) — Upgrading from v3.x
