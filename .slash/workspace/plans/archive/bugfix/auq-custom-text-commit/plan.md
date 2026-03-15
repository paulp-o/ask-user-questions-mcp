---
created: 2026-03-15T00:00:00Z
last_updated: 2026-03-15T00:00:00Z
type: bugfix
plan_number: 1
status: done
trigger: "Custom/elaborate text not committed on Tab/Enter advance"
depends_on: none
next: TBD
---

# Plan: Fix custom/elaborate text not committed on Tab/Enter

## Background & Research

### Bug Summary

When user types in custom ("Other") or elaborate text input, then presses Tab/Enter to advance to the next question, the typed text is NOT saved as an answer. However, pressing up/down arrow keys DOES save it. The user's insight: the onChange keystroke event should be enough to commit the answer.

### Root Cause Analysis

The answer IS being saved correctly on every keystroke via `handleChangeCustomAnswer`/`handleElaborateTextChange`. The real problem is in the **ink renderer's StepperView** Tab handling:

**In `src/tui/components/StepperView.tsx` lines 609-619 — the main navigation useInput:**

```tsx
// Tab/Shift+Tab: Global question navigation
if (key.tab && !isInTextInput) {
  if (key.shift) {
    setCurrentQuestionIndex((prev) => Math.max(0, prev - 1));
  } else {
    setCurrentQuestionIndex((prev) =>
      Math.min(sessionRequest.questions.length - 1, prev + 1),
    );
  }
  return;
}
```

The guard `!isInTextInput` means **Tab in text input mode is NOT handled by StepperView**. Instead it falls through to `MultiLineTextInput` which calls `onSubmit` → `onAdvance` → `handleAdvanceToNext`.

**In `src/tui/components/StepperView.tsx` lines 399-407 — handleAdvanceToNext:**

```tsx
const handleAdvanceToNext = () => {
  if (currentQuestionIndex < sessionRequest.questions.length - 1) {
    setCurrentQuestionIndex((prev) => prev + 1);
  } else {
    setShowReview(true);
  }
};
```

**In `src/tui/components/MultiLineTextInput.tsx` — Tab and Enter:**

```tsx
// Tab: Submit (also triggers question navigation via parent)
if (key.tab && !key.shift) {
  onSubmit?.(); // → onAdvance → handleAdvanceToNext
  return;
}
// ...
// Enter (without Shift): Submit/advance
onSubmit?.();
```

**In `src/tui/components/OptionsList.tsx` lines 401-407 — custom input rendering:**

```tsx
<MultiLineTextInput
  isFocused={true}
  onChange={onCustomChange}
  onSubmit={onAdvance} // Tab/Enter → handleAdvanceToNext
  placeholder={t("input.placeholder")}
  value={customValue}
/>
```

**In `src/tui/components/StepperView.tsx` lines 197-209 — handleChangeCustomAnswer:**

```tsx
const handleChangeCustomAnswer = (text: string) => {
  setAnswers((prev) => {
    const newAnswers = new Map(prev);
    const existing = newAnswers.get(currentQuestionIndex) || {};
    const question = sessionRequest.questions[currentQuestionIndex];
    newAnswers.set(currentQuestionIndex, {
      ...existing,
      customText: text,
      ...(text.trim().length > 0 && !question?.multiSelect
        ? { selectedOption: undefined }
        : {}),
    });
    return newAnswers;
  });
};
```

### The Actual Bug

The `handleChangeCustomAnswer` and `handleElaborateTextChange` functions DO correctly call `setAnswers`/`setElaborateMarks` on each keystroke. The state IS updated. So why does the answer "disappear"?

**The issue is a React state batching / stale closure problem:**

1. `MultiLineTextInput.useInput` uses `valueRef.current` (a ref) for the current value
2. When Tab/Enter is pressed, `onSubmit()` fires (which is `onAdvance` → `handleAdvanceToNext`)
3. `handleAdvanceToNext` calls `setCurrentQuestionIndex(prev => prev + 1)`
4. This triggers re-render with the new question index
5. BUT the `handleChangeCustomAnswer` captured `currentQuestionIndex` in its closure — it always writes to the CURRENT question index at the time of the keystroke
6. The actual problem: When `currentQuestionIndex` changes, the `currentAnswer` derivation (`answers.get(currentQuestionIndex)`) shows the NEW question's answer, not the old one

