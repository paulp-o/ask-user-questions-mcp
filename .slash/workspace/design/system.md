# Design System: AUQ Web Platform

## Generated Recommendations
- **Style**: Utility Monochrome (Raycast-style), clean, pragmatic, OS-native feel.
- **Palette**: Dark mode default. Deep, inky blacks and slate grays for backgrounds. Accent color is used intentionally and sparingly.
- **Typography**: Refined, readable sans-serif for UI, monospace for code snippets and technical details.
- **Density**: Comfortable (balanced spacing, clear hierarchy, easy to tap on mobile).
- **Depth**: Subtle surface tints (no borders, lighter/darker backgrounds to separate layers).

## Craft Decisions
- **Direction**: A sleek, pragmatic, modern developer tool. It should feel like a sharp utility that respects a focused developer's time and flow.
- **Signature**: A prominent "time-elapsed" indicator showing how long the agent has been waiting.
- **Depth**: Subtle surface tints.
- **Spacing**: Base 4px unit. 16px (4 units) for component padding, 24px (6 units) for section gaps. Generous hit areas (min 44px) for mobile taps.
- **Typography**: Inter (or system sans-serif) for body. JetBrains Mono (or system monospace) for technical data and the time-elapsed indicator. WHY: System fonts feel native and fast; monospace ensures tabular figures for ticking time.
- **Color temperature**: Cool, dark slate grays. Default dark. WHY: Terminal developers expect dark mode; slate grays reduce eye strain compared to pure black. Accent color: Amber/Orange for the "waiting" indicator (implies urgency without being destructive red).

## Component Patterns
- **Buttons**: Tinted backgrounds instead of solid colors, except for the primary "Submit" which gets the accent color.
- **Cards/Inbox Items**: Slightly lighter gray than the canvas. Hover states shift the tint slightly lighter.
- **Forms/Inputs**: Inset feel (slightly darker than the card background). No borders, just a subtle inner shadow or darker tint.
