# Change: Update Keyboard Shortcuts and Navigation

## Why

The current keyboard shortcuts have limited functionality and navigation behaviors are not intuitive:

- E key elaborate immediately submits the session, preventing users from answering other questions
- No way to quickly select recommended options via keyboard (R key)
- Question navigation doesn't reset focus to first item, causing disorientation

## What Changes

- **E key Elaborate Enhancement**: Instead of immediately submitting, E key marks the question for elaboration with optional custom explanation text. Users can continue answering other questions, and elaboration requests are included in final submission.
- **R key Recommended Selection**: R key selects all recommended options for the current question
- **Ctrl+R Quick Submit**: Ctrl+R selects recommended options for ALL questions and navigates to review screen
- **Auto-select Toggle**: Config option to enable/disable automatic recommended option selection on question mount
- **Navigation Focus Reset**: When navigating between questions (←→, Tab), cursor resets to first option

## Impact

- Affected specs: `tui-application`
- Affected code:
  - `src/tui/components/StepperView.tsx` - keyboard handling, elaborate state management
  - `src/tui/components/OptionsList.tsx` - focus reset, R key handling
  - `src/tui/components/Footer.tsx` - new keybinding display
  - `src/config/types.ts` - auto-select config option
  - `src/session/ResponseFormatter.ts` - elaborate request formatting with custom text