**Wait — the onChange fires BEFORE onSubmit in the same keystroke? No!**
For Tab/Enter, `MultiLineTextInput` calls `onSubmit()` directly WITHOUT calling `onChange()` first. The last character typed IS already saved via previous onChange calls. The issue is different:

**The REAL issue is in the opentui renderer's OptionsList key handler:**

**In `src/tui-opentui/components/OptionsList.tsx` lines 163-183:**

```tsx
if (isCustomInputFocused) {
  if (key.name === "escape") {
    setFocusedIndex(Math.max(0, options.length - 1));
  } else if (key.name === "tab" && !key.shift) {
    onAdvance?.(); // Advances WITHOUT ensuring answer is committed
  } else if (key.name === "return") {
    key.preventDefault();
    if (key.shift) {
      onCustomChange?.(customValue + "\n");
    } else {
      onAdvance?.(); // Advances WITHOUT ensuring answer is committed
    }
  }
  return; // <-- returns early, prevents any other handling
}
```

In the **opentui** version, `key.preventDefault()` on Enter prevents the native `<input>` onChange from firing. Then `onAdvance()` is called directly. The `<input>` component's onChange might have already captured the text via native input events, but the key handler intercepts Enter BEFORE the final onChange can fire for that keystroke.

**For the ink version:** The flow through MultiLineTextInput is: Tab/Enter → `onSubmit()` → `onAdvance()` → `handleAdvanceToNext()`. The text IS already saved via previous keystrokes' onChange. So ink should actually work correctly.

**The bug likely manifests primarily in the opentui renderer**, where `key.preventDefault()` on Enter can race with the native `<input>` onChange event. But the user reports it in both.

### Defensive Fix Strategy

Rather than trying to fix the race condition at the event level, the safest fix is: **when advancing via onAdvance/handleAdvanceToNext, ensure the current custom text and elaborate text are explicitly committed to the answers map BEFORE changing the question index.**

This means `handleAdvanceToNext` should flush any pending text input state before navigating.

### Key Files to Modify

- `src/tui/components/StepperView.tsx` — ink version handleAdvanceToNext
- `src/tui-opentui/components/StepperView.tsx` — opentui version handleAdvanceToNext
- `src/tui/components/__tests__/StepperView.state.test.tsx` — regression tests

### Test Pattern (from existing tests)

```tsx
const mockThemeValue = {
  theme: darkTheme,
  themeName: "AUQ dark" as const,
  cycleTheme: () => {},
};
function renderStepper(props = {}) {
  return render(
    <ThemeContext.Provider value={mockThemeValue}>
      <ConfigProvider>
        <StepperView sessionId={...} sessionRequest={...} {...props} />
      </ConfigProvider>
    </ThemeContext.Provider>,
  );
}
function getOutput(frame) {
  return (frame ?? "").replace(/\x1b\[[0-9;]*m/g, "").replace(/\r/g, "");
}
// Answer verification:
const [, snapshotState] = onStateSnapshot.mock.lastCall;
expect(snapshotState.answers.get(0)?.customText).toBe("my answer");
```

## Testing Plan (TDD - tests first)

- [x] Add test in `src/tui/components/__tests__/StepperView.state.test.tsx`: "custom text is preserved when advancing via Tab" — type custom text via stdin, press Tab, verify `onStateSnapshot` contains the customText for the previous question
- [x] Add test in `src/tui/components/__tests__/StepperView.state.test.tsx`: "elaborate text is preserved when advancing via Tab" — enter elaborate mode, type text via stdin, press Tab, verify `onStateSnapshot` contains the elaborate mark text for the previous question
- [x] Add test: "custom text is preserved when advancing via Enter" — same as above but with Enter key

## Implementation Plan

### Fix: Make onAdvance callbacks explicitly commit current text state

The cleanest fix is to change the `onAdvance` callback passed to OptionsList to include a "flush" step that explicitly re-commits the current custom/elaborate text value from the OptionsList props before navigating.

