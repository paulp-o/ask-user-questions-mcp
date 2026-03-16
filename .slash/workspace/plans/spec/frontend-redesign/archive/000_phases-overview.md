---
created: 2026-03-16T12:00:00Z
last_updated: 2026-03-16T12:00:00Z
type: spec
change_id: 2026-03-16-frontend-redesign
status: done
trigger: "Complete frontend redesign: delete all frontend code, rebuild with shadcn-svelte + better-auth + layerchart. New landing page, pricing, auth, analytics dashboard. Linear/Vercel aesthetic, amber accent, mobile-first, light mode default."
estimated_phases: 4
---

# Phases Overview: Complete Frontend Redesign

## Background & Research

### User Interview Summary

- **Visual**: Linear/Vercel style — clean, minimal, whitespace, subtle gradients, monochrome + amber/orange accent
- **Hero**: "Keep your hand on the wheel" with typewriter animation cycling AI tool names (Claude Code, OpenClaw, Cursor, Windsurf, Devin, Open Code)
- **Audience**: Mix of technical and non-technical users (progressive disclosure)
- **Navigation**: Marketing (/, /pricing) + App behind /app/\*
- **Mobile**: Mobile-first design, desktop is stretched mobile
- **Theme**: Light mode default, dark toggle. No dark-first.
- **Auth**: better-auth — email/password + GitHub + Google OAuth
- **UI Library**: shadcn-svelte for ALL components
- **Charts**: layerchart@next (D3-based, Svelte 5 compatible)
- **Pricing**: Free (100 q/month) + Pro (unlimited + analytics + team)
- **Analytics**: Questions/day, avg response time, pending ratio
- **Branding**: Code-generated only (CSS gradients, SVG patterns, grids)
- **Typography**: Inter + JetBrains Mono (keep)
- **Animation**: Subtle micro-interactions only (200-300ms)
- **Store tests**: Delete and rewrite from scratch
- **Admin**: Keep but redesign

### Key Technology Decisions

- **shadcn-svelte**: Copy-paste components, bits-ui primitives, Tailwind v4 native, HSL CSS variables for theming
- **better-auth**: Drizzle SQLite adapter, creates user/session/account/verification tables, svelteKitHandler hook integration
- **layerchart@next**: Svelte 5 runes compatible, D3-powered, supports area/bar/line/donut charts
- **Tailwind v4**: @import "tailwindcss", @theme directive, HSL semantic tokens

### Files Overview

- **22 frontend files to DELETE** (pages, components, stores, styles, 3 store tests)
- **30+ backend files to KEEP** (API routes, DB, auth, handlers, infra, API tests)
- **3 config files to UPDATE** (hooks.server.ts, .env.example, package.json)
- **1 new backend endpoint** (GET /api/v1/analytics)

---

## Phase 1: Cleanup + Dependencies + Foundation (~15min) ✅ DONE

- Target tasks: tasks.md Phase 1 (lines 12-33), Phase 2 (lines 37-55), Phase 3 (lines 59-64)
- Dependencies: none
- Scope: Delete all old frontend files, install better-auth + shadcn-svelte + layerchart + all shadcn components, create new app.css with amber theme tokens, update app.html, create cn() utility, create theme store (light default)
- **Output**: Clean slate with all dependencies installed, Tailwind v4 theme configured, shadcn-svelte initialized
- **Status**: ✅ Completed — archived at archive/001_cleanup-deps-foundation.md

## Phase 2: Auth Full Stack (~20min)

- Target tasks: tasks.md Phase 4 (lines 67-75), Phase 5 (lines 78-83)
- Dependencies: Phase 1
- Scope: Create auth server config (src/lib/server/auth.ts), add better-auth DB tables to Drizzle schema, generate migration, create auth client, update hooks.server.ts for auth delegation, update .env.example, create /app/ layout with auth guard + app shell sidebar, OAuthButtons component (GitHub + Google), LoginForm, SignupForm, /login page, /signup page, auth.svelte.ts store wrapping better-auth client
- Coder parallelization: 4-5 agents (server auth + DB | auth client + store | hooks + env | login page + components | signup page + app layout)
- **Output**: Full auth infrastructure + complete login/signup flow — email/password + OAuth buttons, reactive auth state, auth guard on /app/*

## Phase 3: All UI — Marketing + App Pages + Charts + PWA (~25min)

- Target tasks: tasks.md Phase 6 (lines 87-88), Phase 7 (lines 92-99), Phase 8 (lines 103-106), Phase 9 (lines 110-117), Phase 10 (lines 120-122), Phase 11 (lines 126-133), Phase 12 (lines 137-138)
- Dependencies: Phase 2
- Scope: Analytics API endpoint + test, all stores (workspace, questions SSE, notifications, analytics), MarketingNav, Footer, root layout, Hero with typewriter, FeaturesBento, PricingTeaser, landing page, /pricing page, AppNav sidebar, QuestionCard, StatusBadge, AnswerForm, ApiKeyCard, UsageStatsCard, NotificationToggle, all chart components, all /app/* pages (inbox, question detail, analytics, settings, admin), service worker + manifest update
- Coder parallelization: 5-6 agents (marketing components+pages | stores | analytics endpoint | app components | app pages | charts)
- **Output**: Complete frontend — marketing site, app pages, charts, PWA, all stores functional

## Phase 4: Verification + Docs (~10min)

- Target tasks: tasks.md Phase 13 (lines 142-150), Phase 14 (lines 154-156)
- Dependencies: Phase 3
- Scope: Write store tests, run full test suite, verify TypeScript compilation, verify build, update README, update OpenAPI spec, update .env.example
- **Output**: All tests passing, TypeScript clean, build succeeds, docs updated, ready for deployment