---
created: 2026-03-15T00:00:00Z
last_updated: 2026-03-15T00:00:00Z
type: bugfix
plan_number: 1
status: done
trigger: "User reported two bugs: (1) notifications disappeared, (2) multi-question answer shifting when using custom text/Other"
depends_on: none
next: TBD
---

# Plan: Fix AUQ Notification Loss & Multi-Question Answer Shifting

## Background & Research

### Bug 1: Notifications lost on unmount

The TUI app cancels pending notifications on unmount instead of flushing them.

- File: `bin/tui-app.tsx` lines 207-217 (cleanup logic):

  ```tsx
  // Cleanup: stop watcher and cancel notifications on unmount
  return () => {
    if (watcherInstance) {
      watcherInstance.stop();
    }
    if (notificationBatcherRef.current) {
      notificationBatcherRef.current.cancel(); // ← BUG: discards pending notifications
    }
    // Clear progress bar on unmount
    clearProgress(notificationConfig);
  };
  ```

- File: `src/tui/notifications/batch.ts` — `flush()` vs `cancel()` implementations:

  ```ts
  // flush() sends pending notifications immediately
  function flush(): NotificationResult | null {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
    return sendBatchedNotification(); // ← sends the batch
  }

  // cancel() discards everything
  function cancel(): void {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
    pendingEvents = []; // ← silently drops pending notifications
  }
  ```

**Fix**: Change `cancel()` → `flush()` at line 213 of `bin/tui-app.tsx`.

### Bug 2: Answer shifting between questions

When the user types custom text on Q1, the `answers` Map updates, triggering the state snapshot effect.
The snapshot updates `sessionUIStates` in `tui-app.tsx` via `handleStateSnapshot`, which changes the `initialState` prop passed to StepperView.
The session reset `useEffect` depends on `[initialState, sessionId, sessionRequest.questions]` — so when `initialState` changes for the SAME session, the entire stepper state is re-hydrated from the (now stale) snapshot, causing answer loss and shifting.

- File: `src/tui/components/StepperView.tsx` lines 231-273 (session reset effect — NO guard):

  ```tsx
  // Reset internal stepper state when the session changes (safety in case component isn't remounted)
  useEffect(() => {
    const maxQuestionIndex = Math.max(0, sessionRequest.questions.length - 1);
    if (initialState) {
      // ... hydrates all state from initialState ...
      setCurrentQuestionIndex(hydratedQuestionIndex);
      setAnswers(new Map(initialState.answers));
      setElaborateMarks(new Map(initialState.elaborateMarks));
      setFocusContext(initialState.focusContext);
      // ... etc
    } else {
      // ... resets everything to defaults ...
    }
    setSubmitting(false);
    setShowRejectionConfirm(false);
    setElapsedSeconds(0);
    skipSnapshotRef.current = true;
    // ...
  }, [initialState, sessionId, sessionRequest.questions]); // ← BUG: no guard for same sessionId
  ```

- File: `src/tui-opentui/components/StepperView.tsx` lines 224-238 (CORRECT version with guard):

  ```tsx
  const sessionIdRef = useRef<string | null>(null); // line 224
  // ...
  useEffect(() => {
    // Only run full initialization when the session actually changes.
    // When a snapshot is saved (cursor movement), initialState prop changes but
    // sessionId stays the same — skip the reset to avoid resetting the timer.
    if (sessionId === sessionIdRef.current) return; // ← THIS GUARD IS MISSING in ink version
    sessionIdRef.current = sessionId;
    // ... rest of hydration logic ...
  }, [initialState, sessionId, sessionRequest.questions]);
  ```

- File: `src/tui/components/StepperView.tsx` lines 285-312 (snapshot effect):

  ```tsx
  useEffect(() => {
    if (!onStateSnapshot) return;
    if (skipSnapshotRef.current) {
      skipSnapshotRef.current = false;
      return;
    }
    onStateSnapshot(sessionId, {
      currentQuestionIndex,
      answers: new Map(answers),
      elaborateMarks: new Map(elaborateMarks),
      focusContext,
      focusedOptionIndex,
      showReview,
    });
  }, [
    answers,
    currentQuestionIndex,
    elaborateMarks,
    focusContext,
    focusedOptionIndex,
    onStateSnapshot,
    sessionId,
    showReview,
  ]);
  ```

- File: `bin/tui-app.tsx` lines 486-496 (snapshot handler updates initialState):
  ```tsx
  const handleStateSnapshot = useCallback(
    (sessionId: string, ui: SessionUIState) => {
      setSessionUIStates((prev) => ({
        ...prev,
        [sessionId]: ui, // ← this triggers initialState prop change
      }));
      setLastInteractions((prev) => new Map(prev).set(sessionId, Date.now()));
    },
    [],
  );
  ```

