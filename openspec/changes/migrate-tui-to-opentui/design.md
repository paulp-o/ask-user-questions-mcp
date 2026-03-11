# Design: Migrate TUI to OpenTUI

## Context

The AUQ MCP Server currently uses **ink v6.4** as its TUI rendering library. Ink is a React-based terminal renderer that has served the project well, but has several limitations:

- CJK character width handling requires custom workarounds (`visualWidth.ts`)
- Gradient text requires external package (`ink-gradient`)
- Markdown rendering requires external package (`ink-markdown-es`) with inconsistent styling
- Text input requires external package (`ink-text-input`)
- Performance degrades with complex UIs

**OpenTUI** is a native Zig-based TUI library with React bindings (`@opentui/react` v0.1.87) that addresses these issues:

- Native CJK character support
- Built-in `<markdown>`, `<input>`, `<textarea>`, `<select>` components
- Tree-sitter based syntax highlighting
- Better performance through native rendering
- Already used in production by OpenCode

This migration maintains full backward compatibility during a transition period, allowing gradual adoption and easy rollback.

### Stakeholders

- **End Users**: Benefit from better performance, improved markdown rendering, proper CJK support
- **Maintainers**: Simpler component architecture, fewer external dependencies
- **Contributors**: Need to understand dual-renderer architecture during transition

### Constraints

- Must maintain feature parity with existing ink implementation
- Must support coexistence of both renderers during transition period
- Must not break existing configuration or session storage
- Must work with Bun (already confirmed compatible)

## Goals / Non-Goals

### Goals

- Implement OpenTUI renderer as an opt-in alternative to ink
- Maintain exact behavioral parity between ink and OpenTUI implementations
- Extract framework-agnostic code into shared directory
- Support runtime renderer selection via environment variable and config
- Implement graceful fallback from OpenTUI to ink on initialization failure
- Provide native-looking components using OpenTUI built-ins where available

### Non-Goals

- **Switching to SolidJS** — OpenTUI has React bindings, we stay with React
- **Removing ink immediately** — Both coexist until OpenTUI is proven stable
- **Changing MCP server or core business logic** — Only presentation layer changes
- **Modifying session storage format** — Only adding optional `renderer` field to config
- **Supporting both renderers indefinitely** — ink code will be removed after OpenTUI matures

## Decisions

### Decision 1: Dual Renderer Coexistence with Runtime Selection

**Decision**: Both ink and OpenTUI implementations coexist. Renderer selected via (in priority order):

1. `AUQ_RENDERER=opentui` environment variable
2. `renderer: "opentui"` in `.auqrc.json` config
3. Default: `"ink"`

**Rationale**:

- Allows gradual adoption and A/B testing
- Easy rollback if issues discovered
- Users can choose based on terminal compatibility

**Implementation** (bin/tui-app.tsx):

```typescript
const renderer = process.env.AUQ_RENDERER || config.renderer || "ink";
if (renderer === "opentui") {
  const { runTui } = await import("../src/tui-opentui/app.js");
  await runTui(config);
} else {
  const { runTui } = await import("../src/tui/app.js"); // existing ink
  await runTui(config);
}
```

**Alternatives considered**:

- Big-bang migration — rejected due to risk; OpenTUI v0.1.x is beta
- Compile-time selection — rejected; runtime selection allows user choice

### Decision 2: Directory Structure with Shared Framework-Agnostic Code

**Decision**:

- `src/tui/` — Existing ink implementation (unchanged during transition)
- `src/tui/shared/` — NEW: Framework-agnostic code extracted from tui/
- `src/tui-opentui/` — NEW: OpenTUI implementation

**Rationale**:

- Clear separation of concerns
- Minimizes changes to working ink code
- Shared code reduces duplication
- Easy to delete ink code after transition

**Structure**:

```
src/
├── tui/                    # Existing ink implementation
│   ├── shared/             # NEW — extracted shared code
│   │   ├── themes/         # Theme definitions
│   │   ├── types.ts        # UI types
│   │   ├── staleDetection.ts
│   │   ├── sessionSwitching.ts
│   │   └── ...
│   ├── components/         # Ink-specific (unchanged)
│   └── ...
├── tui-opentui/            # NEW — OpenTUI implementation
│   ├── components/         # OpenTUI components
│   ├── utils/              # OpenTUI-specific utilities
│   └── __tests__/          # bun:test based
```

