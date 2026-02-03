# Change: Migrate from npm to Bun

## Why

The project currently uses npm as the package manager and tsx for TypeScript execution during development. Bun provides 5-20x faster package installation, native TypeScript execution, and a more streamlined developer experience. Since the project already works with Bun (as noted by the user), this migration formalizes Bun as the primary development toolchain while maintaining compatibility for end users who install via npm/pnpm/yarn.

## What Changes

### Package Management

- Replace `npm install` with `bun install` for development workflow
- Replace `npm run` with `bun run` in all scripts and documentation
- Replace `npx` with `bunx` in documentation and MCP client configurations
- Delete `package-lock.json` and add to `.gitignore`
- Generate `bun.lock` (text format) as the new lockfile
- Add `"bun": ">=1.1.0"` to engines field in package.json

### Development Tools

- Remove `tsx` devDependency (Bun executes TypeScript natively)
- Remove `jiti` devDependency (Bun handles ESM natively)
- Update `start` script to use `bun run src/server.ts`
- Update `dev` script to use `bunx fastmcp dev src/server.ts`
- Keep `tsc` for production builds (npm package compatibility)

### Documentation

- Update README.md: installation instructions, MCP client configs, development commands
- Update packages/opencode-plugin/README.md: installation instructions
- Update RELEASE_PROCESS.md: release workflow commands
- Update openspec/project.md: tech stack section
- Update todo.md: global install reference
- Add Bun badge, remove Node.js badge from README

### Scripts

- Update `postinstall.cjs` to detect both Bun and npm global installs
- Update `prepare` script: `npm run build` -> `bun run build`
- Update workspace `prepublishOnly` script: `npm run build` -> `bun run build`
- Update all cross-script references in package.json

### CI/CD

- Update GitHub Actions workflows to use `oven-sh/setup-bun`
- Add Bun dependency caching for faster CI builds
- Replace `setup-node` with `setup-bun` in all jobs

## Impact

- **Affected specs**: None (behavior unchanged; tooling-only change)
- **Affected code**:
  - `package.json` (root and workspace)
  - `scripts/postinstall.cjs`
  - `.github/workflows/*`
  - `.gitignore`
- **Affected docs**:
  - `README.md`
  - `packages/opencode-plugin/README.md`
  - `RELEASE_PROCESS.md`
  - `openspec/project.md`
  - `todo.md`

## Non-Breaking for End Users

The published npm package remains fully compatible with npm, pnpm, and yarn. This migration affects only the development workflow. End users can continue to install via any package manager:

- `bun add -g auq-mcp-server` (recommended)
- `npm install -g auq-mcp-server` (works)
- `pnpm add -g auq-mcp-server` (works)
- `yarn global add auq-mcp-server` (works)

## Runtime Requirements

- **Before**: Node.js 22+
- **After**: Bun 1.1+ (for development); Node.js still works at runtime for end users
