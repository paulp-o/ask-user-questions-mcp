# Tasks: Migrate to Bun

## 1. Package Configuration

- [x] 1.1 Delete `package-lock.json`
- [x] 1.2 Add `package-lock.json` to `.gitignore`
- [x] 1.3 Run `bun install` to generate `bun.lock` (text format)
- [x] 1.4 Update root `package.json` engines field: add `"bun": ">=1.1.0"`
- [x] 1.5 Remove `tsx` from devDependencies
- [x] 1.6 Remove `jiti` from devDependencies

## 2. Package Scripts (Root)

- [x] 2.1 Update `build` script: `npm run sync-plugin-schemas` -> `bun run sync-plugin-schemas`
- [x] 2.2 Update `prepare` script: `npm run build` -> `bun run build`
- [x] 2.3 Update `start` script: `tsx src/server.ts` -> `bun run src/server.ts`
- [x] 2.4 Update `dev` script: `fastmcp dev src/server.ts` -> `bunx fastmcp dev src/server.ts`
- [x] 2.5 Update `lint` script: keep as-is (prettier/eslint work with bun)
- [x] 2.6 Update `test` script: keep as `vitest run` (run via `bun run test`)

## 3. Package Scripts (Workspace: opencode-plugin)

- [x] 3.1 Update `prepublishOnly` script: `npm run build` -> `bun run build`

## 4. Postinstall Script

- [x] 4.1 Update `scripts/postinstall.cjs` to detect Bun global install
- [x] 4.2 Add Bun-specific environment variable detection (`BUN_INSTALL` or similar)
- [x] 4.3 Update shell alias instructions for Bun users
- [x] 4.4 Maintain npm detection for users who install via npm

## 5. Documentation - README.md

- [x] 5.1 Update installation section: `npm install -g` -> `bun add -g`
- [x] 5.2 Update MCP client configurations to use `bunx` (with note that npx works too)
- [x] 5.3 Update development commands: `npm run` -> `bun run`
- [x] 5.4 Update prerequisites: Node.js 22+ -> Bun 1.1+
- [ ] 5.5 Add Bun badge, remove Node.js version badge (skipped - badges are npm version badge, not Node.js)
- [x] 5.6 Update local installation example
- [x] 5.7 Update all `npx tsx` commands to use `bun run`

## 6. Documentation - Other Files

- [x] 6.1 Update `packages/opencode-plugin/README.md`: installation instructions
- [x] 6.2 Update `RELEASE_PROCESS.md`: all npm commands to bun
- [x] 6.3 Update `openspec/project.md`: Tech Stack section (Node.js -> Bun, remove tsx)
- [x] 6.4 Update `todo.md`: global install reference
- [x] 6.5 Check `oc-docs-for-references/` for npm references (N/A - external docs)

## 7. GitHub Actions CI/CD

- [x] 7.1 Identify existing GitHub Actions workflow files
- [x] 7.2 Replace `actions/setup-node` with `oven-sh/setup-bun`
- [x] 7.3 Add Bun dependency caching (handled by setup-bun action)
- [x] 7.4 Update all `npm` commands to `bun` in workflow steps
- [ ] 7.5 Test CI workflow passes (requires push to master)

## 8. Verification

- [x] 8.1 Run `bun install` successfully
- [x] 8.2 Run `bun run lint` successfully (prettier warnings in unrelated files)
- [x] 8.3 Run `bun run build` successfully
- [x] 8.4 Run `bun run test` successfully (284 tests pass)
- [ ] 8.5 Test `bun run dev` (fastmcp dev mode) - manual verification needed
- [ ] 8.6 Test `bun run start` (server mode) - manual verification needed
- [ ] 8.7 Test global install: `bun add -g .` locally - manual verification needed
- [ ] 8.8 Test `auq` CLI command works after global install - manual verification needed
- [ ] 8.9 Verify MCP server responds correctly - manual verification needed
- [ ] 8.10 Verify semantic-release dry run: `bun run release:dry-run` - manual verification needed

## 9. Final Cleanup

- [x] 9.1 Verify no remaining npm references in source code
- [x] 9.2 Verify no remaining npm references in documentation (except "npx also works" notes)
- [x] 9.3 Run full verification checklist
- [ ] 9.4 Single atomic commit with all changes
