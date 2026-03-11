# AUQ - Ask User Questions

_**A complete toolset that enables maximum level of human-(intention-)in-the-loop onto any long-running, multi-agentic AI workflows.**_

[![npm version](https://img.shields.io/npm/v/auq-mcp-server.svg)](https://www.npmjs.com/package/auq-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Install MCP Server](https://cursor.com/deeplink/mcp-install-light.svg)](https://cursor.com/en-US/install-mcp?name=ask-user-questions&config=eyJlbnYiOnt9LCJjb21tYW5kIjoibnB4IC15IGF1cS1tY3Atc2VydmVyIHNlcnZlciJ9)

Single/multiple choice questions, custom options, multi-agent interoperability, question queueing, question rejection with explanation, elaboration requesting, quick recommendations auto-selection, themes, native OS notification, terminal progress bar, multi-language support, agent skills support... and more.

**Works via MCP server / OpenCode plugin / Agent Skills.**

> AUQ is an **unopinionated** tool—it doesn't impose any specific workflow. It's a simple, flexible bridge between AI agents and human decision-making.

[Setup](#-setup) • [Usage](#-usage) • [CLI Reference](#-cli-reference)

---

## What does it do?

AUQ lets your AI assistants **ask clarifying questions** consisting of multiple-choice/single-choice questions (with an "Other" option for custom input / rejection / ask for elaboration) while coding or working, and **wait for your answers** through a **separate CLI window** without messing up your workflow.

This lets you inject your **intent** into long-running autonomous AI tasks—no more switching windows or babysitting AIs. Turn on the CLI **anytime**, even **remotely via SSH**!

<details>
<summary><i>A fun background story</i></summary>

In AI-assisted coding, guiding LLMs to ask **clarifying questions** have been widely recognized as a powerful prompt engineering technique to overcome LLM hallucination and generate more contextually appropriate code [1].

On October 18th, Claude Code 2.0.21 introduced an internal `AskUserQuestion` tool. Inspired by it, I decided to build a similar tool that is:

- **Integration-flexible** - Works with MCP clients (Claude Desktop, Cursor, etc.) and has official OpenCode plugin support
- **Non-invasive** - Doesn't heavily integrate with your coding CLI workflow or occupy UI space
- **Multi-agent friendly** - Supports receiving questions from multiple agents simultaneously in parallel workflows

</details>

---

## ✨ Demo

![AUQ Demo](media/demo2.png)

https://github.com/user-attachments/assets/3a135a13-fcb1-4795-9a6b-f426fa079674

---

## 🚀 Setup

### Install CLI

**Bun (recommended — required for default OpenTUI renderer)**

```bash
bun add -g auq-mcp-server
```

**npm**

```bash
npm install -g auq-mcp-server
```

**pnpm**

```bash
pnpm add -g auq-mcp-server
```

**yarn**

```bash
yarn global add auq-mcp-server
```

> **Note:** Bun is recommended for the default OpenTUI renderer. When installed via npm/pnpm/yarn, the shell wrapper auto-detects Bun at runtime. If Bun is not available, it falls back to Node.js with the legacy Ink renderer.

### Integrate with Your AI

**Option A: MCP Server** (Cursor, Claude Code, Codex CLI, Claude Desktop)

<details>
<summary><strong>Cursor</strong></summary>

[![Install MCP Server](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/en-US/install-mcp?name=ask-user-questions&config=eyJlbnYiOnt9LCJjb21tYW5kIjoibnB4IC15IGF1cS1tY3Atc2VydmVyIHNlcnZlciJ9)

Or manually add to MCP settings:

```json
{
  "mcpServers": {
    "ask-user-questions": {
      "command": "bunx",
      "args": ["-y", "auq-mcp-server", "server"]
    }
  }
}
```

</details>

<details>
<summary><strong>Claude Code</strong></summary>

```bash
claude mcp add --transport stdio ask-user-questions -- bunx -y auq-mcp-server server
```

Or add to `.mcp.json`:

```json
{
  "mcpServers": {
    "ask-user-questions": {
      "type": "stdio",
      "command": "bunx",
      "args": ["-y", "auq-mcp-server", "server"]
    }
  }
}
```

</details>

<details>
<summary><strong>Codex CLI</strong></summary>

Add to `~/.codex/config.toml`:

```toml
[mcp_servers.ask-user-questions]
command = "bunx"
args = ["-y", "auq-mcp-server", "server"]
tool_timeout_sec = 99999
```

</details>

<details>
<summary><strong>Claude Desktop</strong></summary>

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "ask-user-questions": {
      "command": "bunx",
      "args": ["-y", "auq-mcp-server", "server"]
    }
  }
}
```

</details>

> **Note:** Some MCP clients have default timeouts that may interrupt AUQ if you take too long to answer. Configure longer timeouts for better experience.

---

**Option B: OpenCode Plugin**

Add to `opencode.json`:

```json
{
  "plugin": ["@paulp-o/opencode-auq@latest"]
}
```

---

**Option C: Agent Skills (Experimental)**

Copy the `skills/ask-user-questions/` folder to your agent's skills directory.

> ⚠️ **Limitations:** Skills don't support features like status polling, fetching answers, or rejected question handling. MCP or plugin is recommended.

---

## 💻 Usage

### Start the TUI

```bash
auq              # Launch interactive TUI (default)
```

The TUI displays pending questions from all connected AI agents. Answer them **at your convenience**.

### In Your AI Workflow

Add to your `AGENTS.md` or prompt:

```markdown
Whenever you need clarification, call AUQ(ask-user-questions) instead of guessing.
```

---

## 🎨 Features

| Feature             | Description                                         |
| ------------------- | --------------------------------------------------- |
| **One Inbox**       | Collect questions from multiple agents in one place |
| **Smart Queuing**   | Questions queue up; answer on your terms            |
| **Rich Formatting** | Markdown support with syntax highlighting           |
| **Bulk Actions**    | `Ctrl+R` auto-selects recommended options           |
| **Multi-Renderer**  | OpenTUI (default, Bun) or Ink (fallback, Node)      |
| **Themes**          | 16 built-in themes + custom theme support           |
| **Notifications**   | Native OS notifications for new questions           |
| **i18n**            | English, Korean (auto-detected)                     |

---

## 📋 CLI Reference

<details>
<summary><strong>Commands Overview</strong></summary>

```
auq                          Start interactive TUI (default)
auq server                   Start MCP server over stdio
auq ask <json|->             Create a question session
auq answer <sessionId>       Submit answers or reject
auq sessions <subcommand>    Manage sessions
auq fetch-answers [id]       Fetch/poll answered sessions
auq history [subcommand]     Browse session history
auq config <subcommand>      Get/set configuration
auq update                   Check for and install updates
```

</details>

<details>
<summary><strong>🔍 Sessions</strong></summary>

```bash
# List sessions (paginated)
auq sessions list
auq sessions list --all                    # Include completed
auq sessions list --stale                  # Only stale sessions
auq sessions list --limit 20 --page 1      # Pagination
auq sessions list --json

# Show session details
auq sessions show <sessionId>
auq sessions show <sessionId> --json

# Dismiss/archive a session
auq sessions dismiss <sessionId>
auq sessions dismiss <sessionId> --force
```

</details>

<details>
<summary><strong>📝 History</strong></summary>

```bash
# List history (paginated)
auq history
auq history --all                    # Include abandoned
auq history --unread                 # Only unread
auq history --search "deploy"        # Search text
auq history --session <id>           # Filter by session
auq history --limit 20 --page 1      # Pagination
auq history --json

# Show full Q&A detail
auq history show <sessionId>
auq history show <sessionId> --json
```

</details>

<details>
<summary><strong>💬 Fetch Answers</strong></summary>

```bash
# List answered sessions
auq fetch-answers
auq fetch-answers --unread
auq fetch-answers --limit 20 --page 1
auq fetch-answers --json

# Poll for a specific session (blocking)
auq fetch-answers <sessionId> --blocking
```

</details>

<details>
<summary><strong>⚡ Answer & Ask</strong></summary>

```bash
# Answer a session
auq answer <sessionId> --answers '{"0":{"selectedOption":"Yes"}}'
auq answer <sessionId> --reject --reason "Not applicable"
auq answer <sessionId> --answers '...' --force  # Force abandoned

# Create a session (stdin)
echo '{"questions":[...]}' | auq ask -
auq ask '{"questions":[{"prompt":"Continue?","options":[{"label":"Yes"}]}]}'
```

**Answer JSON format:**

```json
{
  "0": {
    "selectedOption": "Label",
    "selectedOptions": ["A", "B"],
    "customText": "free text"
  }
}
```

</details>

<details>
<summary><strong>⚙️ Configuration</strong></summary>

```bash
# View config
auq config get
auq config get <key>
auq config get --json

# Set config (local or global)
auq config set <key> <value>
auq config set <key> <value> --global
```

**Config keys:**

| Key              | Type                        | Default   | Description                   |
| ---------------- | --------------------------- | --------- | ----------------------------- |
| `maxOptions`     | number (2-10)               | 5         | Maximum options per question  |
| `maxQuestions`   | number (1-10)               | 5         | Maximum questions per session |
| `sessionTimeout` | number (ms)                 | 0         | Session timeout (0 = none)    |
| `theme`          | string                      | "system"  | UI theme name                 |
| `language`       | string                      | "auto"    | UI language (auto/en/ko)      |
| `renderer`       | "ink" \| "opentui"          | "opentui" | TUI renderer engine           |
| `staleAction`    | "warn"\|"remove"\|"archive" | "warn"    | Action for stale sessions     |
| `updateCheck`    | boolean                     | true      | Enable auto-update checks     |

**Config files:**

- Local: `./.auqrc.json`
- Global: `~/.config/auq/.auqrc.json`

</details>

<details>
<summary><strong>⌨️ Keyboard Shortcuts</strong></summary>

**Answering:**
| Key | Action |
|-----|--------|
| `Space` | Select/toggle option (without advancing) |
| `Enter` | Select option and advance to next question |
| `R` | Select recommended option(s) for current question |
| `Ctrl+R` | Auto-select all recommended + go to review |
| `Esc` | Reject the question set (with optional reason) |

**Navigation:**
| Key | Action |
|-----|--------|
| `Ctrl+S` | Open session picker |
| `1-9` | Jump directly to session N |
| `[` / `]` | Previous/next session |
| `U` | Open update overlay |

**UI:**
| Key | Action |
|-----|--------|
| `Ctrl+T` | Cycle through themes |
| `Ctrl+Q` | Quit |

**Mouse (OpenTUI only):**

- Click option: Select/toggle
- Click session dot: Switch session
- Scroll: Navigate lists/overlays

</details>

<details>
<summary><strong>🌍 Environment Variables</strong></summary>

| Variable             | Description                                    |
| -------------------- | ---------------------------------------------- |
| `AUQ_RENDERER`       | Override renderer: `"ink"` or `"opentui"`      |
| `AUQ_SESSION_DIR`    | Custom session storage directory               |
| `XDG_CONFIG_HOME`    | Custom config directory (default: `~/.config`) |
| `NO_UPDATE_NOTIFIER` | Set to `"1"` to disable update checks          |
| `CI`                 | Automatically disables notifications if set    |

</details>

<details>
<summary><strong>🎨 Themes</strong></summary>

16 built-in themes with automatic persistence. Press `Ctrl+T` to cycle.

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

**Custom themes:** Place `.theme.json` files in `~/.config/auq/themes/`

</details>

---

## ⚙️ Advanced Topics

<details>
<summary><strong>Renderer Selection</strong></summary>

AUQ supports two terminal rendering engines:

| Renderer              | Runtime | Status              |
| --------------------- | ------- | ------------------- |
| **OpenTUI** (default) | Bun     | Stable, recommended |
| **Ink**               | Node.js | Legacy fallback     |

**Automatic selection:** The `bin/auq` shell wrapper detects your runtime:

- Prefers Bun → OpenTUI renderer
- Falls back to Node.js → Ink renderer

**Manual override:**

```bash
AUQ_RENDERER=ink auq      # Force Ink
AUQ_RENDERER=opentui auq  # Force OpenTUI
```

Or set in `.auqrc.json`:

```json
{ "renderer": "ink" }
```

</details>

<details>
<summary><strong>Auto-Update</strong></summary>

AUQ checks for updates **on every launch** (no cache delay).

- **Patch/Minor/Major**: All version types show the update overlay
- **Silent install**: Disabled — user must confirm or defer
- **Update overlay**: Top-pinned, vertical buttons, ↑↓ navigation

**Disable updates:**

```bash
auq config set updateCheck false
# or
NO_UPDATE_NOTIFIER=1 auq
```

**Manual update:**

```bash
auq update      # Interactive
auq update -y   # Skip confirmation
```

</details>

<details>
<summary><strong>Stale & Abandoned Sessions</strong></summary>

**Stale sessions** (unanswered longer than threshold):

- Show ⚠️ warning icon in TUI
- Configurable action: `warn`, `remove`, or `archive`
- Default threshold: 2 hours

**Abandoned sessions** (AI disconnected):

- Show red indicator in TUI
- Require `--force` to answer via CLI
- Visible with `auq sessions list --all`

</details>

<details>
<summary><strong>Markdown Support</strong></summary>

Question prompts support Markdown formatting:

- **Bold**, _italic_, ~~strikethrough~~
- `inline code`
- Links (rendered as `text (url)`)
- Fenced code blocks with syntax highlighting

Always enabled. Falls back to plain text if parsing fails.

</details>

<details>
<summary><strong>Development</strong></summary>

```bash
# Start MCP server (dev)
bun run dev

# Build
bun run build

# Test
bun run test

# Create mock sessions for TUI testing
bun run scripts/create-mock-session.ts 5

# Regenerate skill
bun run generate:skill
```

**Session storage locations:**

- macOS: `~/Library/Application Support/auq/sessions`
- Linux: `~/.local/share/auq/sessions`
- Windows: `%APPDATA%\auq\sessions`

</details>

<details>
<summary><strong>Troubleshooting</strong></summary>

**OpenTUI fails to initialize:**

- Ensure Bun is installed: `bun --version`
- Check `AUQ_RENDERER` isn't forcing Ink
- The shell wrapper should auto-detect; verify with `which auq`

**Sessions not appearing:**

- Check both MCP server and CLI use same session directory
- Look for `[AUQ] Session directory: <path>` in logs

**Update overlay not appearing:**

- Check `auq config get updateCheck` is `true`
- Verify `NO_UPDATE_NOTIFIER` is not set
- CI environments auto-disable checks

**Manual session cleanup:**

```bash
rm -rf ~/Library/Application\ Support/auq/sessions/*  # macOS
rm -rf ~/.local/share/auq/sessions/*                  # Linux
```

</details>

---

## 🤔 Why AUQ vs. Built-in Questioning Tools?

> **A clean decision inbox so you & AI stay in flow.**

You're an AI power user, running multiple agents on multiple instances. Highly parallelized, the AIs ask questions to you simultaneously, on multiple threads—scattered across different windows. AUQ enables them to ask **anytime**, collects everything in **one inbox**, and lets you respond **on your terms**—then elegantly routes answers back to each agent.

```
   Claude Code    Cursor    OpenCode
        │           │           │
        ▼           ▼           ▼
      ┌─────────────────────────────┐
      │        📥 AUQ Inbox         │
      └─────────────────────────────┘
                    │
                    ▼
                  🖥️ TUI
                    │
                    ▼
      ┌─────────────────────────────┐
      │       Your Answers          │
      └─────────────────────────────┘
        │           │           │
        ▼           ▼           ▼
   Claude Code    Cursor    OpenCode
```

📥 **One Inbox for All Agents** — Multiple agents ask in one place. One queue, one source of truth.

🧠 **Teach the AI** — Reject bad questions and tell it why. Turn "no" into better follow-ups.

❓ **Fix the Question First** — Can't answer because it's vague? Request **elaboration** before you guess.

⚡ **Blast Through the Obvious** — `Ctrl+R` accepts all **recommended** options. Focus on the hard decisions.

🔔 **Pinged When It Matters** — Native notifications, **batched** so you're not spammed.

🌐 **Works Where You Work** — SSH into a remote server? AUQ runs there too.

<details>
<summary><strong>Nice Extras</strong></summary>

- 🎨 16 built-in themes + custom theme support
- 🌍 i18n (English, Korean) with auto-detection
- 📊 Dock progress bar (iTerm2, WezTerm, Ghostty)
- 🔤 Full CJK character support

#### Power Moves

| Shortcut | What it does                                       |
| -------- | -------------------------------------------------- |
| `Space`  | Select option without advancing                    |
| `Enter`  | Select option and advance to next question         |
| `R`      | Select recommended option(s) for current question  |
| `Ctrl+R` | Quick submit — auto-fill recommended, go to review |
| `Esc`    | Reject question set — optionally explain why       |
| `Ctrl+T` | Cycle through 16 themes                            |

</details>

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**References**

[1] Prompt engineering techniques for LLM code generation, including clarifying questions as a method to reduce hallucination and improve contextually appropriate outputs.