**Alternatives considered**:

- Single directory with conditional rendering — rejected; too complex, hard to maintain
- Separate packages — rejected; overkill for this project

### Decision 3: Separate TypeScript Configuration

**Decision**: Create `tsconfig.opentui.json` extending base config with different JSX settings.

**Rationale**:

- OpenTUI requires `jsxImportSource: "@opentui/react"`
- ink uses default React JSX transform
- Clean separation prevents configuration conflicts

**Configuration**:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@opentui/react",
    "rootDir": "."
  },
  "include": ["src/tui-opentui"]
}
```

**Alternatives considered**:

- Single tsconfig with runtime JSX resolution — rejected; not supported by TypeScript
- Same JSX settings for both — rejected; incompatible imports

### Decision 4: Component Mapping Strategy

**Decision**: Map ink patterns to closest OpenTUI equivalents, accepting minor visual differences.

| Ink Component/Pattern             | OpenTUI Equivalent                            |
| --------------------------------- | --------------------------------------------- |
| `<Box>`                           | `<box>`                                       |
| `<Text>`                          | `<text>`                                      |
| `<Text color="green">`            | `<text fg="green">`                           |
| `<Box borderStyle="round">`       | `<box border borderStyle="rounded">`          |
| `useInput((input, key) => {...})` | `useKeyboard((key) => {...})`                 |
| `useApp()` → `exit()`             | `useRenderer()` → `renderer.destroy()`        |
| `useStdout()` → `stdout.columns`  | `useTerminalDimensions()` → `{width, height}` |
| ink-text-input `<TextInput>`      | `<input>` (built-in)                          |
| ink-markdown-es `<Markdown>`      | `<markdown>` (built-in, Tree-Sitter)          |
| ink-gradient                      | Dropped → solid accent color                  |
| `<Newline />`                     | `<br />`                                      |
| Custom visualWidth.ts             | Not needed — native CJK support               |

**Rationale**:

- Leverages OpenTUI native capabilities
- Reduces external dependencies
- Simpler code with built-in components

**Acceptable trade-offs**:

- Gradient text becomes solid accent color (can add custom gradient later)
- Minor styling differences in markdown rendering

### Decision 5: Theme → SyntaxStyle Auto-Generation

**Decision**: Auto-generate OpenTUI `SyntaxStyle` from existing theme tokens using `SyntaxStyle.fromStyles()`.

**Rationale**:

- Maintains theme consistency
- Single source of truth for colors
- Easy to add new theme variants

**Implementation** (src/tui-opentui/utils/syntaxStyle.ts):

```typescript
function generateSyntaxStyle(theme: Theme): SyntaxStyle {
  return SyntaxStyle.fromStyles({
    keyword: { fg: RGBA.fromHex(theme.colors.accent) },
    string: { fg: RGBA.fromHex(theme.colors.success) },
    comment: { fg: RGBA.fromHex(theme.colors.muted), italic: true },
    number: { fg: RGBA.fromHex(theme.colors.warning) },
    "markup.heading": { fg: RGBA.fromHex(theme.colors.accent), bold: true },
    "markup.list": { fg: RGBA.fromHex(theme.colors.text) },
    "markup.raw": { fg: RGBA.fromHex(theme.colors.secondary) },
    default: { fg: RGBA.fromHex(theme.colors.text) },
  });
}
```

### Decision 6: Graceful Fallback on OpenTUI Failure

**Decision**: Wrap OpenTUI initialization in try-catch with automatic fallback to ink.

**Rationale**:

- Better user experience than crash
- Handles edge cases (unsupported terminals, initialization failures)
- Allows users to try OpenTUI without risk

**Implementation**:

```typescript
async function runTui(config) {
  const rendererType = process.env.AUQ_RENDERER || config.renderer || "ink";
  if (rendererType === "opentui") {
    try {
      const { runTui: runOpenTui } = await import("../src/tui-opentui/app.js");
      await runOpenTui(config);
    } catch (err) {
      console.warn(
        `⚠️ OpenTUI failed to initialize: ${err.message}. Falling back to ink renderer.`,
      );
      const { runTui: runInkTui } = await import("../src/tui/app.js");
      await runInkTui(config);
    }
  } else {
    const { runTui: runInkTui } = await import("../src/tui/app.js");
    await runInkTui(config);
  }
}
```

### Decision 7: Testing Strategy Split

**Decision**:

- TUI component tests use `bun:test` + `@opentui/core/testing`
- Non-TUI tests remain on vitest

**Rationale**:

- OpenTUI testing utilities are designed for bun
- Avoids mixing test frameworks in same test file
- Gradual migration path for tests

**Example**:

```typescript
import { test, expect } from "bun:test"
import { testRender } from "@opentui/react"

