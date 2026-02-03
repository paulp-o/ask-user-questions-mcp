# Design: Migrate to Bun

## Context

The AUQ project currently uses npm as the package manager and tsx for TypeScript execution during development. While this works, Bun offers significant performance improvements (5-20x faster installs) and native TypeScript execution. The user has confirmed the project already works with Bun, making this a formalization of Bun as the primary toolchain.

### Stakeholders

- **Maintainers**: Primary beneficiaries of faster dev workflow
- **Contributors**: Need to install Bun for development
- **End Users**: Unaffected (can still use npm/pnpm/yarn to install)

## Goals / Non-Goals

### Goals

- Standardize on Bun for development workflow
- Remove unnecessary dev dependencies (tsx, jiti)
- Update all documentation to reflect Bun-first approach
- Update CI/CD to use Bun
- Maintain full compatibility for end users

### Non-Goals

- Replacing tsc with bun build (keep tsc for npm package compatibility)
- Requiring Bun for end users (they can use any package manager)
- Creating bunfig.toml (defaults work fine)
- Using Bun's native test runner (keep Vitest for familiarity)

## Decisions

### Decision 1: Keep tsc for production builds

**Rationale**: The compiled output in `dist/` must work for npm package consumers who may not have Bun. tsc produces standard JavaScript that works everywhere.
**Alternative**: bun build - rejected because it might produce Bun-specific output

### Decision 2: Use bun.lock (text format) instead of bun.lockb (binary)

**Rationale**: Text format is human-readable and produces cleaner git diffs for code review
**Alternative**: bun.lockb (binary) - rejected for poor git diffability

### Decision 3: Document bunx with "npx also works" note

**Rationale**: Full Bun migration while being helpful to users who haven't installed Bun globally
**Alternative**: Keep npx everywhere - rejected because it contradicts full migration goal

### Decision 4: Detect both Bun and npm in postinstall

**Rationale**: Published package can be installed via any package manager, postinstall should help all users
**Alternative**: Bun-only detection - rejected because npm users still exist

### Decision 5: Remove tsx and jiti

**Rationale**: Bun natively executes TypeScript, making these redundant
**Alternative**: Keep as optional tools - rejected for clean dependency tree

## Risks / Trade-offs

### Risk 1: Contributors need Bun installed

**Mitigation**: Add clear prerequisites in README and CONTRIBUTING

### Risk 2: CI may be slower first run (Bun cache cold)

**Mitigation**: Configure Bun caching in GitHub Actions

### Risk 3: semantic-release compatibility uncertain

**Mitigation**: Test with `bun run release:dry-run` before committing

### Risk 4: Some edge cases may differ between Bun and Node.js

**Mitigation**: Full test suite must pass; manual verification of key workflows

## Migration Plan

### Phase 1: Package Configuration

1. Delete package-lock.json
2. Add to .gitignore
3. Run bun install
4. Update package.json scripts and engines

### Phase 2: Remove Unused Dependencies

1. Remove tsx from devDependencies
2. Remove jiti from devDependencies

### Phase 3: Update Scripts

1. Update all npm run -> bun run references
2. Update postinstall.cjs for dual detection

### Phase 4: Update Documentation

1. README.md (most impactful)
2. Workspace README
3. RELEASE_PROCESS.md
4. openspec/project.md

### Phase 5: CI/CD

1. Update GitHub Actions workflows
2. Add caching

### Phase 6: Verification

1. Run full test suite
2. Manual verification checklist
3. semantic-release dry run

## Verification Checklist

After migration, verify:

- [ ] `bun install` succeeds
- [ ] `bun run lint` passes
- [ ] `bun run build` produces valid output
- [ ] `bun test` passes all tests
- [ ] `bun run dev` starts FastMCP inspector
- [ ] `bun run start` runs MCP server
- [ ] Global install works: `bun add -g .`
- [ ] `auq` CLI responds correctly
- [ ] MCP tool call works end-to-end
- [ ] `bun run release:dry-run` succeeds
- [ ] CI workflow passes

## Open Questions

None - all questions resolved during spec creation.
