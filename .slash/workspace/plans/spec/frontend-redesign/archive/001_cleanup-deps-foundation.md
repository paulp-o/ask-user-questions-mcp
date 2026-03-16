---
created: 2026-03-16T13:00:00Z
last_updated: 2026-03-16T13:30:00Z
type: spec
change_id: 2026-03-16-frontend-redesign
plan_number: 1
status: done
trigger: "Phase 1: Delete old frontend files, install shadcn-svelte + better-auth + layerchart deps, create Tailwind v4 amber theme foundation, update app.html, create theme store"
depends_on: "none"
next: "002_better-auth-setup.md"
---

# Plan: Cleanup + Dependencies + Foundation

## Background & Research

### Current File Inventory — Files to DELETE (23 files confirmed)

**Old route pages (8 files):**

```
platforms/web/src/routes/+page.svelte          — old inbox page
platforms/web/src/routes/+layout.svelte         — old root layout
platforms/web/src/routes/+page.ts               — old page load function
platforms/web/src/routes/setup/+page.svelte     — old setup page
platforms/web/src/routes/questions/[id]/+page.svelte  — old question detail
platforms/web/src/routes/questions/[id]/+page.ts      — old question detail loader
platforms/web/src/routes/settings/+page.svelte  — old settings page
platforms/web/src/routes/admin/+page.svelte     — old admin page
platforms/web/src/routes/admin/+page.server.ts  — old admin server loader
```

**Old components (5 files):**

```
platforms/web/src/lib/components/LoadingSkeleton.svelte
platforms/web/src/lib/components/OptionCard.svelte
platforms/web/src/lib/components/QuestionCard.svelte
platforms/web/src/lib/components/StatusBadge.svelte
platforms/web/src/lib/components/ThemeToggle.svelte
```

**Old stores + tests (7 files):**

```
platforms/web/src/lib/stores/theme.svelte.ts
platforms/web/src/lib/stores/questions.svelte.ts
platforms/web/src/lib/stores/workspace.svelte.ts
platforms/web/src/lib/stores/notifications.svelte.ts
platforms/web/src/lib/stores/__tests__/theme.test.ts
platforms/web/src/lib/stores/__tests__/questions.test.ts
platforms/web/src/lib/stores/__tests__/workspace.test.ts
```

**Old styles + manifest (2 files):**

```
platforms/web/src/app.css                       — will be replaced
platforms/web/static/manifest.json              — will be replaced
```

### Files to KEEP (do NOT touch)

**Backend API routes:**

```
platforms/web/src/routes/api/v1/questions/+server.ts
platforms/web/src/routes/api/v1/questions/[id]/+server.ts
platforms/web/src/routes/api/v1/questions/[id]/answer/+server.ts
platforms/web/src/routes/api/v1/questions/[id]/__tests__/delete.test.ts
platforms/web/src/routes/api/v1/questions/[id]/__tests__/get.test.ts
platforms/web/src/routes/api/v1/questions/[id]/answer/__tests__/post.test.ts
platforms/web/src/routes/api/v1/questions/__tests__/post.test.ts
```

**Backend lib:**

```
platforms/web/src/lib/api/ (all files — auth.ts, client.ts, errors.ts, key-generator.ts, logger.ts, push-sender.ts, rate-limit.ts, schemas.ts, validation.ts, handlers/*, __tests__/*)
platforms/web/src/lib/index.ts          — SvelteKit lib barrel (keep, contents: "// place files you want to import...")
platforms/web/src/lib/assets/favicon.svg
```

**Infrastructure:**

```
platforms/web/src/hooks.server.ts        — CORS + logging hooks (keep now, update in Phase 2)
platforms/web/drizzle/                   — migration files
```

### Current package.json (platforms/web/package.json)

```json
{
  "name": "web",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "preview": "vite preview",
    "prepare": "svelte-kit sync || echo ''",
    "check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
    "check:watch": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json --watch"
  },
  "devDependencies": {
    "@sveltejs/adapter-auto": "^7.0.0",
    "@sveltejs/kit": "^2.50.2",
    "@sveltejs/vite-plugin-svelte": "^6.2.4",
    "@tailwindcss/vite": "^4.2.1",
    "@types/better-sqlite3": "^7.6.13",
    "@types/web-push": "^3.6.4",
    "drizzle-kit": "^0.31.9",
    "svelte": "^5.51.0",
    "svelte-check": "^4.4.2",
    "tailwindcss": "^4.2.1",
    "typescript": "^5.9.3",
    "vite": "^7.3.1",
    "vitest": "^4.1.0"
  },
  "dependencies": {
    "@paulp-o/auq-shared": "file:../../packages/shared",
    "better-sqlite3": "^12.8.0",
    "drizzle-orm": "^0.45.1",
    "web-push": "^3.6.7",
    "zod": "^4.3.6"
  }
}
```

