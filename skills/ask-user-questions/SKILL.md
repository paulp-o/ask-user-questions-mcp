---
name: ask-user-questions
description: Ask clarifying questions to users via interactive TUI. Use when you need user input on preferences, implementation choices, or ambiguous instructions.
license: MIT
metadata:
  author: paulp-o
  version: "2.0.1"
---

# Ask User Questions

Use this tool when you need to ask the user questions during execution. This allows you to:

Gather user preferences or requirements
Clarify ambiguous instructions
Get decisions on implementation choices as you work
Offer choices to the user about what direction to take.
Usage notes:

Users will always be able to select "Other" to provide custom text input
Use multiSelect: true to allow multiple answers to be selected for a question
Recommend an option unless absolutely necessary, make it the first option in the list and add "(Recommended)" at the end of the label
For multiSelect questions, you MAY mark multiple options as "(Recommended)" if several choices are advisable
Do NOT use this tool to ask "Is my plan ready?" or "Should I proceed?"

## Usage

```bash
# Ask questions via CLI
npx auq ask '{"questions": [...]}'

# Or pipe JSON input
echo '{"questions": [...]}' | npx auq ask
```

## Parameters

```json
{
  "questions": [
    {
      "prompt": "Which authentication method would you like to use?",
      "title": "Auth",
      "options": [
        {"label": "JWT (Recommended)", "description": "Stateless, scalable"},
        {"label": "Session cookies", "description": "Traditional, server-side"}
      ],
      "multiSelect": false
    }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `questions` | array | Yes | 1-5 question objects |
| `questions[].prompt` | string | Yes | Full question text |
| `questions[].title` | string | Yes | Short label (max 12 chars) |
| `questions[].options` | array | Yes | 2-5 options with `label` and optional `description` |
| `questions[].multiSelect` | boolean | Yes | Allow multiple selections |
