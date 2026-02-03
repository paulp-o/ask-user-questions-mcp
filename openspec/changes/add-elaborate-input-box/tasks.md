# Tasks: Add Elaboration Input Box

## 1. i18n Setup

- [ ] 1.1 Add `input.elaboratePlaceholder` key to `src/i18n/locales/en.ts` with value "Tell the AI what you need..."
- [ ] 1.2 Add `input.elaboratePlaceholder` key to `src/i18n/locales/ko.ts` with Korean translation

## 2. OptionsList Component Updates

- [ ] 2.1 Add state tracking for elaborate input visibility: `isElaborateInputVisible`
- [ ] 2.2 Modify Enter key handler on elaborate option to toggle input visibility instead of immediately selecting
- [ ] 2.3 Add `MultiLineTextInput` component below elaborate option (similar to custom input pattern)
- [ ] 2.4 Configure input placeholder to use `t("input.elaboratePlaceholder")`
- [ ] 2.5 Handle Tab key in elaborate input to submit and trigger `onAdvance`
- [ ] 2.6 Handle Escape key to close input and return focus to elaborate option
- [ ] 2.7 Handle left/right arrows as cursor movement when elaborate input is focused
- [ ] 2.8 Add preview text display when elaborate option is not focused but has explanation text

## 3. Focus Context Updates

- [ ] 3.1 Add new focus context type `"elaborate-input"` or reuse `"custom-input"` context
- [ ] 3.2 Emit correct focus context when elaborate input is focused
- [ ] 3.3 Update Footer component to show appropriate keybindings for elaborate input focus

## 4. Response Formatter Updates

- [ ] 4.1 Modify `formatElaborateRequest()` in `ResponseFormatter.ts` to include user guidance
- [ ] 4.2 Format should be: `[ELABORATE_REQUEST]...\nUser guidance: "[text]"` when text is provided
- [ ] 4.3 Keep existing format when no guidance text is provided (empty string)

## 5. Review Screen Updates

- [ ] 5.1 Update ReviewScreen to display elaboration text: `Marked for elaboration: "[explanation text]"`
- [ ] 5.2 Handle case where elaborate is marked but no text is provided (show just "Marked for elaboration")

## 6. Testing & Validation

- [ ] 6.1 Manual test: Enter on elaborate shows input, Tab submits and advances
- [ ] 6.2 Manual test: Escape closes input without losing text
- [ ] 6.3 Manual test: Arrow keys move cursor in elaborate input
- [ ] 6.4 Manual test: Preview shows when navigating away and back
- [ ] 6.5 Manual test: Review screen shows elaboration text
- [ ] 6.6 Run `bun run lint` and `bun run typecheck`
- [ ] 6.7 Run `bun run test`
