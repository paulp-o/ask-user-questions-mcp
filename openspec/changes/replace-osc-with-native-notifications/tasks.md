# Implementation Tasks

## 1. Dependencies

- [x] 1.1 Add `node-notifier` to package.json dependencies
- [x] 1.2 Add `@types/node-notifier` to devDependencies
- [x] 1.3 Run `npm install` and verify lockfile updates
- [x] 1.4 Create `src/tui/notifications/assets/` directory for icon

## 2. Type Updates

- [x] 2.1 Update `types.ts`: Simplify `TerminalProtocol` to only what's needed for progress bar
- [x] 2.2 Add `NativeNotificationOptions` interface for node-notifier options
- [x] 2.3 Keep `NotificationConfig` unchanged (enabled, sound)

## 3. Core Implementation

- [x] 3.1 Create `src/tui/notifications/native.ts` with node-notifier wrapper
- [x] 3.2 Implement `sendNativeNotification(title, message, config)` function
- [x] 3.3 Add platform detection (`process.platform`) for icon path resolution
- [x] 3.4 Set Windows appID to `'com.auq.mcp'` for Action Center persistence
- [x] 3.5 Handle node-notifier errors gracefully (log once, don't crash)

## 4. Integration

- [x] 4.1 Update `notify.ts`: Replace `sendNotification()` to use native.ts instead of OSC
- [x] 4.2 Keep `formatNotificationMessage()` unchanged (same message format)
- [x] 4.3 Update `batch.ts`: Ensure batcher calls new sendNotification
- [x] 4.4 Remove OSC notification generation from `osc.ts` (keep progress bar only)

## 5. Progress Bar Preservation

- [x] 5.1 Keep `generateProgressBar()` in `osc.ts`
- [x] 5.2 Keep `showProgress()` and `clearProgress()` in `progress.ts`
- [x] 5.3 Keep terminal detection in `detect.ts` (only for progress bar support)
- [x] 5.4 Verify progress bar still works in iTerm2/WezTerm

## 6. Linux Dependency Detection

- [x] 6.1 Create `checkLinuxDependencies()` function in native.ts
- [x] 6.2 On Linux: Check if `notify-send` exists using `which notify-send`
- [x] 6.3 If missing: Log warning once at startup with install instructions
- [x] 6.4 Add startup check in `bin/tui-app.tsx` after config load

## 7. Icon Asset

- [x] 7.1 Document icon requirements: PNG format, recommended 256x256 or 512x512
- [x] 7.2 Create placeholder README in `src/tui/notifications/assets/README.md`
- [x] 7.3 Update `sendNativeNotification()` to use icon if file exists
- [x] 7.4 Gracefully handle missing icon (use system default)

## 8. Test Updates

- [x] 8.1 Update `osc.test.ts`: Remove notification tests, keep progress bar tests
- [x] 8.2 Create `native.test.ts`: Mock node-notifier, verify correct options passed
- [x] 8.3 Update `batch.test.ts`: Ensure it works with new notification function
- [x] 8.4 Add test for Linux dependency check (mock `child_process.exec`)

## 9. Documentation

- [x] 9.1 Update README: Remove terminal support table
- [x] 9.2 Add platform requirements section:
  - macOS: Works out of the box
  - Windows: Works out of the box
  - Linux: Requires `libnotify-bin` package
- [x] 9.3 Update notification configuration section
- [x] 9.4 Update roadmap to mark this feature complete

## 10. Cleanup

- [x] 10.1 Remove unused OSC notification functions from `osc.ts`
- [x] 10.2 Remove unused terminal detection for notifications (keep for progress bar)
- [x] 10.3 Update `index.ts` exports if needed
- [x] 10.4 Run `npm run lint` and fix any issues
- [x] 10.5 Run `npm run build` and verify no errors

## 11. Verification

- [x] 11.1 Run `npm test` - all tests pass
- [ ] 11.2 Manual test on macOS: notification appears with sound
- [ ] 11.3 Manual test: progress bar still works in iTerm2
- [ ] 11.4 Manual test on Linux (if available): notification or warning appears
- [ ] 11.5 Manual test with `notifications.enabled: false`: no notification sent
