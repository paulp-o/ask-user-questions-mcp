---
change_id: 2026-03-16-frontend-redesign
title: Complete Frontend Redesign — Marketing Site + Auth + App Shell
status: approved
created: 2026-03-16
---

# Proposal: Complete Frontend Redesign

## Problem

The current AUQ web platform frontend has several critical issues that prevent it from functioning as a proper SaaS product:

1. **Visual quality** — The current implementation looks like raw HTML/CSS rather than a polished SaaS product. Lacks modern design patterns like cards with depth, proper spacing systems, and micro-interactions.
2. **Missing marketing layer** — Users are dropped directly into an API key input field with no explanation of what AUQ is, why it's valuable, or how to get started. There is no landing page, no hero section, no features overview.
3. **No pricing page** — There is no pricing page to explain tiers, convert visitors, or set expectations for usage limits.
4. **No usage analytics** — Users have no visibility into how many questions they've answered, their response times, or usage trends over time.
5. **No authentication** — The current app has no user accounts. API keys are entered manually with no account management. There's no way to manage multiple workspaces, revoke keys, or track usage per user.
6. **Poor onboarding** — The onboarding flow is confusing and unintuitive. There's no guided path from landing → signup → workspace creation → API key setup.

## Goals

- Rebuild the frontend from scratch with a Linear/Vercel-quality visual standard
- Create a proper marketing site with landing page and pricing page
- Add authentication via `better-auth` (email/password + GitHub + Google OAuth)
- Add usage analytics dashboard with charts (questions/day, response times, pending ratio)
- Implement light mode as default with dark mode toggle (broader appeal)
- Create a clear separation between public marketing pages (`/`, `/pricing`, `/login`, `/signup`) and authenticated app pages (`/app/*`)
- Mobile-first design — the core use case is answering questions from a phone
- Use shadcn-svelte as the UI component library for consistent, accessible, customizable components
- Use layerchart for D3-based usage analytics charts
- Hero with typewriter animation cycling through AI tool names (Claude Code, OpenClaw, Cursor, Windsurf, Devin, Open Code)
- Keep all backend API routes and infrastructure completely untouched

## Non-Goals

- Backend API changes — all `src/routes/api/v1/**` endpoints are frozen
- Database schema changes beyond what better-auth requires
- Mobile native app — this is a PWA only
- Billing/payment integration — pricing page is informational only for now
- Team collaboration features — reserved for future Pro tier
- Multi-language / i18n
- SSR for analytics data (client-side fetch is fine)

## Solution Overview

**Phase approach**: Systematic cleanup → dependency installation → foundation → auth → marketing → app → tests.

We delete all existing frontend code (pages, components, stores, styles) and rebuild from scratch. The backend API layer (`src/routes/api/`, `src/lib/api/`, `src/lib/db/`) is completely preserved. `better-auth` is added as a new dependency with its own DB tables via Drizzle migration.

**Tech choices**:
- shadcn-svelte for all UI components (buttons, cards, dialogs, inputs, tabs, badges, etc.)
- Tailwind v4 for utility styles with @theme tokens matching amber/orange accent
- better-auth for authentication with Drizzle adapter
- layerchart@next for analytics charts (Svelte 5 compatible)
- Svelte 5 runes mode ($state, $derived, $effect, $props) throughout

**Route structure**: Public marketing routes at `/` and `/pricing`. Auth routes at `/login` and `/signup`. All authenticated app pages behind `/app/` with server-side auth guards.

**Design language**: Linear/Vercel-inspired. Lots of whitespace. Monochrome base (slate grays) with amber/orange accent. Inter for UI, JetBrains Mono for code. Light mode default. Subtle CSS gradient backgrounds. No external image assets — code-generated visuals only.

## Success Criteria

- Landing page passes a "would I click the CTA" test — hero, features bento, pricing teaser, strong CTA
- New user can go from `/` → sign up → create workspace → copy API key in under 2 minutes
- Question inbox renders in <200ms with SSE real-time updates working
- Analytics dashboard shows question volume chart and response time stats
- All shadcn-svelte components respect the amber accent theme
- Mobile layout works on 375px viewport (iPhone SE)
- Light mode is default; dark mode toggle persists in localStorage
- better-auth login/signup flows work with email/password and at least GitHub OAuth
- All existing API tests still pass (no regression)
- At least 90% of new store logic is covered by unit tests