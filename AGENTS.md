# Repository Guidelines

## Project Structure & Module Organization
Core source code lives in `src/`.
- `src/server.ts` starts the MCP server.
- `src/cli/` contains CLI commands (`answer`, `sessions`, `history`, `config`, `update`).
- `src/session/` manages session lifecycle and persistence.
- `src/tui/` and `src/tui-opentui/` contain Ink/OpenTUI interfaces.
- `src/__tests__/` and module-level `__tests__/` folders hold test suites.

Generated/build outputs are in `dist/`. JSON schemas are in `schemas/`. Tooling scripts are in `scripts/`. The OpenCode plugin is a separate workspace in `packages/opencode-plugin/`.

## Build, Test, and Development Commands
Use Bun (required by this repo).
- `bun install` installs dependencies.
- `bun run start` runs the server directly from TypeScript.
- `bun run dev` starts FastMCP dev mode (with inspector).
- `bun run build` regenerates skill/schema artifacts and compiles TypeScript.
- `bun run test` runs Vitest test suites.
- `bun run test:opentui` runs OpenTUI-specific tests.
- `bun run lint` runs Prettier check, ESLint, and type checks.
- `bun run format` applies Prettier + ESLint auto-fixes.

## Coding Style & Naming Conventions
TypeScript + ESM is standard. Follow Prettier defaults (2-space indent, semicolons, double quotes as formatted by project config).
- File naming: kebab-case for modules (`session-watcher.ts`), PascalCase for React components (`ReviewScreen.tsx`).
- Tests: colocate as `*.test.ts` or `*.test.tsx` under `__tests__/` where possible.
- Prefer small, focused modules; keep shared types in `types.ts` files.

## Testing Guidelines
Frameworks: Vitest and `ink-testing-library`.
- Add unit tests for all logic changes.
- Add UI interaction tests for TUI behavior changes.
- Run `bun run test` before opening a PR.
- For OpenTUI-only changes, also run `bun run test:opentui`.

## Commit & Pull Request Guidelines
Use Conventional Commits (seen in history), e.g.:
- `feat(tui): add session quick-switch hint`
- `fix(session): prevent stale watcher leak`

PRs should include:
- concise problem/solution summary,
- linked issue (if available),
- test evidence (commands run),
- screenshots or terminal captures for TUI/UX changes.

## Security & Configuration Tips
Do not commit local config or secrets (for example `.auqrc.json` with machine-specific values). Prefer `.auqrc.example.json` as a template. Validate skill changes with `bun run validate:skill` before release-related work.
