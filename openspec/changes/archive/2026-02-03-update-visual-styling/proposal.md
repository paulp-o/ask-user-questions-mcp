# Change: Update Visual Styling and Theme Consistency

## Why

The current UI has several visual inconsistencies and suboptimal styling choices:

- "Unanswered" items are displayed in dim gray, making them easy to miss when they should be attention-grabbing
- Success message uses a bordered box which looks heavy; a lighter pill/badge style would be more modern
- Header and body component borders use independent colors that don't maintain consistent brightness relationships across themes

## What Changes

- **Unanswered Highlighting**: Change "unanswered" display from dim gray to a red-family color for visual emphasis in both TabBar and ReviewScreen
- **Success Message Restyling**: Replace bordered box with centered pill/badge style (background color, no border outline)
- **Theme Border Consistency**: Establish systematic brightness relationship between header and body borders, ensuring consistency across all 16+ themes using the same hue with different lightness values

## Impact

- Affected specs: `tui-application`
- Affected code:
  - `src/tui/components/TabBar.tsx` - unanswered color styling
  - `src/tui/components/ReviewScreen.tsx` - unanswered display styling
  - `src/tui/components/Toast.tsx` - success message pill styling
  - `src/tui/themes/types.ts` - new theme tokens for unanswered and pill styles
  - `src/tui/themes/*.ts` - all 16+ theme files updated with new color relationships
