# MCP Server Capability

Provides the `ask_user_questions` tool via the Model Context Protocol (MCP) for AI assistants to ask structured questions to users.

## Overview

The MCP server exposes a single tool that enables AI coding assistants to pause execution and gather user input through an interactive terminal interface. It uses FastMCP with stdio transport and integrates with the session management system for file-based IPC.

**Key Files:**

- `src/server.ts` - FastMCP server setup and tool registration
- `src/core/ask-user-questions.ts` - Core logic factory

---

## Requirements

### Requirement: Tool Registration

The system SHALL register an `ask_user_questions` tool with the MCP server that allows AI assistants to ask structured questions to users.

#### Scenario: Tool Discovery

- **WHEN** an MCP client connects to the server
- **THEN** the `ask_user_questions` tool SHALL be listed in the tools/list response
- **AND** the tool description SHALL explain its purpose and usage

#### Scenario: Tool Annotations

- **WHEN** the tool is registered
- **THEN** it SHALL include the following annotations:
  - `openWorldHint: true` (interacts with user's terminal)
  - `readOnlyHint: false` (waits for user input)
  - `idempotentHint: true` (same result for identical calls)

---

### Requirement: Question Validation

The system SHALL validate incoming questions against the defined Zod schema before processing.

#### Scenario: Valid Questions Accepted

- **WHEN** an AI assistant calls the tool with 1-4 valid questions
- **AND** each question has 2-4 options
- **THEN** the tool SHALL accept the request and create a session

#### Scenario: Empty Questions Rejected

- **WHEN** an AI assistant calls the tool with an empty questions array
- **THEN** the tool SHALL return an error: "At least one question is required"

#### Scenario: Schema Validation Failure

- **WHEN** an AI assistant calls the tool with invalid parameters
- **THEN** the tool SHALL return a validation error with details about the invalid fields

---

### Requirement: Session Orchestration

The system SHALL create a session, wait for user response, and return formatted results.

#### Scenario: Successful Session Flow

- **WHEN** an AI assistant calls the tool with valid questions
- **THEN** the system SHALL:
  1. Generate a unique callId (UUID)
  2. Create a session via SessionManager
  3. Wait for user to submit answers
  4. Return the formatted response to the AI

#### Scenario: Session Timeout

- **WHEN** a session exceeds the configured timeout
- **THEN** the tool SHALL return an error indicating timeout
- **AND** the session status SHALL be updated to "timed_out"

#### Scenario: Session Rejection

- **WHEN** a user rejects the question set
- **THEN** the tool SHALL return a message indicating rejection
- **AND** include the rejection reason if provided

---

### Requirement: Expired Session Cleanup

The system SHALL periodically clean up expired sessions to prevent disk space accumulation.

#### Scenario: Cleanup on Tool Execution

- **WHEN** the tool is executed
- **THEN** the system SHALL trigger async cleanup of expired sessions (non-blocking)
- **AND** log the number of cleaned sessions if any were removed

#### Scenario: Cleanup Failure Handling

- **WHEN** session cleanup fails
- **THEN** the system SHALL log a warning
- **AND** continue processing the current request without failure

---

### Requirement: Logging and Observability

The system SHALL log session lifecycle events for debugging and monitoring.

#### Scenario: Session Success Logging

- **WHEN** a session completes successfully
- **THEN** the system SHALL log: "Session completed successfully" with sessionId and callId

#### Scenario: Session Failure Logging

- **WHEN** a session fails
- **THEN** the system SHALL log: "Session failed" with the error details

---

### Requirement: Server Transport

The system SHALL use stdio transport for MCP communication.

#### Scenario: Server Startup

- **WHEN** the server is started via `auq server` command
- **THEN** it SHALL use stdio transport
- **AND** communicate via stdin/stdout with the MCP client

---

## Technical Design

### Server Configuration

```typescript
const server = new FastMCP({
  name: "AskUserQuestions",
  instructions: "Server instructions for LLM...",
  version: "0.1.17",
});
```

### Tool Definition

```typescript
server.addTool({
  name: "ask_user_questions",
  description: "Tool description...",
  annotations: {
    openWorldHint: true,
    readOnlyHint: false,
    idempotentHint: true,
  },
  execute: async (args, ctx) => {
    /* ... */
  },
  parameters: AskUserQuestionsParametersSchema,
});
```

### Response Format

```typescript
return {
  content: [{ type: "text", text: formattedResponse }],
};
```

---

## Dependencies

- `fastmcp` - MCP protocol implementation
- `src/core/ask-user-questions.ts` - Core logic
- `src/session/SessionManager.ts` - Session management
- `src/shared/schemas.ts` - Zod validation schemas
