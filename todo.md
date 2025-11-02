- 'tab' key isn't supposed to be used for switching to custom input; it navigates to the next
  problem! custom input choice is navigated just like MCQs, with up/down arrows. 
- after 'Answers submitted successfully!' message, it should show the next queued question or go back to the waiting screen.
- 'enter' key not only selects the option, but also navigates to the next question.
- remove the review screen by pressing 'r' key. Instead, just show it when user finishes answering all questions.
- make 'esc' key to reject the question set (session) - this is to reject answering the question set or when the user knows that an outdated question set is being asked. (confirm the user if they're sure they want to reject the question set)
- For custom input, newline isn't supported yet. It should be supported.
- there should be a npx based installer which set up proper aliases so that users can just run 'auq' to start the tool. (npm install -g @paulp-o/auq)
- add proper way to setup this MCP server connectable to a MCP client like Claude Desktop or Cursor; make it so that it can be added through Claude Code. for example, 
```
{
  "mcpServers": {
    "ask-user-questions": {
      "type": "stdio",
      "command": "npx",
      // "args": ? <- this part must be filled
    }
  }
}
```

Add a guide in readme about how to set up this MCP server, AND how to use the auq command.
--- add v2 ---
# TUI style redesign
- make the color theme more vibrant and modern - use cyan-purple gradient theme for important texts.
- more aggressive usage of bold text for headers and important texts.
- for the multiple choices, remove the vertical blank spacing between the options.
- put the question/MCQ view in a rectangular box with a border.
- put most of the viewers in a rectangular box with a border. (e.g. the question/MCQ view, the options list, the custom input view, the review screen, the waiting screen, the toast messages, etc.)
- use more emojis for the UI.
- when showng MCQs and their description, show description in the newline. so that the multiple choice's title would show in bold text and the description would show in normal text, in the next line.
