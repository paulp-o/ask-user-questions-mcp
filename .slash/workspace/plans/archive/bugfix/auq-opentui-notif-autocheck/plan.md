---
created: 2026-03-15T00:00:00Z
last_updated: 2026-03-15T00:00:00Z
type: bugfix
plan_number: 1
status: done
trigger: "opentui renderer missing OS notifications on new session arrival"
depends_on: none
next: TBD
---

# Plan: Add Notification Batcher to opentui Renderer

## Background & Research

### Bug 1: opentui renderer has NO notification batcher

The ink renderer (`bin/tui-app.tsx`) has a full notification batcher integration. The opentui renderer (`src/tui-opentui/app.tsx`) has **zero** notification-related code — no imports, no batcher creation, no queue calls, no flush on cleanup.

**Reference implementation in `bin/tui-app.tsx`:**

Import (line 27-34):

```tsx
import {
  createNotificationBatcher,
  showProgress,
  clearProgress,
  calculateProgress,
  checkLinuxDependencies,
  type NotificationBatcher,
} from "../src/tui/notifications/index.js";
```

Notification config + batcher creation (lines 107-117):

```tsx
const notificationConfig = useMemo(
  () => config?.notifications ?? { enabled: true, sound: true },
  [config?.notifications],
);

// Create notification batcher (memoized to persist across renders)
const notificationBatcherRef = useRef<NotificationBatcher | null>(null);
if (!notificationBatcherRef.current) {
  notificationBatcherRef.current =
    createNotificationBatcher(notificationConfig);
}
```

Queue on new session (lines 183-186, inside `startEnhancedWatching` callback):

```tsx
// Queue notification for new session (batched)
if (notificationBatcherRef.current) {
  notificationBatcherRef.current.queue(event.sessionId);
}
```

Flush on cleanup (lines 212-214):

```tsx
if (notificationBatcherRef.current) {
  notificationBatcherRef.current.flush();
}
```

**Target file `src/tui-opentui/app.tsx`:**

Current imports (lines 1-52): No notification imports at all.

Session watcher callback (lines 158-170):

```tsx
watcherInstance = createTUIWatcher({ autoLoadData: true });
watcherInstance.startEnhancedWatching((event) => {
  setSessionQueue((prev) => {
    if (prev.some((s) => s.sessionId === event.sessionId)) return prev;
    return [
      ...prev,
      {
        sessionId: event.sessionId,
        sessionRequest: event.sessionRequest!,
        timestamp: new Date(event.timestamp),
      },
    ];
  });
});
```

Cleanup (lines 179-181):

```tsx
return () => {
  if (watcherInstance) watcherInstance.stop();
};
```

### Bug 2: Custom/Elaborate auto-check — ANALYSIS RESULT: No bug found

After thorough comparison, both ink and opentui renderers have **identical** logic for:

- ✓ display for custom option: `customValue.trim().length > 0` → shows ✓ (ink line 364, opentui line 329)
- ★ display for elaborate option: `isElaborateMarked` prop controls ★ display (ink lines 447-448, opentui lines 410-411)
- `handleElaborateTextChange`: Both set/delete `elaborateMarks` map entry based on text content (ink lines 467-485, opentui lines 479-497)
- `handleChangeCustomAnswer`: Both set customText and clear selectedOption in single-select mode (ink lines 197-219, opentui lines 197-219)

Both renderers correctly:

- Show ✓ when custom text has content
- Show ★ when elaborate text has content (via elaborateMarks map)
- Auto-remove ★ when elaborate text is cleared
- Auto-remove ★ when custom text is typed (mutually exclusive)

**Conclusion: Bug 2 auto-check logic is working correctly in code. The original user report was about the ink renderer answer-shifting bug (already fixed in previous commit). No additional code changes needed for Bug 2.**

## Testing Plan (TDD - tests first)

- [x] Add test in `src/tui-opentui/__tests__/app-notifications.test.ts`: verify that when `startEnhancedWatching` fires a new session event, `notificationBatcherRef.current.queue()` is called
- [x] Add test: verify that on cleanup/unmount, `batcher.flush()` is called (not cancel)

## Implementation Plan

- [x] In `src/tui-opentui/app.tsx` line 3, add `useMemo` to the React import if not already present (it IS already imported — confirmed at line 3#ZQ)
- [x] After line 40 (`import type { UpdateInfo } from "../update/types.js";`), add notification imports:
  ```tsx
  import {
    createNotificationBatcher,
    type NotificationBatcher,
  } from "../tui/notifications/index.js";
  ```
- [x] Inside the `AppInner` component, after the existing `useMemo`/`useRef` declarations, add notification config + batcher creation. Find the right location by looking for existing `useRef` or state declarations in AppInner. Add:

  ```tsx
  // Notification configuration from config
  const notificationConfig = useMemo(
    () => config?.notifications ?? { enabled: true, sound: true },
    [config?.notifications],
  );

  // Create notification batcher (memoized to persist across renders)
  const notificationBatcherRef = useRef<NotificationBatcher | null>(null);
  if (!notificationBatcherRef.current) {
    notificationBatcherRef.current =
      createNotificationBatcher(notificationConfig);
  }
  ```

- [x] In the `startEnhancedWatching` callback (after line 160 `if (prev.some(...)) return prev;`), add queue call:
  ```tsx
  // Queue notification for new session (batched)
  if (notificationBatcherRef.current) {
    notificationBatcherRef.current.queue(event.sessionId);
  }
  ```
  NOTE: This must go AFTER the duplicate check but INSIDE the `setSessionQueue` callback, right after the duplicate check on line 160. Actually, it should go OUTSIDE `setSessionQueue` but still inside `startEnhancedWatching`. Looking at the ink renderer reference, the queue call is inside the setSessionQueue callback after the duplicate check. Follow the same pattern.
- [x] In the cleanup return (line 179-181), add flush before or after watcherInstance.stop():
  ```tsx
  return () => {
    if (watcherInstance) watcherInstance.stop();
    if (notificationBatcherRef.current) {
      notificationBatcherRef.current.flush();
    }
  };
  ```
- [x] Run `npx vitest run` to verify all existing tests still pass
- [x] Run `bun run build` to verify build succeeds

## Parallelization Plan

### Batch 1 (single programmer — small focused change)

- [x] Programmer A: Add notification batcher to opentui app.tsx + write tests -> files: `src/tui-opentui/app.tsx`, `src/tui-opentui/__tests__/app-notifications.test.ts`

### Dependencies

This is a single-file change (plus a new test file). No parallelization needed — one programmer can handle this in under 5 minutes.

### Risk Areas

- The `config` prop in AppInner must have `.notifications` property. Check the `AUQConfig` type to confirm `notifications` field exists (it does — referenced in `bin/tui-app.tsx` line 108: `config?.notifications`).
- The `notificationBatcherRef` must be accessible inside the `startEnhancedWatching` closure. Since it's a `useRef`, its `.current` will always point to the latest value — this is safe.
- The queue call position: in `bin/tui-app.tsx` it's inside `setSessionQueue` callback after the duplicate check. Follow the exact same pattern in opentui.

## Done Criteria

- [x] All existing tests pass (`npx vitest run`)
- [x] New notification test passes
- [x] Build succeeds (`bun run build`)
- [x] OS notification is sent when a new session arrives in opentui renderer mode
