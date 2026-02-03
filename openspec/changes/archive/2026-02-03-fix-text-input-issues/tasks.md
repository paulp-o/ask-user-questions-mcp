## 1. Input Handling Fixes (MultiLineTextInput)

- [x] 1.1 Audit current cursor position management in MultiLineTextInput.tsx
- [x] 1.2 Fix spacebar input to insert at cursor position (not behind cursor)
- [x] 1.3 Implement Delete key handler (delete character after cursor)
- [x] 1.4 Fix Backspace key to work correctly with cursor position
- [x] 1.5 Implement paste event detection (multiple characters in rapid succession or single input > 1 char)
- [x] 1.6 After paste, move cursor to end of pasted content
- [x] 1.7 Apply same fixes to SingleLineTextInput.tsx if applicable

## 2. CJK Background Color Rendering

- [x] 2.1 Create utility function `getVisualWidth(text: string): number` using string-width
- [x] 2.2 Create utility function `padToVisualWidth(text: string, targetWidth: number): string`
- [x] 2.3 Update OptionsList.tsx `fitRow` function to use visual width calculation
- [x] 2.4 Update OptionsList.tsx option rendering to account for CJK character widths
- [x] 2.5 Update TabBar.tsx tab rendering to use visual width for backgrounds
- [x] 2.6 Update Toast.tsx to use visual width for pill backgrounds — N/A (uses border, not backgroundColor)
- [x] 2.7 Update Header.tsx pill rendering to use visual width
- [x] 2.8 Audit all other components using backgroundColor with dynamic text

## 3. Cursor Position Calculation

- [x] 3.1 Create utility function `visualPositionToCharIndex(text: string, visualPos: number): number`
- [x] 3.2 Create utility function `charIndexToVisualPosition(text: string, charIndex: number): number`
- [x] 3.3 Update MultiLineTextInput cursor rendering to use visual positions
- [x] 3.4 Update cursor movement (left/right arrow) to account for CJK character widths
- [x] 3.5 Update text insertion to maintain correct visual cursor position

## 4. Testing & Validation

- [ ] 4.1 Manual test: Type Korean text, verify cursor moves correctly
- [ ] 4.2 Manual test: Press spacebar in middle of text, verify space appears at cursor
- [ ] 4.3 Manual test: Press Delete key, verify character after cursor is deleted
- [ ] 4.4 Manual test: Paste text, verify cursor moves to end of pasted content
- [ ] 4.5 Manual test: Select option with Korean label, verify background color covers full text
- [ ] 4.6 Manual test: Mixed English + Korean text with background color
- [x] 4.7 Run existing test suite to ensure no regressions — 284 passed, 1 skipped
- [ ] 4.8 Test across different terminal emulators (iTerm2, Terminal.app, Windows Terminal)

## 5. Documentation

- [x] 5.1 Add code comments explaining CJK width handling — Added in visualWidth.ts
- [ ] 5.2 Document known limitations if any remain
