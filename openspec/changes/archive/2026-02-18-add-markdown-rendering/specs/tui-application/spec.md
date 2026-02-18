# tui-application Specification

## Purpose

This delta adds Markdown rendering for question prompts in the AUQ TUI so agents can present formatted prompts (including code snippets) with improved readability.

## ADDED Requirements

### Requirement: Markdown Prompt Rendering

The system MUST render question prompts as Markdown in the question view.

#### Scenario: Prompt renders as Markdown

- **WHEN** a question is displayed in the question view
- **THEN** the system SHALL render the question `prompt` using a Markdown renderer
- **AND** the renderer MUST support both inline Markdown and fenced code blocks

#### Scenario: Inline-by-default rendering mode

- **WHEN** a prompt contains only inline Markdown constructs (for example emphasis, inline code, links)
- **THEN** the system SHALL render the prompt as a single inline flow (without inserting extra block spacing)

#### Scenario: Block rendering when block elements exist

- **WHEN** a prompt contains block-level Markdown elements (for example fenced code blocks)
- **THEN** the system SHALL render the prompt using block layout suitable for multi-line content

---

### Requirement: Supported Inline Markdown

The system SHALL support a core inline Markdown feature set for question prompts.

#### Scenario: Emphasis and inline code

- **WHEN** a prompt contains bold or italic emphasis
- **THEN** the system SHALL render the emphasized text distinctly from surrounding text
- **AND** **WHEN** a prompt contains inline code (backticks)
- **THEN** the system SHALL render inline code with a distinct style

#### Scenario: Strikethrough

- **WHEN** a prompt contains strikethrough syntax
- **THEN** the system SHALL render strikethrough text distinctly from surrounding text

---

### Requirement: Fenced Code Block Rendering

The system SHALL render fenced code blocks in prompts as code blocks.

#### Scenario: Code block renders as a distinct block

- **WHEN** a prompt contains a fenced code block
- **THEN** the system SHALL render the code block as a visually distinct block separate from surrounding text

#### Scenario: Syntax highlighting

- **WHEN** a fenced code block includes a language identifier
- **THEN** the system SHALL apply syntax highlighting to the code block content

---

### Requirement: Theme-Aware Code Block Colors

The system SHALL apply theme-aware colors for code block backgrounds and text.

#### Scenario: Code block colors derived from theme

- **WHEN** rendering a code block
- **THEN** the system SHALL use the active theme (via `useTheme()`)
- **AND** the theme MUST provide semantic color tokens for code block background and code block text

---

### Requirement: Link Rendering Format

The system SHALL render links in prompts in a terminal-compatible text format.

#### Scenario: Link renders as text plus URL

- **WHEN** a prompt contains a Markdown link
- **THEN** the system SHALL render it in the format `text (url)`

---

### Requirement: Graceful Fallback on Markdown Failure

The system MUST fall back to plain-text prompt rendering if Markdown parsing or rendering fails.

#### Scenario: Silent fallback without user-visible errors

- **WHEN** Markdown parsing or rendering throws an error
- **THEN** the system SHALL render the raw prompt text as plain text
- **AND** the system SHALL NOT display an error message to the user

---

### Requirement: Consistent Prompt Rendering in Review Screen

The system SHALL render prompts consistently across the question view and review screen.

#### Scenario: Review screen uses the same prompt renderer

- **WHEN** the review screen displays a question prompt
- **THEN** the system SHALL render the prompt using the same Markdown prompt renderer used in the question view

---

### Requirement: Terminal Width Matching

The system SHALL render Markdown prompts to match the available terminal width.

#### Scenario: Prompt layout respects terminal width

- **WHEN** the terminal width changes or differs between environments
- **THEN** the system SHALL layout the rendered prompt content to fit within the current terminal width
