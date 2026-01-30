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

**Session Storage:**

- **Global install**: `~/Library/Application Support/auq/sessions` (macOS), `~/.local/share/auq/sessions` (Linux)
- **Local install**: `.auq/sessions/` in your project root

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
  "plugin": ["@paulp-o/opencode-auq"]
}
```

---

## 💻 Usage

### Starting the CLI tool

```bash
auq  # if you installed globally
npx auq  # if you installed locally
```

Then just start working with your coding agent or AI assistant. You may prompt to ask questions with the tool the agent got; it will mostly just get what you mean.

### Commands

```bash
# you won't likely need these at all
auq server       # Start MCP server
auq --version    # Show version
auq --help       # Show help
```

<details>
<summary><strong>🔍 auq ask 명령어 상세 설명 (클릭하여 펼치기)</strong></summary>

<br>

`auq ask`는 AI 코딩 에이전트가 사용자에게 질문을 할 때 사용하는 핵심 명령어입니다.

#### 기본 사용법

```bash
auq ask
```

이 명령어를 실행하면 대화형 터미널 인터페이스가 시작되어 AI 에이전트의 질문 세트를 기다립니다.

#### 작동 방식

1. **질문 수신 대기**: AI 에이전트(MCP 클라이언트)가 질문을 보내면 자동으로 표시됩니다
2. **질문 세트 처리**: 여러 개의 연관된 질문을 하나의 세트로 묶어서 처리
3. **사용자 응답**: 각 질문에 대해 답변을 입력하거나 건너뛸 수 있음
4. **응답 전송**: 모든 답변을 완료하면 AI 에이전트로 결과가 전송됩니다

#### 주요 특징

- **비차단 방식**: AI가 질문을 보내는 동안에도 계속 작업할 수 있음
- **다중 에이전트 지원**: 여러 AI 에이전트의 질문을 동시에 처리
- **세션 관리**: 각 질문 세트는 독립적인 세션으로 관리됨
- **타임아웃 처리**: 일정 시간 동안 응답이 없으면 세션이 자동 종료

#### 예시 워크플로우

```
1. AI 에이전트가 복잡한 코드를 작성 중
2. AI가 "이 함수의 반환 타입을 어떻게 할까요?"라고 질문
3. auq ask가 실행되어 질문이 터미널에 표시
4. 사용자가 답변 입력
5. AI가 답변을 받아서 코드 작성 계속 진행
```

#### 문제 해결

- **질문이 표시되지 않음**: MCP 서버가 제대로 실행되고 있는지 확인
- **응답이 전송되지 않음**: 네트워크 연결과 세션 상태 확인
- **세션이 중단됨**: 타임아웃 설정이나 세션 관리 확인

</details>

---

### Manual session cleanup

Sessions auto-clean after completion or timeout. However, you can manually clean them up if you want to.

```bash
# Global install
rm -rf ~/Library/Application\ Support/auq/sessions/*  # macOS
rm -rf ~/.local/share/auq/sessions/*                  # Linux

# Local install
rm -rf .auq/sessions/*
```

---

## 🚀 Roadmap

- [ ] Light & dark mode themes
- [ ] MCP prompt mode switch (Anthropic style / minimal)
- [ ] Custom color themes
- [ ] Multi-language support
- [ ] Audio notifications on new question
- [ ] Simple option to prompt the LLM to/not ask more questions after answering.
- [ ] Optional 'context' field privided by the LLM, that describes the context of the questions - will be useful for multi-agent coding

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

[1] arXiv:2308.13507 <https://arxiv.org/abs/2308.13507>
