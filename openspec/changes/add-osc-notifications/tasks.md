# Tasks: Add OSC 9/99 Notification Support

## 1. OSC Protocol Implementation

- [x] 1.1 Create `src/tui/notifications/types.ts` with notification interfaces
- [x] 1.2 Create `src/tui/notifications/osc.ts` with low-level OSC escape sequence generators
- [x] 1.3 Implement OSC 9 notification format: `ESC]9;{message}BEL`
- [x] 1.4 Implement OSC 99 notification format with Base64-encoded parameters
- [x] 1.5 Implement OSC 9 progress bar sequences: `ESC]9;4;{state};{percent}BEL`
- [x] 1.6 Implement OSC 777 notification format for rxvt/urxvt

## 2. Terminal Detection

- [x] 2.1 Create `src/tui/notifications/detect.ts` with terminal detection logic
- [x] 2.2 Implement `TERM_PROGRAM` environment variable parsing
- [x] 2.3 Map terminal names to protocols: `iTerm.app` -> OSC 9, `kitty` -> OSC 99
- [x] 2.4 Default to OSC 9 for unknown terminals (most compatible)
- [x] 2.5 Add detection for Ghostty, WezTerm, Alacritty, Windows Terminal, Hyper, VS Code, rxvt

## 3. High-Level Notification API

- [x] 3.1 Create `src/tui/notifications/notify.ts` with `sendNotification()` function
- [x] 3.2 Implement message formatting: `AUQ: {N} new question(s)`
- [x] 3.3 Add terminal detection and protocol selection
- [x] 3.4 Send notification via `process.stdout.write()` to avoid console buffering

## 4. Progress Bar Support

- [x] 4.1 Create `src/tui/notifications/progress.ts` with progress bar API
- [x] 4.2 Implement `showProgress(percent: number)` function
- [x] 4.3 Implement `clearProgress()` function
- [x] 4.4 Calculate percentage from answered questions: `(answered / total) * 100`

## 5. Notification Batching

- [x] 5.1 Implement debounce/batch logic for rapid session arrivals
- [x] 5.2 Track pending notification count during batch window
- [x] 5.3 Send single notification with total count after batch window

## 6. Configuration

- [x] 6.1 Add `notifications` section to config schema
- [x] 6.2 Define `notifications.enabled` boolean (default: `true`)
- [x] 6.3 Define `notifications.sound` boolean (default: `true`)
- [x] 6.4 Update config loader to parse notification settings

## 7. TUI Integration

- [x] 7.1 Update `bin/tui-app.tsx` to import notification module
- [x] 7.2 Hook notification trigger to session queue changes
- [x] 7.3 Send notification when new session added to queue (if enabled)
- [x] 7.4 Update progress bar when questions are answered
- [x] 7.5 Clear progress bar on session complete or reject

## 8. Sound Support

- [x] 8.1 Add sound parameter to OSC 99 notifications when `notifications.sound: true`
- [x] 8.2 Use `dialog-information` as default sound name for OSC 99
- [x] 8.3 OSC 9 inherits terminal's notification sound (no explicit control)

## 9. Testing & Documentation

- [x] 9.1 Add unit tests for OSC sequence generation (17 tests)
- [x] 9.2 Add unit tests for terminal detection (18 tests)
- [x] 9.3 Add unit tests for message formatting and batching (10 tests)
- [x] 9.4 Update README.md with notification configuration documentation
- [x] 9.5 Document supported terminals in README

## 10. Validation

- [x] 10.1 Run `npm run lint` and fix any issues
- [x] 10.2 Run `npm run build` and verify compilation
- [x] 10.3 Run `npm test` and verify all tests pass (45 notification tests pass)
- [ ] 10.4 Manual testing in iTerm2: verify OSC 9 notifications work
- [ ] 10.5 Manual testing in kitty: verify OSC 99 notifications work
- [ ] 10.6 Manual testing: verify progress bar appears in dock icon
