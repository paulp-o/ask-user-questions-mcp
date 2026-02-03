# Change: Add Elaboration Input Box to Request Elaboration Option

## Why

Currently, the "Request Elaboration" option only allows users to mark a question for elaboration without providing guidance on _how_ they want it elaborated. Users need a way to provide custom instructions to the AI about what kind of elaboration they want (e.g., "focus on cost implications" or "provide more technical details").

## What Changes

- Add an inline multi-line text input box below the "Request Elaboration" option (similar to how "Other (custom)" works)
- Input appears when user presses Enter on the elaborate option
- Tab key submits the elaboration and advances to the next question
- Enter key inserts newlines (multi-line support)
- Arrow keys (left/right) move cursor within text when input is focused
- Escape closes the input box without losing typed text
- Show preview of explanation text when elaborate option is not focused but has text
- Include user's guidance in the AI response format: `[ELABORATE_REQUEST]...\nUser guidance: "[text]"`
- Add i18n support for the new placeholder text

## Impact

- Affected specs: `tui-application` (Elaborate Request requirement)
- Affected code:
  - `src/tui/components/OptionsList.tsx` - Add input box rendering and state
  - `src/tui/components/Footer.tsx` - Handle new focus context for elaborate input
  - `src/tui/components/ReviewScreen.tsx` - Display elaboration text
  - `src/session/ResponseFormatter.ts` - Include user guidance in elaborate format
  - `src/i18n/locales/en.ts` and `ko.ts` - Add new placeholder text
