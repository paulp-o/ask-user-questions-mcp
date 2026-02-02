# OpenCode Plugin Capability

Provides native OpenCode integration via plugin API, bypassing MCP for improved reliability.

## Overview

The OpenCode plugin is a separate npm package (`@paulp-o/opencode-auq`) that provides the `ask_user_questions` tool to OpenCode by directly spawning the `auq ask` CLI command. This approach avoids MCP timeout issues that can occur with the standard MCP server integration.

**Key Files:**

- `packages/opencode-plugin/src/index.ts` - Plugin implementation
- `packages/opencode-plugin/package.json` - Package configuration

---

## Requirements

### Requirement: Plugin Registration

The system SHALL export a valid OpenCode plugin function.

#### Scenario: Plugin Export

- **WHEN** the plugin is imported by OpenCode
- **THEN** it SHALL export an async function `AskUserQuestionsPlugin` conforming to the `Plugin` type

#### Scenario: Tool Registration

- **WHEN** the plugin initializes
- **THEN** it SHALL register the `ask_user_questions` tool via the `tool` object

---

### Requirement: Tool Definition

The system SHALL define the tool with identical schema to the MCP server.

#### Scenario: Schema Parity

- **WHEN** the tool is defined
- **THEN** it SHALL use the same parameter schema as the MCP server:
  - `questions`: Array of 1-4 questions
  - Each question: `prompt`, `title`, `options` (2-4), `multiSelect`
  - Each option: `label`, optional `description`

#### Scenario: Tool Description

- **WHEN** the tool is registered
- **THEN** it SHALL include the same descriptive text as the MCP server tool

---

### Requirement: CLI Execution

The system SHALL execute questions via the `auq ask` CLI command.

#### Scenario: Subprocess Spawning

- **WHEN** the tool is executed
- **THEN** the plugin SHALL:
  1. Spawn `auq ask` subprocess
  2. Pipe JSON payload to stdin
  3. Collect stdout as response
  4. Collect stderr for error handling

#### Scenario: Payload Format

- **WHEN** piping to the CLI
- **THEN** the payload SHALL be JSON with format: `{"questions": [...]}`

#### Scenario: Response Handling

- **WHEN** the subprocess exits with code 0
- **THEN** the plugin SHALL return stdout content as the tool response

#### Scenario: Error Handling

- **WHEN** the subprocess exits with non-zero code
- **THEN** the plugin SHALL reject with stderr content or a descriptive error message

#### Scenario: Missing CLI Error

- **WHEN** the `auq` command is not found
- **THEN** the plugin SHALL return an error indicating the CLI is not installed

---

### Requirement: Configuration

The system SHALL be configurable via OpenCode's standard plugin configuration.

#### Scenario: Plugin Installation

- **WHEN** configuring the plugin in `opencode.json`
- **THEN** the user SHALL add: `"plugin": ["@paulp-o/opencode-auq"]`

#### Scenario: Global Installation Requirement

- **WHEN** using the plugin
- **THEN** `auq-mcp-server` SHALL be installed globally (`npm install -g auq-mcp-server`)

---

### Requirement: Schema Synchronization

The system SHALL maintain schema parity with the main package.

#### Scenario: Inline Schema Definitions

- **WHEN** defining schemas
- **THEN** the plugin SHALL define schemas inline using `tool.schema` from OpenCode plugin framework
- **AND** maintain identical validation rules as `src/shared/schemas.ts`

#### Scenario: Manual Sync Requirement

- **WHEN** schemas change in the main package
- **THEN** the plugin schemas MUST be manually updated to match

---

## Technical Design

### Plugin Structure

```typescript
import { type Plugin, tool } from "@opencode-ai/plugin";

export const AskUserQuestionsPlugin: Plugin = async () => ({
  tool: {
    ask_user_questions: tool({
      description: TOOL_DESCRIPTION,
      args: AskUserQuestionsParametersSchema.shape,
      async execute(args) {
        return await runAuqAsk({ questions: args.questions });
      },
    }),
  },
});
```

### CLI Execution Flow

```typescript
const runAuqAsk = async (payload: unknown): Promise<string> =>
  new Promise((resolve, reject) => {
    const child = spawn("auq", ["ask"], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    // Pipe payload to stdin
    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();

    // Collect stdout/stderr
    // Resolve on exit code 0, reject otherwise
  });
```

### Comparison with MCP Server

| Aspect             | OpenCode Plugin       | MCP Server            |
| ------------------ | --------------------- | --------------------- |
| Transport          | Direct CLI spawn      | FastMCP stdio         |
| Protocol           | Bypasses MCP          | Full MCP protocol     |
| Timeout            | No MCP timeout issues | Subject to MCP limits |
| Dependencies       | @opencode-ai/plugin   | fastmcp               |
| Session Management | Delegated to CLI      | Built-in              |

---

## Dependencies

- `@opencode-ai/plugin` - OpenCode plugin API (peer dependency)
- `auq-mcp-server` - CLI tool (global installation required)

---

## Installation

```bash
# Install CLI globally
npm install -g auq-mcp-server

# Install plugin globally
npm install -g @paulp-o/opencode-auq
```

```json
// opencode.json
{
  "plugin": ["@paulp-o/opencode-auq"]
}
```
