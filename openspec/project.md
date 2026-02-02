# Project Context

## Purpose

AUQ (Ask User Questions) is a lightweight CLI tool and MCP server that enables AI coding assistants to ask clarifying questions to users through a separate terminal interface. It bridges the gap between AI agents and human input, allowing LLMs to gather user preferences, clarify ambiguous instructions, and get decisions on implementation choices without blocking the main coding workflow.

**Key Value Propositions:**

- **Non-blocking**: Questions are queued asynchronously; AI can continue working while users answer at their pace
- **Multi-agent friendly**: Handles question sets from multiple AI agents simultaneously via unified FIFO queue
- **Cross-platform aggregation**: Single CLI interface for questions from Claude Code, OpenCode, Cursor, and other MCP clients
- **100% local**: All data stored on local filesystem; no data leaves the machine

## Tech Stack

### Core Technologies

- **TypeScript** - Primary language (strict mode)
- **Node.js 22+** - Runtime environment
- **Zod v4** - Runtime schema validation
- **UUID v13** - Session ID generation

### MCP Integration

- **FastMCP v3.23+** - MCP protocol implementation
- **@modelcontextprotocol/sdk** - Official MCP SDK

### Terminal UI

- **Ink v6.4** - React for CLI (terminal UI framework)
- **@inkjs/ui v2.0** - UI component library
- **React v19** - Component framework
- **ink-text-input v6** - Text input components
- **ink-gradient v3** - Gradient text effects
- **gradient-string v3** - Header gradients
- **chalk v5** - Terminal colors

### Build & Dev

- **tsx** - TypeScript execution
- **Vitest** - Test runner
- **ESLint + Prettier** - Code quality
- **semantic-release** - Automated releases

### Package Structure

- **auq-mcp-server** - Main npm package (MCP server + CLI)
- **@paulp-o/opencode-auq** - OpenCode plugin (packages/opencode-plugin)

## Project Conventions

### Code Style

- **Formatting**: Prettier with defaults
- **Linting**: ESLint with typescript-eslint and perfectionist plugins
- **Imports**: Sorted alphabetically by perfectionist
- **Types**: Prefer interfaces over types; use Zod schemas for runtime validation
- **Exports**: Named exports preferred; default exports only for React components
- **Async**: Always use async/await; avoid raw Promises where possible
- **Error Handling**: Use typed errors (AtomicReadError, AtomicWriteError); log errors with context

### Architecture Patterns

- **File-based IPC**: MCP server and TUI communicate via JSON files on disk
- **Atomic Operations**: All file writes use temp file + rename pattern for crash safety
- **Session State Machine**: Sessions follow defined lifecycle (pending → completed/rejected/timed_out/abandoned)
- **React/Ink Components**: Functional components with hooks; no class components
- **Singleton Core**: Single `askUserQuestionsCore` instance per server process

### File Organization

```
src/
├── core/              # Core business logic (ask-user-questions.ts)
├── session/           # Session management system
│   ├── SessionManager.ts     # Main session orchestration
│   ├── atomic-operations.ts  # File safety primitives
│   ├── file-watcher.ts       # FS event handling
│   ├── ResponseFormatter.ts  # AI response formatting
│   ├── types.ts              # TypeScript interfaces
│   └── utils.ts              # Helper functions
├── shared/            # Shared schemas and types
├── tui/               # Terminal UI
│   ├── components/    # React/Ink components
│   ├── theme.ts       # Centralized theming
│   └── session-watcher.ts    # TUI session detection
└── __tests__/         # Test files
bin/
├── auq.tsx            # CLI entry point
└── tui-app.tsx        # TUI application
packages/
└── opencode-plugin/   # OpenCode plugin package
```

### Testing Strategy

- **Unit Tests**: Vitest for schemas, formatting, atomic operations
- **Integration Tests**: Server integration tests with mock sessions
- **Manual Testing**: TUI tested manually via `npm run dev`
- **Test Location**: `__tests__/` directories colocated with source
- **Naming**: `*.test.ts` suffix

### Git Workflow

- **Main Branch**: `main` - production releases
- **Commits**: Conventional commits (feat:, fix:, chore:, docs:)
- **Releases**: Automated via semantic-release on main branch push
- **Versioning**: Semantic versioning (MAJOR.MINOR.PATCH)

## Domain Context

### Session Lifecycle

Sessions represent a single question-answer interaction:

1. **Creation**: MCP tool call creates session directory with request.json and status.json
2. **Pending**: TUI detects session, displays questions to user
3. **Answering**: User navigates questions, selects options or enters custom text
4. **Review**: User confirms answers on review screen
5. **Completion**: answers.json written; MCP tool returns formatted response
6. **Alternative Paths**:
   - **Rejection**: User presses Esc, optionally provides reason
   - **Timeout**: Session exceeds configured timeout
   - **Abandonment**: Validation errors or JSON parsing failures

### Question Types

- **Single-select**: User picks ONE option (radio buttons)
- **Multi-select**: User picks MULTIPLE options (checkboxes)
- **Custom Input**: "Other" option always available for free-text answers
- **Constraints**: 1-4 questions per call, 2-4 options per question

### Response Format

PRD-compliant text format returned to AI:

```
Here are the user's answers:

1. {question.prompt}
→ {option.label} — {option.description}
→ Other: '{customText}'
```

## Important Constraints

### Technical Constraints

- **File Permissions**: Sessions created with 0o600 (owner read/write only)
- **UUID Format**: Session IDs must be valid UUID v4
- **Array Bounds**: 1-4 questions, 2-4 options (enforced by Zod schemas)
- **Title Length**: Question titles max 12 characters (UI constraint)
- **Timeout**: Default infinite (0); configurable via sessionTimeout

### Platform Constraints

- **macOS**: Sessions in `~/Library/Application Support/auq/sessions`
- **Linux**: Sessions in `~/.local/share/auq/sessions` (XDG compliant)
- **Windows**: Sessions in `%APPDATA%\auq\sessions`
- **Override**: `AUQ_SESSION_DIR` environment variable

Sessions are ALWAYS stored in global XDG-compliant paths regardless of how AUQ is installed (global npm, local project, etc.). This ensures the MCP server and CLI always find each other's sessions.

### MCP Constraints

- **Transport**: stdio only (no HTTP/SSE support currently)
- **Blocking**: Tool call blocks until user responds or timeout
- **OpenCode Workaround**: Plugin uses direct CLI spawn to avoid MCP timeout issues

## External Dependencies

### Runtime Dependencies

| Package         | Purpose                     | Version |
| --------------- | --------------------------- | ------- |
| fastmcp         | MCP protocol implementation | ^3.23.0 |
| ink             | React for CLI               | ^6.4.0  |
| @inkjs/ui       | UI components               | ^2.0.0  |
| react           | Component framework         | ^19.2.0 |
| zod             | Schema validation           | ^4.1.13 |
| uuid            | Session ID generation       | ^13.0.0 |
| chalk           | Terminal colors             | ^5.6.2  |
| gradient-string | Text gradients              | ^3.0.0  |

### OpenCode Plugin Dependencies

| Package             | Purpose             | Version |
| ------------------- | ------------------- | ------- |
| @opencode-ai/plugin | OpenCode plugin API | (peer)  |

### No External Services

- No API keys required
- No network requests made
- No analytics or telemetry
- All data local to user's machine