**Approach: Wrap handleAdvanceToNext to flush text state**

- [x] In `src/tui/components/StepperView.tsx`: Create `handleAdvanceToNextWithFlush` that wraps `handleAdvanceToNext`. Before calling it, explicitly call `handleChangeCustomAnswer(currentCustomText)` and `handleElaborateTextChange(currentElaborateText)` to ensure the latest text is committed to the answers Map. Pass this wrapper as `onAdvanceToNext` to QuestionDisplay instead of the raw `handleAdvanceToNext`.

  The problem with this approach: StepperView doesn't have direct access to the current custom text value from the input component. It passes `currentAnswer?.customText` down as a prop and receives changes via `handleChangeCustomAnswer`. So the text SHOULD already be in the answers Map.

  **Better approach: The issue might be that `onAdvance` is called via `onSubmit` from MultiLineTextInput or OptionsList key handler, and this call to `handleAdvanceToNext` → `setCurrentQuestionIndex` causes a re-render. Since `handleChangeCustomAnswer` was already called on every keystroke, the answer should be in the Map. Let's verify by checking if the answer persists across question switches.**

  **Actually, looking more carefully at the opentui OptionsList key handler (lines 163-183), when Enter is pressed with `key.preventDefault()`, the native `<input>` onChange is blocked. If the user typed a character and IMMEDIATELY pressed Enter (before the native input event cycle completes), the last character's onChange may not have fired yet.**

  **Fix for opentui OptionsList:** Before calling `onAdvance()` on Tab/Enter, explicitly call `onCustomChange?.(customValue)` / `onElaborateTextChange?.(elaborateText)` to flush the current value.

- [x] In `src/tui-opentui/components/OptionsList.tsx` lines 163-183: Before each `onAdvance?.()` call in the custom input focused block, add `onCustomChange?.(customValue)` to ensure text is flushed
- [x] In `src/tui-opentui/components/OptionsList.tsx` lines 187-210: Before each `onAdvance?.()` call in the elaborate input focused block, add `onElaborateTextChange?.(elaborateText)` to ensure text is flushed
- [x] In `src/tui/components/OptionsList.tsx` lines 401-407: The ink version passes `onSubmit={onAdvance}` to MultiLineTextInput. Change to `onSubmit={() => { onCustomChange?.(customValue); onAdvance?.(); }}` to flush before advancing
- [x] In `src/tui/components/OptionsList.tsx` lines 471-486: Same for elaborate — change onSubmit to flush `onElaborateTextChange?.(elaborateText)` before calling `onAdvance?.()`
- [x] In `src/tui-opentui/components/StepperView.tsx`: Apply same pattern as ink version if needed (mirror changes)
- [x] Run `npx vitest run` to verify all tests pass
- [x] Run `bun run build` to verify build succeeds

## Parallelization Plan

### Batch 1 (parallel)

- [x] Programmer A: Write regression tests → files: `src/tui/components/__tests__/StepperView.state.test.tsx`
- [x] Programmer B: Fix ink OptionsList flush-before-advance → files: `src/tui/components/OptionsList.tsx`
- [x] Programmer C: Fix opentui OptionsList flush-before-advance → files: `src/tui-opentui/components/OptionsList.tsx`

### Batch 2 (after Batch 1)

- [x] Programmer D: Run full test suite + build → no file changes

### Dependencies

Tests in Batch 1 are written against the CURRENT (broken) behavior to confirm the bug exists, then in Batch 2 we verify they pass with the fix. Actually, since programmers B and C fix the code in parallel with test writing, the tests should pass when all Batch 1 work merges.

### Risk Areas

- The flush call `onCustomChange?.(customValue)` is a no-op if the value hasn't changed (React state batching will skip the re-render). This is safe.
- Ensure the flush calls don't introduce double-advance or other side effects.
- The elaborate onSubmit handler has logic for toggling elaborate mark when text is empty — ensure the flush doesn't interfere.

## Done Criteria

- [x] All existing tests pass (`npx vitest run`)
- [x] New regression tests pass for custom text + Tab/Enter advancement
- [x] Build succeeds (`bun run build`)
- [x] Manual verification: type in custom input → Tab → answer preserved
