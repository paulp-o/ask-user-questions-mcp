## 1. E Key Elaborate Enhancement

- [x] 1.1 Add `elaborateMarks` state to StepperView (Map<questionIndex, customExplanation>)
- [x] 1.2 Modify E key handler to toggle elaborate mark instead of immediate submission
- [x] 1.3 Create elaborate explanation input UI (inline text input after E key press)
- [x] 1.4 Add visual indicator for elaboration-marked questions in TabBar
- [x] 1.5 Update ResponseFormatter to include elaborate requests with custom explanations
- [x] 1.6 Update ReviewScreen to show elaboration marks with explanations
- [x] 1.7 Add i18n strings for elaborate UI elements

## 2. Recommended Selection Shortcuts

- [x] 2.1 Add `autoSelectRecommended` config option to config types and defaults
- [x] 2.2 Implement R key handler in StepperView to select recommended for current question
- [x] 2.3 Implement Ctrl+R handler to select recommended for all questions and go to review
- [x] 2.4 Conditionally apply auto-select on mount based on config setting
- [x] 2.5 Update Footer to show R and Ctrl+R keybindings when applicable
- [x] 2.6 Add i18n strings for new keybindings

## 3. Navigation Focus Reset

- [x] 3.1 Add `resetFocusToFirst` callback prop to OptionsList
- [x] 3.2 Call focus reset when `currentQuestionIndex` changes in StepperView
- [x] 3.3 Reset `focusedIndex` to 0 in OptionsList when question changes

## 4. Testing & Validation

- [ ] 4.1 Manual test E key elaborate flow with custom explanation
- [ ] 4.2 Manual test R key and Ctrl+R shortcuts
- [ ] 4.3 Manual test navigation focus reset behavior
- [ ] 4.4 Verify Footer displays correct keybindings in all contexts
- [x] 4.5 Run existing test suite to ensure no regressions
