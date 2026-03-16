---
created: 2026-03-16T14:30:00Z
last_updated: 2026-03-16T22:00:00Z
type: spec
change_id: 2026-03-16-frontend-redesign
plan_number: 4
status: done
trigger: "Phase 4: Fix TypeScript errors in new frontend files, update docs, mark tasks complete"
depends_on: "archive/003_all-ui.md"
next: "none — final phase"
---

# Plan: Verification + Docs (Phase 4)

## Background & Research

### Current State After Phase 3

- **35/35 store tests passing** (theme 8, auth 7, workspace 5, questions 5, notifications 5, analytics 5)
- **All 67+ new files created** and structurally verified
- **.env.example** already has all required better-auth vars (BETTER_AUTH_SECRET, GITHUB_CLIENT_ID/SECRET, GOOGLE_CLIENT_ID/SECRET)

### TypeScript Errors in OUR New Files (must fix)

**1. QuestionsOverTimeChart.svelte** (`platforms/web/src/lib/components/charts/QuestionsOverTimeChart.svelte`)

- Missing `@types/d3-scale` package — layerchart uses d3-scale internally
- `<Line>` component props mismatch: using `stroke`/`strokeWidth` but component expects `x1`/`y1`/`x2`/`y2` SVG line props
- FIX: Install `@types/d3-scale` as devDep. Replace `<Line>` with layerchart's `<LinePath>` or `<Spline>` component, or use correct props.

**2. app/+layout.svelte** (`platforms/web/src/routes/app/+layout.svelte`)

- 2 warnings about deprecated `<svelte:component>` in Svelte 5 runes mode
- FIX: Replace `<svelte:component this={icon} />` with direct component rendering using `{@render}` or `{@const}` pattern

**3. app/inbox/+page.svelte** (`platforms/web/src/routes/app/inbox/+page.svelte`)

- Status comparison: checking for `'completed'` but Question type only allows `'pending'|'expired'`
- Missing `questionsJson` property — store's Question type doesn't have this field
- Invalid `content` snippet prop on Tabs component
- FIX: Change status filter to use `'answered'` or `'expired'` instead of `'completed'`. Remove `questionsJson` ref. Fix Tabs to use correct children snippet pattern.

**4. app/settings/+page.svelte** (`platforms/web/src/routes/app/settings/+page.svelte`)

- `defaultValue` prop doesn't exist on shadcn-svelte Tabs component
- FIX: Use `value` prop instead of `defaultValue`, or use the `bind:value` pattern

### Pre-existing Issues (DO NOT fix — not our files)

- **Backend API type errors** (17+ in `src/routes/api/`, `src/lib/api/`, `src/lib/db/`) — these use `bun:test`/`bun:sqlite` and have params typing issues that existed before our changes
- **`pnpm build` fails** — `better-sqlite3` native bindings not found in this dev environment. SSR build issue unrelated to frontend redesign.
- **17 test suites fail** — all are backend tests written for Bun runtime, not vitest-compatible. Pre-existing.

### shadcn-svelte Tabs API Reference

shadcn-svelte Tabs uses `value` not `defaultValue`:

```svelte
<Tabs.Root value="general">
  <Tabs.List>
    <Tabs.Trigger value="general">General</Tabs.Trigger>
  </Tabs.List>
  <Tabs.Content value="general">...</Tabs.Content>
</Tabs.Root>
```

### Svelte 5 Dynamic Component Pattern

Instead of deprecated `<svelte:component this={comp} />`:

```svelte
{#if icon}
  {@const Icon = icon}
  <Icon class="h-4 w-4" />
{/if}
```

### tasks.md Checkbox Update Scope

- tasks.md lines 12-150: All Phase 1-13 tasks should be marked `[x]`
- Lines 154-156 (Phase 14 docs): mark after docs are written

## Testing Plan (TDD - tests first)

- [ ] Run `pnpm exec vitest run` in `platforms/web/` — confirm 35 store tests still pass after fixes (baseline check)

## Implementation Plan

### Fix TypeScript Errors (Coder A)

- [ ] Run `pnpm add -D @types/d3-scale` in `platforms/web/`
- [ ] Fix `platforms/web/src/lib/components/charts/QuestionsOverTimeChart.svelte` — replace `<Line>` with correct layerchart component and props
- [ ] Fix `platforms/web/src/routes/app/inbox/+page.svelte` — change `'completed'` status to `'answered'`, remove `questionsJson` reference, fix Tabs `content` snippet to use correct children pattern
- [ ] Fix `platforms/web/src/routes/app/settings/+page.svelte` — replace `defaultValue` with `value` on Tabs.Root
- [ ] Fix `platforms/web/src/routes/app/+layout.svelte` — replace deprecated `<svelte:component this={icon}>` with Svelte 5 dynamic component pattern

### Documentation (Coder B)

- [ ] Update `platforms/web/README.md` — update route listing to reflect new structure (marketing: `/`, `/pricing`; auth: `/login`, `/signup`; app: `/app/inbox`, `/app/analytics`, `/app/settings`, `/app/admin`), add better-auth setup section, update env vars table, add analytics endpoint docs
- [ ] Update `platforms/web/static/openapi.yaml` — add `GET /api/v1/analytics` endpoint schema (query params: `days` integer, response: `{ questionsPerDay, avgResponseTime, pendingRatio }`)

### Mark Tasks Complete (Coder C)

- [ ] Update `openspec/changes/2026-03-16-frontend-redesign/tasks.md` — mark all Phase 1-14 checkboxes as `[x]`

### Final Verification

- [ ] Run `pnpm exec vitest run` in `platforms/web/` — confirm 35 tests still pass
- [ ] Run `pnpm check` in `platforms/web/` — confirm zero errors in NEW frontend files (pre-existing backend errors acceptable)

## Parallelization Plan

### Batch 1 (parallel — 3 coders)

- [ ] **Coder A**: Fix all TypeScript errors → files: `platforms/web/src/lib/components/charts/QuestionsOverTimeChart.svelte`, `platforms/web/src/routes/app/inbox/+page.svelte`, `platforms/web/src/routes/app/settings/+page.svelte`, `platforms/web/src/routes/app/+layout.svelte`, `platforms/web/package.json` (devDep add only)
- [ ] **Coder B**: Write docs → files: `platforms/web/README.md`, `platforms/web/static/openapi.yaml`
- [ ] **Coder C**: Mark tasks complete → files: `openspec/changes/2026-03-16-frontend-redesign/tasks.md`

### Batch 2 (after Batch 1)

- [ ] **Tester**: Run vitest + pnpm check to verify fixes and confirm no regressions

### Dependencies

- Batch 2 depends on Batch 1 (Coder A's TS fixes must land before type-checking)
- Coders A, B, C have zero file overlap — fully parallel

### Risk Areas

- layerchart chart component API may differ from what explorer reported — Coder A should read the actual component imports from `node_modules/layerchart` before fixing
- Tabs API change may cascade if other pages also use `defaultValue` — Coder A should grep for `defaultValue` across all route files
- README update should preserve any existing backend documentation sections

## Done Criteria

- [ ] All 35 store tests pass (`pnpm exec vitest run`)
- [ ] Zero TypeScript errors in new frontend files (`pnpm check` — only pre-existing backend errors remain)
- [ ] README.md updated with new routes, auth setup, env vars
- [ ] openapi.yaml includes analytics endpoint
- [ ] tasks.md all checkboxes marked complete
