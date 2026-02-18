# Change: Add Markdown Rendering to Question Prompts

## Why

AI agents frequently include formatted content in question prompts (emphasis, inline code, links, and fenced code snippets). Today AUQ renders `prompt` as plain text in the question view, which loses formatting intent and makes prompts (especially code-heavy ones) harder to read.

## What Changes

- Render question prompts as Markdown in the question view (`QuestionDisplay.tsx`) and in the review screen (`ReviewScreen.tsx`) for consistent display.
- Support core inline Markdown (bold, italic, strikethrough, inline code, links) plus fenced code blocks.
- Render fenced code blocks with syntax highlighting using `cli-highlight`.
- Apply theme-aware colors for code blocks using the existing `useTheme()` system; other Markdown styling uses `ink-markdown-es` defaults.
- Fall back silently to plain-text rendering if Markdown parsing or rendering fails.

## Impact

- **Affected specs**: `tui-application`
- **Affected code**:
  - `src/tui/components/QuestionDisplay.tsx` (prompt rendering)
  - `src/tui/screens/ReviewScreen.tsx` (prompt rendering)
  - theme types + built-in themes (add code block colors)
  - new `MarkdownPrompt` wrapper component
- **Dependencies**: add `ink-markdown-es` (Ink 6 + React 19), `marked` (via ink-markdown-es), and `cli-highlight`
- **No breaking changes**: question schema remains `{ prompt: string, title: string, options: Option[], multiSelect?: boolean }`; this is a rendering-only feature
