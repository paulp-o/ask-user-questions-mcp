# Notification Icon Assets

This directory contains optional icon assets for TUI notifications.

## Icon Requirements

- **Format**: PNG (Portable Network Graphics)
- **Recommended Sizes**: 256x256 pixels or 512x512 pixels
- **File Name**: `icon.png`

## Usage

The notification icon is **optional**. If `icon.png` is not present in this directory, the system will fall back to using the default system notification icon.

## Example Usage in Notifications

When a notification is triggered from the TUI (e.g., task completion, errors, or alerts), the notification system will:

1. Check for `icon.png` in this directory
2. If found, use it as the notification icon
3. If not found, use the system's default notification icon

```typescript
// Example: Notification with custom icon (if icon.png exists)
notify({
  title: "Task Complete",
  message: "Your background task has finished successfully",
  icon: "./assets/icon.png", // Optional: uses system default if missing
});
```

## Adding Your Icon

1. Create or obtain a PNG icon (256x256 or 512x512 recommended)
2. Name it `icon.png`
3. Place it in this directory (`src/tui/notifications/assets/`)
4. The notification system will automatically pick it up
