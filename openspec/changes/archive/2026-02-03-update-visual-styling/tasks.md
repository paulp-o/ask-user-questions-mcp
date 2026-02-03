## 1. Unanswered Red Highlighting

- [x] 1.1 Add `unansweredHighlight` color token to Theme interface (red-family color)
- [x] 1.2 Update dark theme with appropriate red highlight color (e.g., #FF6B6B or similar)
- [x] 1.3 Update light theme with appropriate red highlight color (darker for light bg)
- [x] 1.4 Update all other themes (nord, dracula, catppuccin, solarized, gruvbox, tokyo-night, one-dark, monokai, github, rose-pine) with consistent red variants
- [x] 1.5 Update TabBar to use `unansweredHighlight` instead of dim gray for unanswered questions
- [x] 1.6 Update ReviewScreen to use `unansweredHighlight` for "Unanswered" text (remove dimColor)

## 2. Success Message Pill Styling

- [x] 2.1 Add `successPillBg` component token to Theme interface (bg color)
- [x] 2.2 Update Toast component to support pill variant (no border, background color)
- [x] 2.3 Center-align success toast in parent container
- [x] 2.4 Remove `borderStyle` and `borderColor` from Toast when displaying as pill
- [x] 2.5 Update all themes with appropriate pill background colors

## 3. i18n Completion (User-Added Scope)

- [x] 3.1 Add new i18n keys to en.ts (footer.cursor, stepper._, input._, question.\*, review.markedForElaboration, waiting.processing/queueCount, ui.themeLabel, confirmation.rejectYes/rejectNo/keybindings)
- [x] 3.2 Add Korean translations to ko.ts for all new keys
- [x] 3.3 Update i18n/types.ts with new interfaces (StepperTranslations, InputTranslations, QuestionTranslations, UiTranslations)
- [x] 3.4 Update StepperView.tsx with i18n (submitting, elaborateTitle, elaboratePrompt, elaborateHint)
- [x] 3.5 Update ConfirmationDialog.tsx with i18n (rejectYes, rejectNo, keybindings)
- [x] 3.6 Update CustomInput.tsx with i18n (customAnswerLabel, customAnswerHint)
- [x] 3.7 Update OptionsList.tsx with i18n (otherCustom, placeholder)
- [x] 3.8 Update Footer.tsx with i18n (cursor)
- [x] 3.9 Update QuestionDisplay.tsx with i18n (multipleChoice, singleChoice)
- [x] 3.10 Update WaitingScreen.tsx with i18n (processing, queueCount)
- [x] 3.11 Update SingleLineTextInput.tsx with i18n (singleLinePlaceholder)
- [x] 3.12 Update MultiLineTextInput.tsx with i18n (multiLinePlaceholder)
- [x] 3.13 Update ThemeIndicator.tsx with i18n (themeLabel)
- [x] 3.14 Update ReviewScreen.tsx with i18n (markedForElaboration)

## 4. Testing & Validation

- [x] 4.1 Run TypeScript build - passed
- [x] 4.2 Run existing test suite to ensure no regressions - 284 tests passed
