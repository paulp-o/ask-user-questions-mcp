# AUQ OpenCode Plugin

OpenCode plugin that forwards `ask_user_questions` to the `auq ask` CLI.

## Install

```bash
bun add -g auq-mcp-server
bun add -g @paulp-o/opencode-auq
```

## Configure OpenCode

Add to `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@paulp-o/opencode-auq"]
}
```

## Notes

- The plugin expects `auq` to be on `PATH` (global install or equivalent).
- The tool name and parameters match the MCP server (`ask_user_questions`).