### Current app.html (class="dark", slate-900 theme)

```html
<!doctype html>
<html lang="en" class="dark">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#0f172a" />
    <link rel="manifest" href="/manifest.json" />
    <link rel="apple-touch-icon" href="/icon-192.png" />
    <link rel="icon" href="/icon-192.png" sizes="192x192" type="image/png" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link
      rel="preconnect"
      href="https://fonts.gstatic.com"
      crossorigin="anonymous"
    />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
      rel="stylesheet"
    />
    %sveltekit.head%
  </head>
  <body data-sveltekit-preload-data="hover">
    <div style="display: contents">%sveltekit.body%</div>
  </body>
</html>
```

### Current svelte.config.js (runes enabled)

```javascript
import adapter from "@sveltejs/adapter-auto";
const config = {
  kit: {
    adapter: adapter(),
  },
  vitePlugin: {
    dynamicCompileOptions: ({ filename }) =>
      filename.includes("node_modules") ? undefined : { runes: true },
  },
};
export default config;
```

### Current vite.config.ts

```typescript
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
});
```

### shadcn-svelte Setup Research

**Non-interactive init command:**

```bash
pnpm dlx shadcn-svelte@latest init \
  --style new-york \
  --base-color slate \
  --css src/app.css \
  --components-alias '$lib/components' \
  --lib-alias '$lib' \
  --utils-alias '$lib/utils'
```

**Files created by init:**

- `components.json` — config with style, paths, aliases
- `$lib/utils.ts` — the `cn()` utility (clsx + tailwind-merge)
- Modifies `src/app.css` — adds CSS variables + `@theme inline` mapping

**Add all components (non-interactive):**

```bash
pnpm dlx shadcn-svelte@latest add button card input label badge tabs dialog separator avatar sheet dropdown-menu table tooltip switch skeleton --overwrite
```

**Required dependencies (added automatically unless --no-deps):**

- `bits-ui` — primitive components
- `@lucide/svelte` — icons
- `tailwind-variants` — variant utility
- `tailwind-merge` — class merging
- `clsx` — conditional classes
- `tw-animate-css` — animation utilities

**cn() utility created at `$lib/utils.ts`:**

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### shadcn-svelte CSS Variable Structure (Tailwind v4)

shadcn-svelte with Tailwind v4 uses a two-layer approach:

1. `:root` / `.dark` blocks define CSS custom properties (raw HSL values)
2. `@theme inline` maps them to Tailwind utility names

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

:root {
  --background: hsl(0 0% 100%);
  --foreground: hsl(222 47% 11%);
  --primary: hsl(38 92% 50%); /* amber-500 */
  --primary-foreground: hsl(0 0% 100%);
  --card: hsl(0 0% 100%);
  --card-foreground: hsl(222 47% 11%);
  --muted: hsl(210 40% 96%);
  --muted-foreground: hsl(215 16% 47%);
  --secondary: hsl(210 40% 96%);
  --secondary-foreground: hsl(222 47% 11%);
  --accent: hsl(210 40% 96%);
  --accent-foreground: hsl(222 47% 11%);
  --destructive: hsl(0 72% 51%);
  --destructive-foreground: hsl(0 0% 98%);
  --border: hsl(214 32% 91%);
  --input: hsl(214 32% 91%);
  --ring: hsl(38 92% 50%); /* amber ring */
  --popover: hsl(0 0% 100%);
  --popover-foreground: hsl(222 47% 11%);
  --radius: 0.5rem;
  --sidebar: hsl(0 0% 98%);
  --sidebar-foreground: hsl(222 47% 11%);
  --sidebar-primary: hsl(38 92% 50%);
  --sidebar-primary-foreground: hsl(0 0% 100%);
  --sidebar-accent: hsl(210 40% 96%);
  --sidebar-accent-foreground: hsl(222 47% 11%);
  --sidebar-border: hsl(214 32% 91%);
  --sidebar-ring: hsl(38 92% 50%);
}

.dark {
  --background: hsl(222 47% 6%);
  --foreground: hsl(210 40% 98%);
  --primary: hsl(38 92% 50%);
  --primary-foreground: hsl(0 0% 100%);
  --card: hsl(222 47% 9%);
  --card-foreground: hsl(210 40% 98%);
  --muted: hsl(217 33% 12%);
  --muted-foreground: hsl(215 20% 65%);
  --secondary: hsl(217 33% 17%);
  --secondary-foreground: hsl(210 40% 98%);
  --accent: hsl(217 33% 17%);
  --accent-foreground: hsl(210 40% 98%);
  --destructive: hsl(0 62% 31%);
  --destructive-foreground: hsl(0 0% 98%);
  --border: hsl(217 33% 17%);
  --input: hsl(217 33% 17%);
  --ring: hsl(38 92% 50%);
  --popover: hsl(222 47% 9%);
  --popover-foreground: hsl(210 40% 98%);
  --sidebar: hsl(222 47% 6%);
  --sidebar-foreground: hsl(210 40% 98%);
  --sidebar-primary: hsl(38 92% 50%);
  --sidebar-primary-foreground: hsl(0 0% 100%);
  --sidebar-accent: hsl(217 33% 17%);
  --sidebar-accent-foreground: hsl(210 40% 98%);
  --sidebar-border: hsl(217 33% 17%);
  --sidebar-ring: hsl(38 92% 50%);
}

