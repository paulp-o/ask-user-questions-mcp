---
name: ask-user-questions
description: Ask clarifying questions to users via interactive TUI. Use when you need user input on preferences, implementation choices, or ambiguous instructions.
license: MIT
metadata:
  author: paulp-o
  version: "2.5.0"
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
        { "label": "JWT (Recommended)", "description": "Stateless, scalable" },
        {
          "label": "Session cookies",
          "description": "Traditional, server-side"
        }
      ],
      "multiSelect": false
    }
  ]
}
```

| Field                     | Type    | Required | Description                                         |
| ------------------------- | ------- | -------- | --------------------------------------------------- |
| `questions`               | array   | Yes      | 1-5 question objects                                |
| `questions[].prompt`      | string  | Yes      | Full question text                                  |
| `questions[].title`       | string  | Yes      | Short label (max 12 chars)                          |
| `questions[].options`     | array   | Yes      | 2-5 options with `label` and optional `description` |
| `questions[].multiSelect` | boolean | Yes      | Allow multiple selections                           |
| `nonBlocking`             | boolean | No       | Submit without waiting (default: false)             |

## Non-blocking Mode

Submit questions without waiting for answers by setting `nonBlocking: true`:

### MCP Tool: ask_user_questions (non-blocking)

Call `ask_user_questions` with `nonBlocking: true` to submit questions and continue working:

```json
{
  "questions": [...],
  "nonBlocking": true
}
```

The tool returns immediately with a session ID:

```
[Session: a3f2e8b1 | Questions: 3 | Status: pending]

Questions submitted successfully.
Use get_answered_questions(session_id="a3f2e8b1") or `auq fetch-answers a3f2e8b1` to retrieve answers.
```

### Workflow

1. Submit questions with `nonBlocking: true`
2. Continue with other tasks
3. Fetch answers when ready using `get_answered_questions` or `auq fetch-answers`

### MCP Tool: get_answered_questions

Fetch answers for a previously submitted non-blocking question set.

Parameters:

- `session_id` (string, required) — Session ID from non-blocking submission (full UUID or short 8-char ID)
- `blocking` (boolean, default: false) — If true, wait until user answers before returning

Example:

```json
{
  "session_id": "a3f2e8b1",
  "blocking": false
}
```

Response varies by status:

- **Completed**: Returns formatted answers with `[Session: {id} | Questions: {count}]` header
- **Pending**: Returns `[Session: {id} | Status: pending]` with "No answers yet."
- **Rejected**: Returns `[Session: {id} | Status: rejected]` with optional reason

### Read Tracking

When answers are fetched (via MCP tool or CLI), sessions are marked as "read" with a `lastReadAt` timestamp. This enables:

- Filtering unread sessions with `--unread` flag
- Tracking which answers have been consumed by AI agents
- Answering via `auq answer` does NOT mark sessions as read — only fetching does

## CLI: auq fetch-answers

Retrieve answers from the command line.

### Fetch specific session

```bash
auq fetch-answers <session-id>          # Fetch answers (non-blocking)
auq fetch-answers <session-id> --blocking  # Wait for answers
auq fetch-answers <session-id> --json      # JSON output
```

### List unread sessions

```bash
auq fetch-answers                   # List all unread sessions (default)
auq fetch-answers --unread           # Same as above
auq fetch-answers --unread --json    # JSON output
```

## CLI: auq history

Browse past question-answer sessions.

### List sessions

```bash
auq history                          # List recent sessions (default, max 20)
auq history --all                    # Include abandoned sessions
auq history --unread                 # Only unread sessions
auq history --search "database"      # Search in questions/answers
auq history --limit 10               # Limit results
auq history --session a3f2e8b1       # Find specific session
auq history --json                   # JSON output
```

Flags can be combined: `auq history --unread --search "auth" --limit 5`

### Show session details

```bash
auq history show <session-id>        # Full session details
auq history show <session-id> --json # JSON output
```

Shows all questions with all options. Selected options are marked with `(selected)`.
