## 1. Schema & Type Updates

- [x] 1.1 Add `nonBlocking` parameter to `AskUserQuestionsArgsSchema` in `src/shared/schemas.ts`
- [x] 1.2 Add `lastReadAt` field to `AnswersData` type in `src/session/types.ts`
- [x] 1.3 Create `GetAnsweredQuestionsArgsSchema` in `src/shared/schemas.ts`
- [x] 1.4 Update `ResponseFormatter` to include metadata header and option descriptions

## 2. MCP Server Implementation

- [x] 2.1 Update `ask_user_questions` tool handler to support `nonBlocking` parameter
- [x] 2.2 Create `get_answered_questions` tool with `session_id` and `blocking` parameters
- [x] 2.3 Implement session read tracking (update `lastReadAt` when answers fetched)
- [x] 2.4 Add formatted output for non-blocking submission confirmation
- [x] 2.5 Add formatted output for pending/rejected session status

## 3. CLI Implementation

- [x] 3.1 Create `auq fetch-answers` command handler in `bin/auq.tsx`
- [x] 3.2 Implement `<session-id>` argument parsing
- [x] 3.3 Implement `--blocking` flag for synchronous wait
- [x] 3.4 Implement `--json` flag for JSON output
- [x] 3.5 Implement `--unread` flag for listing unread sessions
- [x] 3.6 Implement default behavior (show all unread when no session-id)
- [x] 3.7 Add formatted text output matching MCP tool responses

## 4. Session Management Updates

- [x] 4.1 Add `markSessionAsRead()` method to `SessionManager`
- [x] 4.2 Add `getUnreadSessions()` method to `SessionManager`
- [x] 4.3 Update `AnswersData` interface to include `lastReadAt?: string`
- [x] 4.4 Update atomic write operations for `lastReadAt` field

## 5. Skill Documentation

- [x] 5.1 Update `skills/ask-user-questions/SKILL.md` with `nonBlocking` parameter usage
- [x] 5.2 Document `get_answered_questions` MCP tool
- [x] 5.3 Document `auq fetch-answers` CLI command
- [x] 5.4 Add non-blocking workflow example
- [x] 5.5 Document read tracking concept

## 6. Testing

- [x] 6.1 Add unit tests for `GetAnsweredQuestionsArgsSchema` validation
- [x] 6.2 Add unit tests for `ResponseFormatter` metadata header generation
- [x] 6.3 Add integration tests for non-blocking session creation
- [x] 6.4 Add integration tests for `get_answered_questions` tool
- [x] 6.5 Add tests for read tracking functionality

## 7. Validation

- [x] 7.1 Run `openspec validate add-nonblocking-mode --strict`
- [x] 7.2 Fix any validation errors
- [x] 7.3 Verify all deltas are correctly formatted
