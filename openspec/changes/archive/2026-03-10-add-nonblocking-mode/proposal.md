# Change: Add Non-blocking Question Mode

## Why

Currently, the MCP tool for asking user questions blocks until the user provides answers. This creates inefficiency for AI agents that could perform other productive work while waiting for user input. Non-blocking mode enables AI agents to submit questions, continue with other tasks, and fetch answers later when available, significantly improving workflow efficiency.

## What Changes

1. **MCP Tool Enhancement**: Add `nonBlocking` parameter to `ask_user_questions` tool (default: false)
2. **New MCP Tool**: Add `get_answered_questions` tool for fetching answers asynchronously
3. **CLI Enhancement**: Add `auq fetch-answers` command with blocking/non-blocking modes
4. **Read Tracking**: Add session-level `lastReadAt` timestamp to track when answers were fetched
5. **Response Metadata**: Prepend session ID and question count to all blocking responses
6. **Skill Documentation**: Update `skills/ask-user-questions/SKILL.md` with non-blocking workflows

## Impact

- **Affected specs**: `cli-interface`, `session-management`
- **Affected code**:
  - `src/server.ts` - MCP tool handlers
  - `src/shared/schemas.ts` - Zod schemas for new parameters
  - `src/session/SessionManager.ts` - read tracking updates
  - `src/session/types.ts` - TypeScript interfaces
  - `src/session/ResponseFormatter.ts` - formatted output with metadata
  - `bin/auq.tsx` - new CLI command
  - `skills/ask-user-questions/SKILL.md` - documentation

## Compatibility

- **Non-breaking**: All existing blocking behavior remains unchanged
- **Opt-in feature**: `nonBlocking: true` is required to enable new behavior
- **Default behavior**: `nonBlocking: false` preserves existing synchronous workflow