@theme inline {
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
  --font-sans: "Inter", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", monospace;
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### Theme Store Pattern (Svelte 5 runes)

```typescript
// src/lib/stores/theme.svelte.ts
import { browser } from "$app/environment";

type Theme = "light" | "dark";

const STORAGE_KEY = "auq-theme";

function createThemeStore() {
  let theme = $state<Theme>("light");

  if (browser) {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (stored === "light" || stored === "dark") {
      theme = stored;
    }
  }

  $effect(() => {
    if (browser) {
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(theme);
      localStorage.setItem(STORAGE_KEY, theme);
    }
  });

  return {
    get current() {
      return theme;
    },
    get isDark() {
      return theme === "dark";
    },
    toggle() {
      theme = theme === "light" ? "dark" : "light";
    },
    set(value: Theme) {
      theme = value;
    },
  };
}

export const themeStore = createThemeStore();
```

### Target app.html After Update

```html
<!doctype html>
<html lang="en" class="light">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#f59e0b" />
    <meta
      name="description"
      content="Keep your hand on the wheel — Ask User Questions lets AI agents ask you questions through a beautiful web interface"
    />
    <link rel="manifest" href="/manifest.json" />
    <link rel="apple-touch-icon" href="/icon-192.png" />
    <link rel="icon" href="/icon-192.png" sizes="192x192" type="image/png" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link
      rel="preconnect"
      href="https://fonts.gstatic.com"
      crossorigin="anonymous"
    />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
      rel="stylesheet"
    />
    %sveltekit.head%
  </head>
  <body data-sveltekit-preload-data="hover">
    <div style="display: contents">%sveltekit.body%</div>
  </body>
</html>
```

### Target manifest.json

```json
{
  "name": "AUQ — Ask User Questions",
  "short_name": "AUQ",
  "start_url": "/app/inbox",
  "scope": "/",
  "display": "standalone",
  "theme_color": "#f59e0b",
  "background_color": "#ffffff",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

---

## Testing Plan (TDD — tests first)

- [ ] Create `platforms/web/src/lib/stores/__tests__/theme.test.ts` — test new theme store: defaults to `'light'`, `toggle()` switches to `'dark'` and back, `set('dark')` sets dark, `isDark` derived is correct, localStorage persistence works (mock localStorage), `current` getter returns current theme

---

## Implementation Plan

### Step 1: Delete all old frontend files

- [ ] Delete `platforms/web/src/routes/+page.svelte` (old inbox page)
- [ ] Delete `platforms/web/src/routes/+layout.svelte` (old root layout)
- [ ] Delete `platforms/web/src/routes/+page.ts` (old page load function)
- [ ] Delete `platforms/web/src/routes/setup/` directory (old setup page)
- [ ] Delete `platforms/web/src/routes/questions/` directory (old question detail — 2 files)
- [ ] Delete `platforms/web/src/routes/settings/` directory (old settings page)
- [ ] Delete `platforms/web/src/routes/admin/` directory (old admin page + server loader — 2 files)
- [ ] Delete `platforms/web/src/lib/components/` directory (all 5 old components)
- [ ] Delete `platforms/web/src/lib/stores/` directory (4 stores + 3 test files)
- [ ] Delete `platforms/web/src/app.css` (will be replaced)
- [ ] Delete `platforms/web/static/manifest.json` (will be replaced)

### Step 2: Install dependencies

- [ ] Add to package.json `dependencies`: `better-auth`, `layerchart@next`
- [ ] Run `pnpm install` in `platforms/web/`
- [ ] Run `pnpm dlx shadcn-svelte@latest init` non-interactively with flags: `--style new-york --base-color slate --css src/app.css --components-alias '$lib/components' --lib-alias '$lib' --utils-alias '$lib/utils'` (if non-interactive flags fail, use PTY for interactive flow)
- [ ] Run `pnpm dlx shadcn-svelte@latest add button card input label badge tabs dialog separator avatar sheet dropdown-menu table tooltip switch skeleton --overwrite`
- [ ] Verify `components.json` was created at `platforms/web/components.json`
- [ ] Verify `$lib/utils.ts` was created with `cn()` function (clsx + tailwind-merge)

### Step 3: Foundation — Theme + Styles + Config

- [ ] Replace `platforms/web/src/app.css` with amber-themed shadcn CSS variables (see Background & Research for full CSS — `:root` light, `.dark` dark, `@theme inline` mapping, `@layer base`, reduced-motion media query)
- [ ] Update `platforms/web/src/app.html` — change `class="dark"` to `class="light"`, change `theme-color` from `#0f172a` to `#f59e0b`, add `meta description`
- [ ] Create `platforms/web/static/manifest.json` — new name, amber theme_color `#f59e0b`, white background_color, `start_url: /app/inbox`
- [ ] Create `platforms/web/src/lib/stores/theme.svelte.ts` — Svelte 5 runes theme store (see Background & Research for full code — $state, $effect, localStorage, light default)
- [ ] Recreate `platforms/web/src/lib/stores/__tests__/` directory for the theme test

### Step 4: Minimal placeholder route

- [ ] Create minimal `platforms/web/src/routes/+layout.svelte` — just imports `../app.css` and renders `{@render children()}` (placeholder for Phase 4 marketing layout)
- [ ] Create minimal `platforms/web/src/routes/+page.svelte` — just renders `<h1>AUQ</h1>` (placeholder for Phase 4 landing page)

---

## Parallelization Plan

### Batch 1 (parallel) — Cleanup + Dependency prep

- [ ] **Coder A**: Delete all old frontend files (Step 1 — all 23 files via `rm -rf` commands). Also create minimal placeholder `+layout.svelte` and `+page.svelte` (Step 4) → files: `platforms/web/src/routes/*` (non-api), `platforms/web/src/lib/components/`, `platforms/web/src/lib/stores/`, `platforms/web/src/app.css`, `platforms/web/static/manifest.json`

### Batch 2 (sequential after Batch 1) — Install + Init

- [ ] **Coder B**: Run dependency installation and shadcn-svelte init (Step 2). This is sequential: `pnpm install` → `shadcn-svelte init` → `shadcn-svelte add`. Use PTY if interactive fallback needed. → files: `platforms/web/package.json`, `platforms/web/components.json`, `platforms/web/src/lib/utils.ts` (auto-created)

### Batch 3 (parallel after Batch 2) — Foundation

- [ ] **Coder C**: Write theme test + theme store (Testing Plan + Step 3 partial) → files: `platforms/web/src/lib/stores/theme.svelte.ts`, `platforms/web/src/lib/stores/__tests__/theme.test.ts`
- [ ] **Coder D**: Customize app.css with amber tokens + update app.html + create manifest.json (Step 3 remaining) → files: `platforms/web/src/app.css`, `platforms/web/src/app.html`, `platforms/web/static/manifest.json`

### Dependencies

- Batch 2 depends on Batch 1: shadcn-svelte init needs a clean state (old files removed), and pnpm install needs deps in package.json
- Batch 3 depends on Batch 2: app.css needs to be customized AFTER shadcn-svelte init creates the base version; theme store imports from `$app/environment` which needs SvelteKit sync
- Batches 3C and 3D are independent (different files)

### Risk Areas

- **shadcn-svelte init interactivity**: The non-interactive flags may not work perfectly. Fallback: use PTY to answer prompts (style: new-york, base-color: slate, css: src/app.css, aliases: default $lib paths)
- **app.css conflict**: shadcn-svelte init will generate its own app.css. Coder D must REPLACE it entirely with the amber-themed version from Background & Research, not merge
- **pnpm install in submodule**: Must run in `platforms/web/` directory, not repo root
- **cn() utility**: shadcn-svelte init should auto-create `$lib/utils.ts`. If it doesn't, Coder B should create it manually using the code from Background & Research

---

## Done Criteria

- [ ] All 23 old frontend files deleted (no old components, stores, pages, styles remain)
- [ ] `better-auth` and `layerchart@next` in package.json dependencies
- [ ] `components.json` exists with shadcn-svelte config
- [ ] All 15 shadcn-svelte components installed in `src/lib/components/ui/`
- [ ] `$lib/utils.ts` exists with `cn()` function
- [ ] `app.css` has amber-themed CSS variables with `:root` (light), `.dark`, `@theme inline` mapping
- [ ] `app.html` has `class="light"` and `theme-color="#f59e0b"`
- [ ] `manifest.json` has amber theme, `/app/inbox` start_url
- [ ] `theme.svelte.ts` store works with light default, toggle, localStorage persistence
- [ ] Theme store test passes (`pnpm test -- theme` in `platforms/web/`)
- [ ] All pre-existing backend API tests still pass
- [ ] Placeholder `+layout.svelte` and `+page.svelte` exist so `pnpm dev` doesn't crash
- [ ] `pnpm check` passes in `platforms/web/`
