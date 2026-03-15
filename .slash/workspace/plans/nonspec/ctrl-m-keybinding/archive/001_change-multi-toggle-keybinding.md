---
created: 2026-03-15T00:00:00Z
last_updated: 2026-03-15T00:00:00Z
type: nonspec
plan_number: 1
status: done
trigger: "Change multi-option toggle keybinding from 'm' to Ctrl+M"
depends_on: none
next: TBD
---

# Plan: Change Multi-Option Toggle from 'm' to Ctrl+M

## Background & Research

The keybinding that toggles single-choice questions into multi-select mode is in `StepperView.tsx`.

- File: `src/tui-opentui/components/StepperView.tsx` lines 657-665:
  ```tsx
  if (
    key.name?.toLowerCase() === "m" &&
    !key.ctrl &&
    !isInTextInput &&
    !currentQuestion.multiSelect
  ) {
    handleToggleForceMulti();
    return;
  }
  ```

- Current behavior: pressing bare `m` (with `!key.ctrl` guard) triggers multi-select toggle.
- Desired behavior: pressing `Ctrl+M` triggers multi-select toggle instead.
- The Ink `useInput` hook provides `key.ctrl` boolean and `key.name` for the key pressed.
- When Ctrl+M is pressed in a terminal, `key.name` will be `"m"` and `key.ctrl` will be `true`.
- The change is a simple condition flip: `!key.ctrl` → `key.ctrl`.
- No other files reference this keybinding (the toggle function `handleToggleForceMulti` at lines 499-542 is unchanged).
- There may be UI hint text showing the shortcut key — search for any "m" or "M" label in help/hint text.

## Testing Plan (TDD - tests first)

- [ ] Search for existing tests covering the 'm' key toggle in `StepperView` test files — if they exist, update them to send Ctrl+M instead of bare 'm'
- [ ] Verify no test references bare 'm' key for multi-toggle after the change

## Implementation Plan

- [ ] In `src/tui-opentui/components/StepperView.tsx` line 659, change `!key.ctrl` to `key.ctrl` (flip the ctrl guard)
- [ ] Search for any UI hint/help text that shows 'm' as the shortcut key (e.g., "Press m to toggle multi-select") and update it to show "Ctrl+M"
- [ ] Verify the build compiles cleanly with `bun run build`

## Parallelization Plan

### Batch 1 (single programmer — small change)
- [ ] Programmer A: flip ctrl guard + update hint text → files: `src/tui-opentui/components/StepperView.tsx` (and any hint text file found)

### Dependencies
Single batch, no dependencies. This is a one-line logic change plus possible label update.

### Risk Areas
- If other key handlers rely on Ctrl+M for something else (unlikely given the explorer found no conflicts).
- Terminal emulators may interpret Ctrl+M as Enter/CR — this is a known terminal behavior. Ink's `useInput` may or may not distinguish Ctrl+M from Enter. **The implementer should test this in the actual terminal to confirm Ctrl+M is correctly detected as `key.name === 'm' && key.ctrl === true` and not swallowed as Enter.**

## Done Criteria

- [ ] Pressing bare 'm' no longer triggers multi-select toggle
- [ ] Pressing Ctrl+M triggers multi-select toggle
- [ ] Any UI hint text updated to reflect new shortcut
- [ ] Build compiles cleanly
- [ ] No test failures