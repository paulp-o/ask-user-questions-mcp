# Tasks: Add Elaboration Input Box

## 1. i18n Setup

- [x] 1.1 Add `input.elaboratePlaceholder` key to `src/i18n/locales/en.ts` with value "Tell the AI what you need..."
- [x] 1.2 Add `input.elaboratePlaceholder` key to `src/i18n/locales/ko.ts` with Korean translation

## 2. OptionsList Component Updates

- [x] 2.1 Add state tracking for elaborate input visibility: `isElaborateInputVisible`
- [x] 2.2 Modify Enter key handler on elaborate option to toggle input visibility instead of immediately selecting
- [x] 2.3 Add `MultiLineTextInput` component below elaborate option (similar to custom input pattern)
- [x] 2.4 Configure input placeholder to use `t("input.elaboratePlaceholder")`
- [x] 2.5 Handle Tab key in elaborate input to submit and trigger `onAdvance`
- [x] 2.6 Handle Escape key to close input and return focus to elaborate option
- [x] 2.7 Handle left/right arrows as cursor movement when elaborate input is focused
- [x] 2.8 Add preview text display when elaborate option is not focused but has explanation text

## 3. Focus Context Updates

- [x] 3.1 Add new focus context type `"elaborate-input"` or reuse `"custom-input"` context
- [x] 3.2 Emit correct focus context when elaborate input is focused
- [x] 3.3 Update Footer component to show appropriate keybindings for elaborate input focus

## 4. Response Formatter Updates

- [x] 4.1 Modify `formatElaborateRequest()` in `ResponseFormatter.ts` to include user guidance
- [x] 4.2 Format should be: `[ELABORATE_REQUEST]...\nUser guidance: "[text]"` when text is provided
- [x] 4.3 Keep existing format when no guidance text is provided (empty string)

## 5. Review Screen Updates

- [x] 5.1 Update ReviewScreen to display elaboration text: `Marked for elaboration: "[explanation text]"`
- [x] 5.2 Handle case where elaborate is marked but no text is provided (show just "Marked for elaboration")

## 6. Testing & Validation

- [ ] 6.1 Manual test: Enter on elaborate shows input, Tab submits and advances
- [ ] 6.2 Manual test: Escape closes input without losing text
- [ ] 6.3 Manual test: Arrow keys move cursor in elaborate input
- [ ] 6.4 Manual test: Preview shows when navigating away and back
- [ ] 6.5 Manual test: Review screen shows elaboration text
- [x] 6.6 Run `bun run lint` and `bun run typecheck`
- [x] 6.7 Run `bun run test`
