# Change: Fix Text Input and CJK Rendering Issues

## Why

The current TUI has multiple critical text input and rendering issues that severely impact usability, especially for Korean users:

1. **CJK Background Color Clipping**: Background colors get cut off or wrap incorrectly when Korean/CJK characters are mixed with ASCII text. This is due to Ink's Yoga layout engine calculating width by character count instead of visual column width.

2. **Space Bar Input Bug**: Pressing spacebar inserts the space behind the cursor instead of at the cursor position.

3. **Delete Key Not Working**: The Delete key does not function at all, even for English text.

4. **Copy/Paste Issues**: Copy and paste functionality does not work correctly - pasted text may be garbled or inserted incorrectly.

5. **Paste Cursor Position**: After pasting text, the cursor does not move to the end of the pasted content.

These issues make the custom text input nearly unusable for Korean users and frustrating for all users.

## What Changes

- **CJK Width Calculation**: Implement `string-width` based width calculation for all text rendering with background colors
- **Input Cursor Handling**: Fix spacebar, delete key, and general cursor positioning in MultiLineTextInput
- **Paste Event Handling**: Properly detect and handle paste events, positioning cursor at end of pasted content
- **Copy Support**: Ensure text selection and copy works correctly (if applicable in terminal)

## Impact

- Affected specs: `tui-application`
- Affected code:
  - `src/tui/components/MultiLineTextInput.tsx` - primary input handling fixes
  - `src/tui/components/SingleLineTextInput.tsx` - same fixes if applicable
  - `src/tui/components/OptionsList.tsx` - CJK background color rendering
  - `src/tui/components/TabBar.tsx` - CJK background color rendering
  - `src/tui/components/Toast.tsx` - CJK background color rendering
  - `src/tui/components/Header.tsx` - CJK background color rendering (pill)
  - Potentially all components using `backgroundColor` with dynamic text

## Technical Notes

### Root Cause Analysis

**CJK Background Color Issue:**

- Ink uses Yoga (Facebook's layout engine) for calculating element widths
- Yoga counts characters, not visual columns
- CJK characters occupy 2 terminal columns but count as 1 character
- ANSI background color escape codes are applied based on character count, not column count
- Result: Background color is too short, causing visual clipping

**Input Handling Issues:**

- MultiLineTextInput uses custom cursor management
- Current implementation has bugs in cursor position calculation
- Delete key handler may be missing or incorrectly implemented
- Paste detection relies on character-by-character input which doesn't handle bulk paste

### Workaround Strategy

Use `string-width` npm package (already a transitive dependency via Ink) to:

1. Calculate true visual width of strings containing CJK characters
2. Apply padding or width adjustments to match visual rendering
3. Handle cursor positioning based on visual columns, not character count
