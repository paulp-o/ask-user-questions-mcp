![AUQ Demo](media/demo.png)

# AUQ - Ask User Questions

[![npm version](https://img.shields.io/npm/v/auq-mcp-server.svg)](https://www.npmjs.com/package/auq-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Install MCP Server](https://cursor.com/deeplink/mcp-install-light.svg)](https://cursor.com/en-US/install-mcp?name=ask-user-questions&config=eyJlbnYiOnt9LCJjb21tYW5kIjoibnB4IC15IGF1cS1tY3Atc2VydmVyIHNlcnZlciJ9)

**A lightweight CLI tool that allows your LLMs to ask questions to you in a separate space with clean terminal UX. Supports both MCP server and official OpenCode plugin integration. Made for multi-agent parallel coding workflows.**

🤔 [Why do I need it when I already have question tool in CC/OC?](#-why-auq-vs-built-in-ask-tools)

[Setup](#setup-instructions) • [Features](#-features)

---

## What does it do?

AUQ lets your AI assistants generate clarifying questions consisting of multiple-choice/single-choice questions (with an "Other" option for custom input) while coding or working, and wait for your answers through a separate CLI tool without messing up your workflow.

You can keep the CLI running in advance, or start it when questions are pending. With simple arrow key navigation, you can select answers and send them back to the AI—all within a clean terminal interface.

## Background

In AI-assisted coding, guiding LLMs to ask **clarifying questions** have been widely recognized as a powerful prompt engineering technique to overcome LLM hallucination and generate more contextually appropriate code [1].

On October 18th, Claude Code 2.0.21 introduced an internal `ask-user-question` tool. Inspired by it, I decided to build a similar tool that is:

- **Integration-flexible** - Works with MCP clients (Claude Desktop, Cursor, etc.) and has official OpenCode plugin support
- **Non-invasive** - Doesn't heavily integrate with your coding CLI workflow or occupy UI space
- **Multi-agent friendly** - Supports receiving questions from multiple agents simultaneously in parallel workflows

---

## ✨ Features

<https://github.com/user-attachments/assets/3a135a13-fcb1-4795-9a6b-f426fa079674>

### 🖥️ CLI-Based

- **Lightweight**: Adds only ~150 tokens to your context per question
- **SSH-compatible**: Use over remote connections
- **Fast**: Instant startup, minimal resource usage

### 📦 100% Local

All information operates based on your local file system. No data leaves your machine.

### 🔄 Resumable & Stateless

The CLI app doesn't need to be running in advance. Whether the model calls the MCP first and you start the CLI later, or you keep it running—you can immediately answer pending questions in FIFO order.

### ❌ Question Set Rejection with Feedback Loop

When the LLM asks about the wrong domain entirely, you can reject the question set, optionally providing the reason to the LLM. The rejection feedback is sent back to the LLM, allowing it to ask more helpful questions or align on what's important for the project.

### 📋 Question Set Queuing

Recent AI workflows often use parallel sub-agents for concurrent coding. AUQ handles multiple simultaneous LLM calls gracefully—when a new question set arrives while you're answering another, it's queued and processed sequentially. Perfect for multi-agent parallel coding workflows.

---

## 🤔 Why AUQ vs. Built-in Ask Tools?

**Why should I use AUQ instead of the built-in "Question" tools in OpenCode, Claude Code, or other coding agents?**

AUQ is designed for the era of parallel multi-agent workflows, with several key advantages:

### 🚀 Non-Blocking Parallel Operation

Unlike built-in ask tools that halt the entire AI workflow until you respond, AUQ **doesn't block the AI from continuing work**. Questions are queued asynchronously, allowing your AI assistants to keep coding while you review and answer questions at your own pace.

### 🎯 Multi-Agent Question Set Support

AUQ can handle question sets from **multiple agents simultaneously**. In modern AI coding workflows, you often have several sub-agents working in parallel—each might need clarification on different aspects of your codebase. With AUQ:

- **No more screen switching** between different agent conversations
- **Unified queue** for all agent questions, regardless of which AI tool they're coming from
- **Sequential processing** of questions from multiple sources in one interface

### 🌐 Question Set Rejection Support

**Skip irrelevant question sets entirely** - reject whole question batches that don't apply to your current context, saving time and maintaining focus on relevant AI-agent questions.

---

# Setup Instructions

## 🚀 Install CLI Tool

First, install the AUQ CLI tool:

### Global Installation (Recommended)

```bash
# Install globally
npm install -g auq-mcp-server

```

### Local Installation (Project-specific)

```bash
# Install in your project
npm install auq-mcp-server

```

**Note:** Sessions are stored globally regardless of installation method. See [Troubleshooting](#troubleshooting) for session locations.

---

## 🔌 Choose Your Integration Method

AUQ supports multiple AI coding environments. Choose the one that fits your workflow:

### Option A: MCP Server

### Cursor

[![Install MCP Server](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/en-US/install-mcp?name=ask-user-questions&config=eyJlbnYiOnt9LCJjb21tYW5kIjoibnB4IC15IGF1cS1tY3Atc2VydmVyIHNlcnZlciJ9)

### Claude Code (CLI)

**Method 1: Using CLI** (Recommended)

```bash
claude mcp add --transport stdio ask-user-questions -- npx -y auq-mcp-server server
```

**Method 2: Manual Configuration**

Add to `.mcp.json` in your project root (for team-wide sharing):

```json
{
  "mcpServers": {
    "ask-user-questions": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "auq-mcp-server", "server"]
    }
  }
}
```

Or add to `~/.claude.json` for global access across all projects.

**Verify setup:** Type `/mcp` in Claude Code to check server status.

### Codex CLI

Add to `~/.codex/config.toml`:

```toml
[mcp_servers.ask-user-questions]
command = "npx"
args = ["-y", "auq-mcp-server", "server"]
```

**Full configuration example** (with optional settings):

```toml
[mcp_servers.ask-user-questions]
command = "npx"
args = ["-y", "auq-mcp-server", "server"]

# Optional: Additional environment variables
# env = { "AUQ_SESSION_DIR" = "/custom/path" }

# Optional: Whitelist additional env vars
# env_vars = ["AUQ_SESSION_DIR"]


# Optional: Working directory
# cwd = "/Users/<user>/projects"
```

Restart Codex CLI after saving the configuration.

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "ask-user-questions": {
      "command": "npx",
      "args": ["-y", "auq-mcp-server", "server"]
    }
  }
}
```

**Restart Claude Desktop** after saving.

### Option B: Official OpenCode Plugin

**Direct integration** for OpenCode users. Bypasses MCP limitations by calling `auq ask` directly.

#### Configuration

Add to `opencode.json`:

```json
{
  "plugin": ["@paulp-o/opencode-auq@latest"]
}
```

---

## 💻 Usage

### Starting the CLI tool

```bash
auq      # if installed globally (npm install -g)
npx auq  # works from anywhere
```

Then just start working with your coding agent or AI assistant. You may prompt to ask questions with the tool the agent got; it will mostly just get what you mean.

### Commands

```bash
# you won't likely need these at all
auq server       # Start MCP server
auq --version    # Show version
auq --help       # Show help
```

### Keyboard Shortcuts

| Key          | Action       | Description                                                            |
| ------------ | ------------ | ---------------------------------------------------------------------- |
| `E`          | Elaborate    | Request AI to elaborate on current question with more detailed options |
| `Ctrl+Enter` | Quick Submit | Auto-select recommended options for all questions and go to review     |
| `Ctrl+T`     | Theme        | Cycle through available color themes                                   |

### Recommended Options

AUQ automatically detects recommended options provided by the AI:

- Options containing `(recommended)`, `[recommended]`, `(추천)`, or `[추천]` are detected.
- **Visual Aid**: Recommended options are highlighted with a ★ star badge.
- **Auto-selection**:
  - **Single-select**: The first recommended option is pre-selected.
  - **Multi-select**: All recommended options are pre-selected.
- You can always change the selection before submitting.

---

### 🎨 Themes

AUQ supports **16 built-in color themes** with automatic persistence. Press `Ctrl+T` to cycle through themes.

#### Built-in Themes

| Theme            | Style                    |
| ---------------- | ------------------------ |
| AUQ dark         | Default dark theme       |
| AUQ light        | Default light theme      |
| Nord             | Arctic, bluish           |
| Dracula          | Dark purple/pink         |
| Catppuccin Mocha | Warm dark pastels        |
| Catppuccin Latte | Warm light pastels       |
| Solarized Dark   | Low contrast dark        |
| Solarized Light  | Low contrast light       |
| Gruvbox Dark     | Retro groove dark        |
| Gruvbox Light    | Retro groove light       |
| Tokyo Night      | Dark with vibrant colors |
| One Dark         | Atom-inspired dark       |
| Monokai          | Classic vibrant dark     |
| GitHub Dark      | GitHub's dark mode       |
| GitHub Light     | GitHub's light mode      |
| Rosé Pine        | Warm, cozy pinks         |

#### Theme Persistence

Your selected theme is automatically saved to `~/.config/auq/config.json` and restored on next launch.

#### Custom Themes

Create custom themes by placing `.theme.json` files in:

- **macOS/Linux**: `~/.config/auq/themes/`

Example custom theme (`~/.config/auq/themes/my-theme.theme.json`):

```json
{
  "name": "my-theme",
  "colors": {
    "primary": "#ff6b6b",
    "success": "#51cf66",
    "text": "#f8f9fa"
  }
}
```

Custom themes inherit from the default dark theme—only override the colors you want to change. See the [JSON schema](schemas/theme.schema.json) for all available properties.

---

### Manual session cleanup

Sessions auto-clean after completion or timeout. However, you can manually clean them up if you want to.

```bash
rm -rf ~/Library/Application\ Support/auq/sessions/*  # macOS
rm -rf ~/.local/share/auq/sessions/*                  # Linux
```

---

<details>
<summary>Local Development & Testing</summary>

To test the MCP server and CLI locally during development:

### 1. Start the MCP Server (Terminal 1)

```bash
# Option A: Run with tsx (recommended for development)
npm run start

# Option B: Run with fastmcp dev mode (includes web inspector at http://localhost:6274)
npm run dev

# Option C: Run the built version
npm run build && npm run server
```

### 2. Create a Test Session (Terminal 2)

Use the `auq ask` command to create a session and wait for answers:

```bash
# Run directly with tsx during development
npx tsx bin/auq.tsx ask '{"questions": [{"prompt": "Which language?", "title": "Lang", "options": [{"label": "TypeScript"}, {"label": "Python"}], "multiSelect": false}]}'

# Or pipe JSON to stdin
echo '{"questions": [{"prompt": "Which database?", "title": "DB", "options": [{"label": "PostgreSQL"}, {"label": "MongoDB"}], "multiSelect": false}]}' | npx tsx bin/auq.tsx ask
```

This will create a session and wait for the TUI to provide answers.

### 3. Answer with the TUI (Terminal 3)

```bash
# Run the TUI to answer pending questions
npx tsx bin/auq.tsx
```

### Create Mock Sessions for TUI Testing

To test the TUI with multiple pending sessions:

```bash
# Create 3 mock sessions (default)
npx tsx scripts/create-mock-session.ts

# Create a specific number of sessions
npx tsx scripts/create-mock-session.ts 5
```

Then run the TUI to see and answer them:

```bash
npx tsx bin/auq.tsx
```

### Verify MCP and CLI Use Same Session Directory

Both components should report the same session directory path. Check the logs:

- MCP server logs session directory on startup
- `auq ask` prints `[AUQ] Session directory: <path>` to stderr

On macOS, both should use: `~/Library/Application Support/auq/sessions`

</details>

## Troubleshooting

### Session Storage

Sessions are stored in platform-specific global locations:

- **macOS**: `~/Library/Application Support/auq/sessions`
- **Linux**: `~/.local/share/auq/sessions` (or `$XDG_DATA_HOME/auq/sessions`)
- **Windows**: `%APPDATA%\auq\sessions`

To override the default location, set the `AUQ_SESSION_DIR` environment variable:

```bash
export AUQ_SESSION_DIR=/custom/path
```

## ⚙️ Configuration

AUQ can be configured via a `.auqrc.json` file. Settings are loaded from (in priority order):

1. **Local**: `./.auqrc.json` (project directory)
2. **Global**: `~/.config/auq/.auqrc.json` (or `$XDG_CONFIG_HOME/auq/.auqrc.json`)
3. **Defaults**: Built-in values

Settings from local config override global config, which overrides defaults.

### Example Configuration

```json
{
  "maxOptions": 5,
  "maxQuestions": 5,
  "recommendedOptions": 4,
  "recommendedQuestions": 4,
  "language": "auto",
  "theme": "system",
  "sessionTimeout": 0,
  "retentionPeriod": 604800000
}
```

### Available Settings

| Setting                 | Type    | Default   | Range/Values                    | Description                                           |
| ----------------------- | ------- | --------- | ------------------------------- | ----------------------------------------------------- |
| `maxOptions`            | number  | 5         | 2-10                            | Maximum options per question                          |
| `maxQuestions`          | number  | 5         | 1-10                            | Maximum questions per session                         |
| `recommendedOptions`    | number  | 4         | 1-10                            | Suggested number of options (for AI guidance)         |
| `recommendedQuestions`  | number  | 4         | 1-10                            | Suggested number of questions (for AI guidance)       |
| `language`              | string  | "auto"    | "auto", "en", "ko"              | UI language (auto-detects from system if "auto")      |
| `theme`                 | string  | "system"  | "system", "dark", "light", etc. | Color theme for TUI                                   |
| `sessionTimeout`        | number  | 0         | 0+ (milliseconds)               | Session timeout (0 = no timeout)                      |
| `retentionPeriod`       | number  | 604800000 | 0+ (milliseconds)               | How long to keep completed sessions (default: 7 days) |
| `notifications.enabled` | boolean | true      | true/false                      | Enable desktop notifications for new questions        |
| `notifications.sound`   | boolean | true      | true/false                      | Play sound with notifications (kitty only)            |

### Language Support

AUQ supports multiple languages for the TUI interface:

- **English** (`en`) - Default
- **Korean** (`ko`) - 한국어

Language is auto-detected from system locale (`LANG`, `LC_ALL`, `LC_MESSAGES` environment variables) when set to `"auto"`.

### Desktop Notifications

AUQ sends desktop notifications when new questions arrive, helping you notice when AI assistants have questions waiting while you're focused on other work.

#### Supported Terminals

| Terminal         | Notification | Progress Bar | Protocol |
| ---------------- | ------------ | ------------ | -------- |
| iTerm2           | ✅           | ✅           | OSC 9    |
| kitty            | ✅           | ❌           | OSC 99   |
| Ghostty          | ✅           | ✅           | OSC 9    |
| WezTerm          | ✅           | ✅           | OSC 9    |
| Windows Terminal | ✅           | ✅           | OSC 9    |
| Hyper            | ✅           | ❌           | OSC 9    |
| VS Code Terminal | ✅           | ❌           | OSC 9    |
| rxvt/urxvt       | ✅           | ❌           | OSC 777  |
| Alacritty        | ❌           | ❌           | -        |
| Terminal.app     | ❌           | ❌           | -        |
| GNOME Terminal   | ❌           | ❌           | -        |
| Konsole          | ❌           | ❌           | -        |

**Features:**

- **Batched Notifications**: Rapid session arrivals are batched into a single notification
- **Progress Bar**: Shows question completion progress in terminal dock icon (supported terminals)
- **Auto-Detection**: Terminal type is detected automatically via environment variables

**Configuration:**

```json
{
  "notifications": {
    "enabled": true,
    "sound": true
  }
}
```

Set `notifications.enabled` to `false` to disable all notifications.

---

## 🚀 Roadmap

- [x] Light & dark mode themes
- [x] Custom color themes (16 built-in + custom theme support)
- [x] Multi-language support (English, Korean)
- [x] Configuration file support (`.auqrc.json`)
- [x] Desktop notifications with progress bar (OSC 9/99/777)
- [ ] MCP prompt mode switch (Anthropic style / minimal)
- [ ] Simple option to prompt the LLM to/not ask more questions after answering.
- [ ] Optional 'context' field provided by the LLM, that describes the context of the questions - will be useful for multi-agent coding

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

[1] arXiv:2308.13507 <https://arxiv.org/abs/2308.13507>
