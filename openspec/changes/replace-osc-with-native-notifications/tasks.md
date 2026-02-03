# Implementation Tasks

## 1. Dependencies

- [ ] 1.1 Add `node-notifier` to package.json dependencies
- [ ] 1.2 Add `@types/node-notifier` to devDependencies
- [ ] 1.3 Run `npm install` and verify lockfile updates
- [ ] 1.4 Create `src/tui/notifications/assets/` directory for icon

## 2. Type Updates

- [ ] 2.1 Update `types.ts`: Simplify `TerminalProtocol` to only what's needed for progress bar
- [ ] 2.2 Add `NativeNotificationOptions` interface for node-notifier options
- [ ] 2.3 Keep `NotificationConfig` unchanged (enabled, sound)

## 3. Core Implementation

- [ ] 3.1 Create `src/tui/notifications/native.ts` with node-notifier wrapper
- [ ] 3.2 Implement `sendNativeNotification(title, message, config)` function
- [ ] 3.3 Add platform detection (`process.platform`) for icon path resolution
- [ ] 3.4 Set Windows appID to `'com.auq.mcp'` for Action Center persistence
- [ ] 3.5 Handle node-notifier errors gracefully (log once, don't crash)

## 4. Integration

- [ ] 4.1 Update `notify.ts`: Replace `sendNotification()` to use native.ts instead of OSC
- [ ] 4.2 Keep `formatNotificationMessage()` unchanged (same message format)
- [ ] 4.3 Update `batch.ts`: Ensure batcher calls new sendNotification
- [ ] 4.4 Remove OSC notification generation from `osc.ts` (keep progress bar only)

## 5. Progress Bar Preservation

- [ ] 5.1 Keep `generateProgressBar()` in `osc.ts`
- [ ] 5.2 Keep `showProgress()` and `clearProgress()` in `progress.ts`
- [ ] 5.3 Keep terminal detection in `detect.ts` (only for progress bar support)
- [ ] 5.4 Verify progress bar still works in iTerm2/WezTerm

## 6. Linux Dependency Detection

- [ ] 6.1 Create `checkLinuxDependencies()` function in native.ts
- [ ] 6.2 On Linux: Check if `notify-send` exists using `which notify-send`
- [ ] 6.3 If missing: Log warning once at startup with install instructions
- [ ] 6.4 Add startup check in `bin/tui-app.tsx` after config load

## 7. Icon Asset

- [ ] 7.1 Document icon requirements: PNG format, recommended 256x256 or 512x512
- [ ] 7.2 Create placeholder README in `src/tui/notifications/assets/README.md`
- [ ] 7.3 Update `sendNativeNotification()` to use icon if file exists
- [ ] 7.4 Gracefully handle missing icon (use system default)

## 8. Test Updates

- [ ] 8.1 Update `osc.test.ts`: Remove notification tests, keep progress bar tests
- [ ] 8.2 Create `native.test.ts`: Mock node-notifier, verify correct options passed
- [ ] 8.3 Update `batch.test.ts`: Ensure it works with new notification function
- [ ] 8.4 Add test for Linux dependency check (mock `child_process.exec`)

## 9. Documentation

- [ ] 9.1 Update README: Remove terminal support table
- [ ] 9.2 Add platform requirements section:
  - macOS: Works out of the box
  - Windows: Works out of the box
  - Linux: Requires `libnotify-bin` package
- [ ] 9.3 Update notification configuration section
- [ ] 9.4 Update roadmap to mark this feature complete

## 10. Cleanup

- [ ] 10.1 Remove unused OSC notification functions from `osc.ts`
- [ ] 10.2 Remove unused terminal detection for notifications (keep for progress bar)
- [ ] 10.3 Update `index.ts` exports if needed
- [ ] 10.4 Run `npm run lint` and fix any issues
- [ ] 10.5 Run `npm run build` and verify no errors

## 11. Verification

- [ ] 11.1 Run `npm test` - all tests pass
- [ ] 11.2 Manual test on macOS: notification appears with sound
- [ ] 11.3 Manual test: progress bar still works in iTerm2
- [ ] 11.4 Manual test on Linux (if available): notification or warning appears
- [ ] 11.5 Manual test with `notifications.enabled: false`: no notification sent