**Fix**: Add `sessionIdRef` and guard to the ink StepperView, matching the opentui version.

### Test patterns (existing)

- File: `src/tui/notifications/__tests__/batch.test.ts` — uses vitest, `vi.useFakeTimers()`, `vi.spyOn(notifyModule, 'sendNotification')`
- File: `src/tui/components/__tests__/StepperView.state.test.tsx` — uses `renderStepper` helper wrapping in `ThemeContext.Provider` + `ConfigProvider`, `ink-testing-library` render/cleanup
- Test runner: `vitest` (`bun test` or `vitest run`)
- Type check: `tsc --noEmit`

## Testing Plan (TDD — tests first)

### Test 1: Notification flush on unmount (file: `src/tui/notifications/__tests__/batch.test.ts`)

- [x] Add test: `"should flush (not cancel) pending notifications on cleanup"` — create batcher, queue 2 events, call `flush()`, assert `sendNotification` was called with count 2 and `getPendingCount()` is 0. This test already essentially exists (`"should immediately send pending notifications"`), so this confirms flush behavior is correct — the real fix is in tui-app.tsx.

### Test 2: Session reset guard (file: `src/tui/components/__tests__/StepperView.state.test.tsx`)

- [x] Add test: `"should NOT reset answers when initialState changes for the same sessionId"` — render StepperView with `initialState` containing answer for Q0, then re-render with a DIFFERENT `initialState` object but the SAME `sessionId`, assert the component does NOT re-hydrate (answers remain as they were in the live component state, not the new initialState)
- [x] Add test: `"should reset answers when sessionId changes"` — render StepperView with `sessionId='s1'`, input an answer, then re-render with `sessionId='s2'` and a new `initialState`, assert state IS hydrated from the new initialState

## Implementation Plan

### Fix 1: Notification flush (file: `bin/tui-app.tsx`)

- [x] At line 213 (`notificationBatcherRef.current.cancel()`), change `.cancel()` to `.flush()` — this ensures pending notifications are sent immediately on unmount instead of being silently discarded

### Fix 2: Session reset guard (file: `src/tui/components/StepperView.tsx`)

- [x] Add `const sessionIdRef = useRef<string | null>(null);` after the existing `skipSnapshotRef` declaration (near line 223)
- [x] At the beginning of the session reset `useEffect` (line 232, inside the callback), add the guard: `if (sessionId === sessionIdRef.current) return;` followed by `sessionIdRef.current = sessionId;` — this prevents re-hydration when only `initialState` changes but `sessionId` stays the same

### Verification

- [x] Run `bun test` — all tests pass (existing + new)
- [x] Run `bun run build` — build succeeds with no errors
- [x] Manual check: confirm the `useRef` import already exists in StepperView.tsx (it should, since `isMountedRef` and `skipSnapshotRef` already use it)

## Parallelization Plan

### Batch 1 (parallel — independent files)

- [x] Programmer A: Write new tests → files: `src/tui/components/__tests__/StepperView.state.test.tsx`
- [x] Programmer B: Fix notification flush → files: `bin/tui-app.tsx`

### Batch 2 (after Batch 1 — needs tests to exist first)

- [x] Programmer C: Add sessionIdRef guard → files: `src/tui/components/StepperView.tsx`

### Batch 3 (after Batch 2 — verification)

- [x] Run `bun test` and `bun run build`

### Dependencies

- Batch 1 tasks are independent (different files)
- Batch 2 (StepperView fix) should run after Batch 1 tests are written so the new tests can catch regressions
- Batch 3 is verification after all code changes

### Risk Areas

- The `initialState` is still in the `useEffect` dependency array even with the guard — React will still call the effect, but the guard early-returns. This matches the opentui version which is known to work correctly.
- The `skipSnapshotRef.current = true` at the end of the session reset effect prevents a snapshot-triggered loop: setting state → snapshot → initialState change → re-hydrate. With the guard, the loop is broken earlier (before state is set), which is even safer.
- The flush-on-unmount change means notifications will always be delivered even if the TUI exits quickly. This is the desired behavior per user feedback.

## Done Criteria

- [x] `bin/tui-app.tsx` line 213: `cancel()` replaced with `flush()`
- [x] `src/tui/components/StepperView.tsx`: `sessionIdRef` added and guard inserted in session reset effect
- [x] New test: same-session initialState change does NOT reset answers
- [x] New test: different-session initialState change DOES reset answers
- [x] All existing tests pass (`bun test`)
- [x] Build succeeds (`bun run build`)
