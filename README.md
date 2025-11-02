# AUQ MCP Server - Ask User Questions

An [MCP](https://modelcontextprotocol.io/) (Model Context Protocol) server that allows AI models to pause and ask users structured questions through an interactive terminal interface.

## 🎯 What is AUQ?

AUQ (Ask User Query) is a human clarification bridge for AI models. When an AI needs missing context or user preferences during reasoning, it can call the `ask_user_questions` tool to present multiple-choice and free-text questions. The user answers through a keyboard-navigable TUI, and the AI receives a formatted response to continue its work.

**Key Features:**
- 📝 Multiple-choice questions with descriptions
- ✍️ Custom free-text answers
- ⌨️ Fast keyboard navigation (arrow keys only)
- 🔄 Auto-advance workflow
- 📊 Review screen before submission
- 🎨 Clean terminal interface with Ink
- 🔌 Works with Claude Desktop, Cursor, and any MCP client

## 📦 Installation

### Global Installation (Recommended)

```bash
npm install -g auq-mcp-server
```

After installation, you can optionally set up a shell alias:

```bash
# For Zsh (macOS default)
echo 'alias auq="npx auq-mcp-server"' >> ~/.zshrc
source ~/.zshrc

# For Bash
echo 'alias auq="npx auq-mcp-server"' >> ~/.bashrc
source ~/.bashrc

# For Fish
echo 'alias auq "npx auq-mcp-server"' >> ~/.config/fish/config.fish
source ~/.config/fish/config.fish
```

## 🚀 Quick Start

### 1. Start the TUI (Terminal User Interface)

Open a terminal and run:

```bash
auq
```

The TUI will wait for incoming questions from your AI assistant.

### 2. Configure Your MCP Client

Choose your client and follow the setup instructions below.

## 🔌 MCP Server Setup

### Claude Desktop

Add this to your Claude Desktop configuration file:

**macOS/Linux:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "auq": {
      "command": "npx",
      "args": ["-y", "auq-mcp-server", "server"]
    }
  }
}
```

**Restart Claude Desktop** after saving the configuration.

### Cursor

Add this to your Cursor settings or create a `.mcp.json` file in your project root:

```json
{
  "mcpServers": {
    "auq": {
      "command": "npx",
      "args": ["-y", "auq-mcp-server", "server"],
      "env": {}
    }
  }
}
```

Restart Cursor after adding the configuration.

### Generic MCP Client

For any MCP-compatible client, use these connection details:

- **Command:** `npx`
- **Args:** `["-y", "auq-mcp-server", "server"]`
- **Transport:** stdio

### Verification

After configuration:

1. Start the AUQ TUI in a terminal: `auq`
2. Open your AI client (Claude Desktop or Cursor)
3. Ask the AI: "Ask me a question about my preferences"
4. Watch for the question to appear in the TUI

## 💻 TUI Usage Guide

### Starting the TUI

```bash
auq
```

The TUI operates in two modes:

1. **WAITING** - No questions pending, watching for incoming sessions
2. **PROCESSING** - Displaying current question set

### Navigation

**Question Navigation:**
- `←` `→` - Switch between questions
- `↑` `↓` - Navigate options (including custom input)

**Actions:**
- `Enter` - Select option AND advance to next question
- On last question, `Enter` auto-shows review screen
- `q` - Quit at any time

**Answering:**
- Arrow keys to highlight an option, then `Enter` to select
- Navigate to "Other (custom answer)" option to type freely
- On review screen: `y` to confirm, `b` to go back

### Multi-line Input

When focused on custom input:
- Type normally to enter text
- `Enter` - Submit and advance
- (Future: `Shift+Enter` for newlines)

### Auto-Features

- **Auto-advance:** Selecting an option automatically moves to the next question
- **Auto-review:** After the last question, the review screen shows automatically
- **Auto-queue:** Multiple question sets are processed in FIFO order

## 🛠️ Troubleshooting

### TUI Not Receiving Questions

**Problem:** Questions from AI don't appear in the TUI.

**Solutions:**
1. Verify MCP server is configured correctly in your client
2. Restart your AI client (Claude Desktop or Cursor)
3. Check the TUI is running: `auq`
4. Try asking the AI explicitly: "Use the ask_user_questions tool to ask me what I want"

### "Raw mode is not supported" Error

**Problem:** Error when starting the TUI in certain environments.

**Solution:**
- Ensure you're running in a proper terminal (not redirected/piped input)
- Use a modern terminal: iTerm2, Terminal.app, Alacritty, Windows Terminal
- Don't pipe input to auq: `echo "test" | auq` won't work

### MCP Server Connection Failed

**Problem:** Client can't connect to the MCP server.

**Solutions:**
1. Verify `npx` is available: `npx --version`
2. Test server manually: `npx -y auq-mcp-server server`
3. Check for typos in the configuration JSON
4. Review client logs for specific error messages

### Session Files Not Cleaned Up

**Problem:** Old session files remain in ~/.local/share/auq/sessions.

**Solution:**
- Sessions are automatically cleaned after completion or timeout
- Manual cleanup: `rm -rf ~/.local/share/auq/sessions/*`

## 🧑‍💻 Development

### Setup

```bash
git clone https://github.com/paulp-o/ask-user-question-mcp.git
cd ask-user-question-mcp
npm install
```

### Development Workflow

```bash
# Start MCP server in development mode
npm run dev

# Start TUI for testing
./bin/auq

# Run tests
npm test

# Build TypeScript
npm run build

# Lint and format
npm run lint
npm run format
```

### Testing with MCP Inspector

```bash
npm run dev
```

This opens the FastMCP CLI inspector for testing the `ask_user_questions` tool.

### Project Structure

```
.
├── bin/auq.tsx              # TUI entry point
├── src/
│   ├── server.ts            # MCP server entry point
│   ├── session/             # Session management
│   │   ├── SessionManager.ts
│   │   ├── types.ts
│   │   └── utils.ts
│   └── tui/                 # Terminal UI components
│       ├── components/
│       │   ├── OptionsList.tsx
│       │   ├── QuestionDisplay.tsx
│       │   ├── ReviewScreen.tsx
│       │   ├── StepperView.tsx
│       │   ├── Toast.tsx
│       │   └── WaitingScreen.tsx
│       └── session-watcher.ts
└── scripts/
    └── postinstall.cjs      # Setup helper
```

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes and add tests
4. Run tests and linting: `npm test && npm run lint`
5. Commit with clear messages: `git commit -m "feat: add new feature"`
6. Push and create a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🔗 Links

- [FastMCP Framework](https://github.com/punkpeye/fastmcp)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Report Issues](https://github.com/paulp-o/ask-user-question-mcp/issues)

## 📚 Examples

### Example: AI Using AUQ

**User to AI:** "Help me set up a new web project"

**AI thinks:** "I need to know their preferences"

**AI calls:** `ask_user_questions` with questions about language, framework, styling, etc.

**User sees in TUI:** Interactive question prompt

**User answers:** Selects options or types custom answers

**AI receives:** Formatted text with all answers

**AI continues:** Sets up project based on user preferences

### Example Question Format

```json
{
  "questions": [
    {
      "prompt": "Which programming language do you want to use?",
      "options": [
        {
          "label": "JavaScript",
          "description": "Use the Node.js ecosystem for fast prototyping."
        },
        {
          "label": "TypeScript",
          "description": "Write type-safe code built on JavaScript."
        },
        {
          "label": "Python",
          "description": "Leverage Python's strong data and ML ecosystem."
        }
      ]
    }
  ]
}
```

### Example Response Format

```
Here are the user's answers:

1. Which programming language do you want to use?
→ TypeScript — Write type-safe code built on JavaScript.
```

---

**Built with [FastMCP](https://github.com/punkpeye/fastmcp) and [Ink](https://github.com/vadimdemedes/ink)**
