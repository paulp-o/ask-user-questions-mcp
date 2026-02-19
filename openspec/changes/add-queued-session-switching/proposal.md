# Change: Add queued session switching

## Why

Users are currently locked into the active queued-question session until they complete or reject it, which makes it hard to juggle multiple parallel prompts. Allowing session switching improves flow while keeping each session fully resumable.

## What Changes

- Add the ability to switch between queued sessions during question answering using next/previous cycling (`Ctrl+]` / `Ctrl+[`) with wrap-around.
- Add direct session jump by index (`1`-`9`) for the first nine queued sessions.
- Add an overlay session picker (`Ctrl+S`) showing session number, first question title, working directory, progress, and age; navigation via Up/Down arrows, Enter selects, Esc closes.
- Preserve full per-session UI state when switching (question index, selected options, custom text drafts, elaborate marks, and focus position) by lifting state to a per-session store (e.g., `Record<sessionId, SessionUIState>`).
- Show a compact row of numbered dots/pills below the footer when 2+ sessions exist, indicating active session and progress (green = has answers, white = untouched, yellow = in progress), and only show switching keybindings when 2+ sessions exist.
- Handle edge cases: remove timed-out paused sessions from the queue with a brief toast; do not auto-switch when new sessions arrive; keep elaborate/rephrase replacement sessions independent.

## Impact

- Affected specs: tui-application
- Affected code: bin/tui-app.tsx, src/tui/components/StepperView.tsx, src/tui/components/Header.tsx, src/tui/components/Footer.tsx
