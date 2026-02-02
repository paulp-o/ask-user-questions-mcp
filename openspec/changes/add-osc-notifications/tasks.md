# Tasks: Add OSC 9/99 Notification Support

## 1. OSC Protocol Implementation

- [ ] 1.1 Create `src/tui/notifications/types.ts` with notification interfaces
- [ ] 1.2 Create `src/tui/notifications/osc.ts` with low-level OSC escape sequence generators
- [ ] 1.3 Implement OSC 9 notification format: `ESC]9;{message}BEL`
- [ ] 1.4 Implement OSC 99 notification format with Base64-encoded parameters
- [ ] 1.5 Implement OSC 9 progress bar sequences: `ESC]9;4;{state};{percent}BEL`

## 2. Terminal Detection

- [ ] 2.1 Create `src/tui/notifications/detect.ts` with terminal detection logic
- [ ] 2.2 Implement `TERM_PROGRAM` environment variable parsing
- [ ] 2.3 Map terminal names to protocols: `iTerm.app` -> OSC 9, `kitty` -> OSC 99
- [ ] 2.4 Default to OSC 9 for unknown terminals (most compatible)

## 3. High-Level Notification API

- [ ] 3.1 Create `src/tui/notifications/notify.ts` with `sendNotification()` function
- [ ] 3.2 Implement message formatting: `AUQ: {N} new question(s)`
- [ ] 3.3 Add terminal detection and protocol selection
- [ ] 3.4 Send notification via `process.stdout.write()` to avoid console buffering

## 4. Progress Bar Support

- [ ] 4.1 Create `src/tui/notifications/progress.ts` with progress bar API
- [ ] 4.2 Implement `showProgress(percent: number)` function
- [ ] 4.3 Implement `clearProgress()` function
- [ ] 4.4 Calculate percentage from answered questions: `(answered / total) * 100`

## 5. Notification Batching

- [ ] 5.1 Implement debounce/batch logic for rapid session arrivals
- [ ] 5.2 Track pending notification count during batch window
- [ ] 5.3 Send single notification with total count after batch window

## 6. Configuration

- [ ] 6.1 Add `notifications` section to config schema
- [ ] 6.2 Define `notifications.enabled` boolean (default: `true`)
- [ ] 6.3 Define `notifications.sound` boolean (default: `true`)
- [ ] 6.4 Update config loader to parse notification settings

## 7. TUI Integration

- [ ] 7.1 Update `bin/tui-app.tsx` to import notification module
- [ ] 7.2 Hook notification trigger to session queue changes
- [ ] 7.3 Send notification when new session added to queue (if enabled)
- [ ] 7.4 Update progress bar when questions are answered
- [ ] 7.5 Clear progress bar on session complete or reject

## 8. Sound Support

- [ ] 8.1 Add sound parameter to OSC 99 notifications when `notifications.sound: true`
- [ ] 8.2 Use `dialog-information` as default sound name for OSC 99
- [ ] 8.3 OSC 9 inherits terminal's notification sound (no explicit control)

## 9. Testing & Documentation

- [ ] 9.1 Add unit tests for OSC sequence generation
- [ ] 9.2 Add unit tests for terminal detection
- [ ] 9.3 Add unit tests for message formatting
- [ ] 9.4 Update README.md with notification configuration documentation
- [ ] 9.5 Document supported terminals in README

## 10. Validation

- [ ] 10.1 Run `npm run lint` and fix any issues
- [ ] 10.2 Run `npm run build` and verify compilation
- [ ] 10.3 Run `npm test` and verify all tests pass
- [ ] 10.4 Manual testing in iTerm2: verify OSC 9 notifications work
- [ ] 10.5 Manual testing in kitty: verify OSC 99 notifications work
- [ ] 10.6 Manual testing: verify progress bar appears in dock icon
