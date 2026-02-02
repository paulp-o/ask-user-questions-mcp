# Tasks: Add Question Enhancement Features

## 1. Recommended Option Detection & Pre-Selection

- [ ] 1.1 Create utility function to detect recommended patterns in option labels
  - Case-insensitive matching for: `(recommended)`, `[recommended]`, `(추천)`, `[추천]`
  - Return boolean and optionally extract clean label without marker
- [ ] 1.2 Update `OptionsList.tsx` to auto-select recommended options on mount
  - Pre-select first matching recommended option in single-select mode
  - Pre-select all matching recommended options in multi-select mode
- [ ] 1.3 Add visual highlighting for recommended options
  - Different color/style for recommended badge
  - Star or badge icon next to recommended options
- [ ] 1.4 Write unit tests for recommended detection utility

## 2. Quick Submit with Recommended Options

- [ ] 2.1 Add `Ctrl+Enter` keyboard handler in `StepperView.tsx`
  - Detect if any questions have unanswered + recommended available
  - Auto-fill all unanswered questions with their recommended options
  - Navigate directly to review screen
- [ ] 2.2 Update `Footer.tsx` to show `Ctrl+Enter Quick Submit` hint
- [ ] 2.3 Write integration test for quick submit flow

## 3. Elaborate Request Feature

- [ ] 3.1 Add `E` key handler in `StepperView.tsx`
  - Capture current question context (index, title, prompt)
  - Set session status to indicate elaborate request
- [ ] 3.2 Create elaborate response format in `ResponseFormatter.ts`
  - Format: `[ELABORATE_REQUEST] Please elaborate on question '{title}' ({prompt}) with more detailed options`
- [ ] 3.3 Update session status types to include `elaborate_requested`
- [ ] 3.4 Update `Footer.tsx` to show `E Elaborate` hint
- [ ] 3.5 Write tests for elaborate response formatting

## 4. Rephrase Request Feature

- [ ] 4.1 Add `D` key handler in `StepperView.tsx`
  - Capture current question context
  - Optionally prompt for brief reason
  - Set session status to indicate rephrase request
- [ ] 4.2 Create rephrase response format in `ResponseFormatter.ts`
  - Format: `[REPHRASE_REQUEST] Please rephrase question '{title}' in a different way`
- [ ] 4.3 Update session status types to include `rephrase_requested`
- [ ] 4.4 Update `Footer.tsx` to show `D Rephrase` hint
- [ ] 4.5 Write tests for rephrase response formatting

## 5. Documentation & Validation

- [ ] 5.1 Update CLI help text with new keyboard shortcuts
- [ ] 5.2 Update README with new features
- [ ] 5.3 Run full test suite and fix any failures
- [ ] 5.4 Manual testing of all new interactions
