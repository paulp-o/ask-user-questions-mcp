## 1. State Architecture (Foundation)

- [x] 1.1 Define `SessionUIState` interface in `src/tui/types.ts` (or existing TUI types module)
- [x] 1.2 Refactor App state in `bin/tui-app.tsx` to an indexed queue model (`activeSessionIndex`, `sessionUIStates`, and stop popping `sessionQueue`)
- [x] 1.3 Update `StepperView` to accept `initialState?: SessionUIState` and hydrate internal UI state from it when provided
- [x] 1.4 Add `onStateSnapshot` callback to `StepperView` so App can persist the current `SessionUIState` when switching away

## 2. Session Switching Logic

- [x] 2.1 Implement `switchToSession(targetIndex: number)` in App (snapshot current, update `activeSessionIndex`, and pass stored `initialState` into `StepperView`)
- [x] 2.2 Implement cyclic next/prev navigation with modulo arithmetic; no-op when `sessionQueue.length <= 1`
- [x] 2.3 Implement direct jump via number keys `1`-`9` (map to indices `0`-`8`; no-op for out-of-range or same index)
- [x] 2.4 Adjust `activeSessionIndex` when a session is removed from the queue (decrement if removed index is less than active)

## 3. Keyboard Handlers

- [x] 3.1 Add a global App `useInput` handler for session switching keys gated to `mode === "PROCESSING"` and not in review/rejection
- [x] 3.2 Add `isInReviewOrRejection` tracking (exposed from `StepperView` to App) to correctly gate switching
- [x] 3.3 Update `Footer` to display session switching keybindings only when `sessionQueue.length >= 2`

## 4. SessionDots Component

- [x] 4.1 Create `src/tui/components/SessionDots.tsx` to render numbered dots with active/inactive styles and progress color coding
- [x] 4.2 Integrate `SessionDots` into the App layout (position below `Footer`; only render when `sessionQueue.length >= 2`)

## 5. SessionPicker Overlay

- [x] 5.1 Create `src/tui/components/SessionPicker.tsx` overlay (rows with session metadata; Up/Down navigation; Enter select; Esc close; highlight active)
- [x] 5.2 Add App overlay state management (`showSessionPicker`) and input gating (when open, disable other input handlers)
- [x] 5.3 Add a relative time formatting helper (timestamp -> "2m ago", "1h ago", etc.) for picker rows

## 6. Edge Cases & Polish

- [x] 6.1 Handle session timeout while paused (detect, remove from `sessionQueue` and `sessionUIStates`, show a brief toast, and adjust `activeSessionIndex`)
- [x] 6.2 Handle new session arrival during an active session (append to queue; update dots/count; do not auto-switch)
- [x] 6.3 Update completion/rejection flow to remove sessions from queue/UI state, switch to remaining session (or return to waiting when empty)
- [x] 6.4 Extend theme colors/types for dots and picker (active/inactive/progress) and update all theme definitions

## 7. Testing

- [x] 7.1 Unit test: `SessionUIState` save/restore behavior across switches
- [x] 7.2 Unit test: cyclic navigation (next/prev) and direct jump (1-9) routing
- [x] 7.3 Unit test: `activeSessionIndex` adjustment on session removal
- [x] 7.4 Unit test: `SessionDots` rendering (active state and progress color coding)
- [x] 7.5 Unit test: `SessionPicker` keyboard navigation and selection behavior
- [x] 7.6 Integration test: multi-session switching flow (switch, answer, switch back, state preserved)
- [x] 7.7 Manual verification: ensure shortcuts do not conflict with existing input flows (review/rejection, overlays, step navigation)
