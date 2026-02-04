---
name: ask-user-questions
description: Ask clarifying questions to users during AI task execution. Use when you need user input on preferences, implementation choices, or ambiguous instructions.
license: MIT
compatibility: Requires auq CLI installed (bun add -g auq-mcp-server) or bunx auq
metadata:
  author: paulp-o
  version: "1.6.0"
---

# Ask User Questions

Enable human-in-the-loop interactions by asking clarifying questions during AI task execution. Questions appear in a separate terminal UI, allowing users to respond without interrupting their workflow.

## When to Use

- **Gather preferences**: "Which authentication method do you prefer?"
- **Clarify ambiguity**: "Should I use REST or GraphQL for this API?"
- **Get implementation decisions**: "Which database should I use?"
- **Offer choices**: "Which features should I enable?"

**Do NOT use for:**
- Confirmation prompts ("Should I proceed?", "Is this plan ready?")
- Yes/no questions that don't offer meaningful choices

## How It Works

1. Call the `ask_user_questions` MCP tool with your questions
2. A session is created and displayed in the AUQ terminal UI
3. User selects answers (with option for custom "Other" input)
4. Formatted answers are returned to your agent

## Usage

### Via MCP Tool

```json
{
  "questions": [
    {
      "prompt": "Which authentication method would you like to use?",
      "title": "Auth",
      "options": [
        {"label": "JWT (Recommended)", "description": "Stateless, scalable"},
        {"label": "Session cookies", "description": "Traditional, server-side"},
        {"label": "OAuth 2.0", "description": "Third-party providers"}
      ],
      "multiSelect": false
    }
  ]
}
```

### Via Bundled Scripts

```bash
# Validate parameters before sending
bun scripts/validate-params.ts '{"questions": [...]}'

# Execute the ask command
bun scripts/ask.ts '{"questions": [...]}'

# Or pipe JSON from stdin
echo '{"questions": [...]}' | bun scripts/ask.ts
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `questions` | array | Yes | 1-5 question objects |

Each question object:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `prompt` | string | Yes | Full question text (end with ?) |
| `title` | string | Yes | Short label, max 12 chars |
| `options` | array | Yes | 2-5 option objects |
| `multiSelect` | boolean | Yes | Allow multiple selections |

Each option object:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `label` | string | Yes | Display text (1-5 words) |
| `description` | string | No | Context about trade-offs |

## Examples

### Single-Select Question

```json
{
  "questions": [{
    "prompt": "Which programming language do you want to use?",
    "title": "Language",
    "options": [
      {"label": "TypeScript (Recommended)", "description": "Type-safe, modern"},
      {"label": "JavaScript", "description": "Flexible, universal"},
      {"label": "Python", "description": "Great for scripting"}
    ],
    "multiSelect": false
  }]
}
```

### Multi-Select Question

```json
{
  "questions": [{
    "prompt": "Which features do you want to enable?",
    "title": "Features",
    "options": [
      {"label": "Dark mode (Recommended)"},
      {"label": "Notifications (Recommended)"},
      {"label": "Analytics"},
      {"label": "Export to PDF"}
    ],
    "multiSelect": true
  }]
}
```

## Output

The tool returns formatted text with user answers:

```
Question 1: Which authentication method would you like to use?
Answer: JWT (Recommended)

Question 2: Which features do you want to enable?
Answer: Multiple selections:
- Dark mode
- Notifications
```

## Bundled Scripts

### scripts/ask.ts
Bun executable CLI runner that invokes `bunx auq ask` with the provided JSON payload.

```bash
bun scripts/ask.ts '{"questions": [...]}'
```

### scripts/validate-params.ts
Standalone schema validator that checks parameters against the JSON schema.

```bash
bun scripts/validate-params.ts '{"questions": [...]}'
# Output: {"valid": true/false, "errors": [...]}
```

## Best Practices

1. **Always recommend an option** - Add "(Recommended)" to the best choice
2. **Keep questions focused** - One decision per question
3. **Provide context** - Use descriptions to explain trade-offs
4. **Use multiSelect wisely** - Only when choices aren't mutually exclusive
5. **Be specific** - "Which database?" not "What do you think about databases?"

## Troubleshooting

### Questions not appearing
- Ensure AUQ CLI is running: `auq` or `bunx auq`
- Check MCP server is connected

### Timeout issues
- Sessions don't timeout by default
- Configure in `.auqrc.json` if needed

## See Also

- [API Reference](references/API.md) - Full JSON schema and validation details
- [AUQ Repository](https://github.com/paulp-o/ask-user-questions-mcp) - Source code
