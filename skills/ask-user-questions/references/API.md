# ask_user_questions Tool Reference

## Purpose

The `ask_user_questions` MCP tool allows agents to ask users questions with multiple-choice answers through an interactive TUI (Text User Interface). Use this tool when you need to gather user preferences, make decisions that require user input, or clarify ambiguous requirements.

## JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "questions": {
      "type": "array",
      "description": "Questions to ask the user (1-5 questions). Each question must include: prompt (full question text), title (short label, max 12 chars), options (2-5 choices with labels and descriptions), and multiSelect (boolean).",
      "minItems": 1,
      "maxItems": 5,
      "items": {
        "type": "object",
        "properties": {
          "prompt": {
            "type": "string",
            "description": "The complete question to ask the user. Should be clear, specific, and end with a question mark. Example: 'Which programming language do you want to use?' If multiSelect is true, phrase it accordingly, e.g. 'Which features do you want to enable?'"
          },
          "title": {
            "type": "string",
            "minLength": 1,
            "description": "Very short label displayed as a chip/tag (max 12 chars). Examples: 'Auth method', 'Library', 'Approach'. This title appears in the interface to help users quickly identify questions."
          },
          "options": {
            "type": "array",
            "description": "The available choices for this question. Must have 2-5 options. Each option should be a distinct, mutually exclusive choice (unless multiSelect is enabled). There should be no 'Other' option, that will be provided automatically.",
            "minItems": 2,
            "maxItems": 5,
            "items": {
              "type": "object",
              "properties": {
                "label": {
                  "type": "string",
                  "description": "The display text for this option. Should be concise (1-5 words). To mark as recommended, append '(recommended)' to the label text."
                },
                "description": {
                  "type": "string",
                  "description": "Explanation of what this option means or what will happen if chosen. Useful for providing context about trade-offs or implications."
                }
              },
              "required": [
                "label"
              ],
              "additionalProperties": false
            }
          },
          "multiSelect": {
            "type": "boolean",
            "description": "Set to true to allow the user to select multiple options instead of just one. Use when choices are not mutually exclusive. Default: false (single-select)"
          }
        },
        "required": [
          "prompt",
          "title",
          "options",
          "multiSelect"
        ],
        "additionalProperties": false
      }
    }
  },
  "required": [
    "questions"
  ],
  "additionalProperties": false
}
```

## Quick Reference

### Root Parameters

| Parameter | Type | Required | Constraints | Description |
|-----------|------|----------|-------------|-------------|
| `questions` | array | Yes | 1-5 items | Array of question objects to ask the user |

### Question Object

| Property | Type | Required | Constraints | Description |
|----------|------|----------|-------------|-------------|
| `prompt` | string | Yes | - | The complete question text (should end with ?) |
| `title` | string | Yes | min: 1 char | Short label displayed as chip/tag (max 12 chars) |
| `options` | array | Yes | 2-5 items | Available choices for the question |
| `multiSelect` | boolean | Yes | - | Whether multiple options can be selected |

### Option Object

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `label` | string | Yes | Display text (1-5 words). Append "(Recommended)" to mark as recommended |
| `description` | string | No | Explanation of what this option means or implies |

## Examples

### Single-Select Question

```json
{
  "questions": [{
    "prompt": "Which programming language do you want to use?",
    "title": "Language",
    "options": [
      {"label": "TypeScript (Recommended)", "description": "Strong typing with excellent tooling"},
      {"label": "JavaScript", "description": "Flexible and widely supported"},
      {"label": "Python", "description": "Great for data processing"}
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
      {"label": "Authentication", "description": "Add user login and session management"},
      {"label": "Database (Recommended)", "description": "Include database configuration"},
      {"label": "API Documentation", "description": "Auto-generated API docs"},
      {"label": "Testing", "description": "Setup test framework"}
    ],
    "multiSelect": true
  }]
}
```

### Multiple Questions

```json
{
  "questions": [
    {
      "prompt": "Which framework do you prefer?",
      "title": "Framework",
      "options": [{"label": "React"}, {"label": "Vue"}, {"label": "Svelte"}],
      "multiSelect": false
    },
    {
      "prompt": "Which styling approach?",
      "title": "Styling",
      "options": [{"label": "CSS Modules"}, {"label": "Tailwind CSS (Recommended)"}],
      "multiSelect": false
    }
  ]
}
```

## Validation

Use the bundled validation script to check parameters before calling the tool:

```bash
bun scripts/validate-params.ts '{"questions": [...]}'
```

The validator checks:
- Questions array has 1-5 items
- Each question has required fields (`prompt`, `title`, `options`, `multiSelect`)
- Each question has 2-5 options
- Each option has a `label` property
- No additional properties are present

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Validation passed |
| 1 | Validation failed (see output for details) |

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| Missing required property | Question missing `prompt`, `title`, `options`, or `multiSelect` | Add all required fields |
| Too many/few questions | Array has 0 or >5 questions | Use 1-5 questions |
| Too many/few options | Question has <2 or >5 options | Use 2-5 options per question |
| Missing option label | Option object lacks `label` | Add `label` to every option |
| Invalid multiSelect | Not a boolean value | Use `true` or `false` (no quotes) |

## Notes

- The "Other" option is automatically added by the TUI - do not include it
- Append "(Recommended)" to option labels to mark them as recommended
- For multi-select questions, multiple options can be marked as recommended
- Keep option labels concise (1-5 words) for better readability
