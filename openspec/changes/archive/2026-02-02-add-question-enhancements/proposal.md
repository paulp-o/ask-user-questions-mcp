# Change: Add Question Enhancement Features

## Why

Users need more interactive ways to handle questions from AI assistants. Currently, if a question is unclear or poorly phrased, users can only answer it as-is or reject the entire question set. This change adds per-question actions (elaborate, rephrase) and automatic handling of recommended options to improve the user experience.

## What Changes

- **Elaborate Request**: Users can press `E` to request AI to elaborate on the current question with more detailed options
- **Rephrase Request**: Users can press `D` to request AI to rephrase the current question in a different way
- **Recommended Auto-Select**: Options marked with `(recommended)`, `(Recommended)`, `[recommended]`, `(추천)`, or `[추천]` are automatically pre-selected and visually highlighted
- **Quick Submit**: Users can press `Ctrl+Enter` to submit all questions with their recommended options selected

## Impact

- Affected specs: `tui-application`
- Affected code:
  - `src/tui/components/StepperView.tsx` - New keyboard handlers
  - `src/tui/components/OptionsList.tsx` - Recommended detection and pre-selection
  - `src/tui/components/QuestionDisplay.tsx` - New action buttons/hints
  - `src/tui/components/Footer.tsx` - New keybindings display
  - `src/session/ResponseFormatter.ts` - New response formats for elaborate/rephrase