test("renders question", async () => {
  const { mockInput, renderOnce, captureCharFrame } = await testRender(
    <QuestionDisplay question={mockQuestion} />,
    { width: 80, height: 24 }
  )
  await renderOnce()
  const frame = captureCharFrame()
  expect(frame).toContain("What is your preference?")
})
```

**Alternatives considered**:

- Migrate all tests to bun:test — rejected; too much churn
- Try to use vitest for OpenTUI — rejected; OpenTUI testing requires bun

### Decision 8: Session Events Abstraction

**Decision**: Extract event emitter interface for session management.

**Rationale**:

- Allows both ink and OpenTUI to use same session logic
- Thin adapters convert events to React state in each framework
- Reduces code duplication

**Interface** (src/tui/shared/session-events.ts):

```typescript
interface SessionEventEmitter {
  on(event: "session-added", handler: (session: SessionData) => void): void;
  on(event: "session-removed", handler: (sessionId: string) => void): void;
  on(event: "session-updated", handler: (session: SessionData) => void): void;
}
```

### Decision 9: OpenTUI Renderer Configuration

**Decision**: Configure OpenTUI renderer with specific options for TUI application needs.

**Configuration**:

```typescript
const renderer = await createCliRenderer({
  exitOnCtrlC: false, // Handle manually for graceful shutdown
  useMouse: true, // Full mouse support
  autoFocus: false, // Manual focus management
  useAlternateScreen: true, // Clean app-like experience
  useKittyKeyboard: {}, // Better key detection
  useConsole: process.env.AUQ_DEBUG === "1", // Debug only
  targetFps: 60,
});
```

**Rationale**:

- `exitOnCtrlC: false` allows custom cleanup logic
- `useAlternateScreen: true` provides clean UX (restores terminal on exit)
- `useKittyKeyboard` improves key detection for shortcuts

## Risks / Trade-offs

### Risk 1: @opentui/react is less production-tested than @opentui/solid

**Impact**: Potential bugs or edge cases in React bindings

**Mitigation**:

- Pin exact version (@opentui/react v0.1.87)
- Maintain ink fallback
- Extensive testing before making default
- Monitor OpenTUI releases for fixes

### Risk 2: OpenTUI v0.1.x is beta software

**Impact**: API changes, breaking changes in future versions

**Mitigation**:

- Pin exact version in package.json
- Keep ink implementation as backup
- Upgrade carefully with full regression testing
- Watch OpenTUI changelog

### Risk 3: No gradient text support

**Impact**: Visual regression in header styling

**Mitigation**:

- Accept solid accent color (design decision)
- Can implement custom gradient later if needed
- Most users won't notice difference

### Risk 4: No built-in multi-select component

**Impact**: Need to implement custom OptionsList component

**Mitigation**:

- Build using `<box>`, `<text>`, and `useKeyboard`
- Reference ink implementation for behavior
- Add comprehensive tests

### Risk 5: Two tsconfigs increase complexity

**Impact**: Potential confusion, build configuration issues

**Mitigation**:

- Clear directory boundaries
- Document build process
- CI validates both compile correctly

### Risk 6: Larger codebase during coexistence

**Impact**: More code to maintain, potential drift between implementations

**Mitigation**:

- Temporary situation — ink will be removed
- Shared code in `tui/shared/` reduces duplication
- Regular audits to keep implementations in sync

### Risk 7: Testing approach differs significantly

**Impact**: Learning curve for contributors, two testing patterns

**Mitigation**:

- Document testing approach in CONTRIBUTING.md
- Provide example tests for reference
- Keep vitest for non-TUI code (familiarity)

## Migration Plan

### Phase 1: Infrastructure Setup

1. Add `@opentui/react` and `@opentui/core` dependencies
2. Create `tsconfig.opentui.json`
3. Create `src/tui/shared/` directory
4. Extract framework-agnostic code to shared:
   - Move `src/tui/themes/` → `src/tui/shared/themes/`
   - Move types, utilities (staleDetection, sessionSwitching, etc.)
5. Update imports in existing ink code to use shared/

### Phase 2: Core Components

1. Create `src/tui-opentui/app.tsx` with renderer setup
2. Create `src/tui-opentui/ThemeProvider.tsx`
3. Create `src/tui-opentui/ConfigContext.tsx`
4. Create `src/tui-opentui/utils/syntaxStyle.ts`
5. Create base components:
   - `Header.tsx` (solid accent, no gradient)
   - `Footer.tsx`
   - `TabBar.tsx`
   - `Toast.tsx` (using useTimeline)

### Phase 3: Question Flow Components

1. `StepperView.tsx` — Main question stepper
2. `QuestionDisplay.tsx` — Question text rendering
3. `OptionsList.tsx` — Custom multi-select (no built-in available)
4. `CustomInput.tsx` — Using native `<input>`
5. `ReviewScreen.tsx` — Answer review

### Phase 4: Session & Overlay Components

1. `SessionDots.tsx` — Session indicators
2. `SessionPicker.tsx` — Using `<select>` in overlay
3. `ConfirmationDialog.tsx`
4. `WaitingScreen.tsx`
5. `UpdateOverlay.tsx` — Using native `<markdown>`
6. `UpdateBadge.tsx`
7. `ThemeIndicator.tsx`
8. `MarkdownPrompt.tsx` — Using native `<markdown>`

### Phase 5: Entry Point & Integration

1. Update `bin/tui-app.tsx` with conditional import logic
2. Add graceful fallback handling
3. Add `renderer` field to config schema
4. Update config loading to include renderer preference

### Phase 6: Testing

1. Set up `bun:test` for OpenTUI tests
2. Write component tests for critical paths:
   - `StepperView.test.tsx`
   - `OptionsList.test.tsx`
   - `Footer.test.tsx`
3. Integration test for renderer selection
4. Test fallback behavior

### Phase 7: Documentation

1. Update README.md with OpenTUI option
2. Document `AUQ_RENDERER` environment variable
3. Document `.auqrc.json` renderer field
4. Add troubleshooting guide

### Phase 8: Verification & Rollout

1. Run full test suite
2. Manual testing on various terminals
3. Test with CJK characters
4. Test fallback behavior
5. Release as opt-in feature
6. Gather feedback
7. Make default (future decision)
8. Remove ink (future decision)

### Rollback Plan

If critical issues found:

1. Default remains `renderer: "ink"` — users unaffected
2. Users can switch back: `AUQ_RENDERER=ink` or config change
3. Fix issues in OpenTUI implementation
4. Re-release

## Verification Checklist

After migration, verify:

- [ ] `AUQ_RENDERER=opentui bun run start` launches OpenTUI version
- [ ] `AUQ_RENDERER=ink bun run start` launches ink version (backward compat)
- [ ] No renderer specified defaults to ink
- [ ] Config `renderer: "opentui"` works
- [ ] Graceful fallback on OpenTUI failure
- [ ] All question types render correctly
- [ ] Keyboard navigation works
- [ ] Mouse support works (where applicable)
- [ ] CJK characters display correctly
- [ ] Markdown rendering works
- [ ] Theme switching works
- [ ] Session management works
- [ ] All tests pass
- [ ] No console errors or warnings

## Open Questions

None — all decisions resolved via user questions during spec creation.
