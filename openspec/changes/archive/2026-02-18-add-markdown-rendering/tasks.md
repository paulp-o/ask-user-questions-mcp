# Tasks: Add Markdown Rendering to Question Prompts

## 1. Implementation

- [x] 1.1 Install dependencies: `ink-markdown-es`, `marked`, `cli-highlight`
- [x] 1.2 Add Markdown-related theme tokens to the theme interface (code block background + text colors)
- [x] 1.3 Update all built-in theme files (8+) to include code block color values
- [x] 1.4 Create a `MarkdownPrompt` wrapper component for rendering prompt Markdown
- [x] 1.5 Integrate `MarkdownPrompt` into `QuestionDisplay.tsx` (replace plain `<Text>` prompt rendering)
- [x] 1.6 Integrate `MarkdownPrompt` into `ReviewScreen.tsx` for consistent prompt rendering
- [x] 1.7 Add error handling / fallback path to render plain text on Markdown parse/render failure (no user-visible error)
- [x] 1.8 Write unit tests using Vitest + ink-testing-library for common Markdown cases and fallback behavior
- [x] 1.9 Manually test with various Markdown inputs (inline styles, links, fenced blocks, long lines, mixed content)
- [x] 1.10 Update any relevant documentation to reflect Markdown support in question prompts
