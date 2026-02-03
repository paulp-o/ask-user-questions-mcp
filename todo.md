# Phase 1: Core Functionality ✅

- [x] 'tab' key isn't supposed to be used for switching to custom input; it navigates to the next problem! custom input choice is navigated just like MCQs, with up/down arrows.
- [x] after 'Answers submitted successfully!' message, it should show the next queued question or go back to the waiting screen.
- [x] 'enter' key not only selects the option, but also navigates to the next question.
- [x] remove the review screen by pressing 'r' key. Instead, just show it when user finishes answering all questions.
- [x] make 'esc' key to reject the question set (session) - this is to reject answering the question set or when the user knows that an outdated question set is being asked. (confirm the user if they're sure they want to reject the question set)
- [x] For custom input, newline isn't supported yet. It should be supported.
- [x] there should be a npx based installer which set up proper aliases so that users can just run 'auq' to start the tool. (bun add -g @paulp-o/auq)
- [x] add proper way to setup this MCP server connectable to a MCP client like Claude Desktop or Cursor; make it so that it can be added through Claude Code. for example:

```json
{
  "mcpServers": {
    "ask-user-questions": {
      "type": "stdio",
      "command": "node",
      "args": ["dist/src/server.js"]
    }
  }
}
```

- [x] Add a guide in readme about how to set up this MCP server, AND how to use the auq command.

---

# Phase 2: TUI Style Redesign 🎨

## Foundation Tasks

- [ ] **Task 1**: Setup gradient text package (install gradient-string + chalk, create utils/gradientText.ts)
- [ ] **Task 5**: Remove vertical spacing between options (change marginTop in OptionsList.tsx)

## Visual Enhancement Tasks

- [ ] **Task 2**: Add gradient welcome/goodbye messages (WaitingScreen.tsx, auq.tsx)
- [ ] **Task 3**: Add emojis to key screens (⏳ WaitingScreen, 📋 ReviewScreen, ⚙️ settings)
- [ ] **Task 6**: Add border to WaitingScreen (wrap in bordered Box)
- [ ] **Task 7**: Increase bold text usage (headers, labels, question numbers)

## Layout Change Task

- [ ] **Task 4**: Update MCQ layout - show description on newline with indent (OptionsList.tsx)

---

### Implementation Notes

- **Gradient theme**: Only for decorative elements (logo, welcome/goodbye), NOT everywhere
- **Borders**: Minimal approach - add to WaitingScreen only, keep clean modern look
- **Emojis**: ⏳/🤖 for waiting, 📋 for review, ⚙️ for settings
- **MCQ layout**: Compact format with indented description below label
