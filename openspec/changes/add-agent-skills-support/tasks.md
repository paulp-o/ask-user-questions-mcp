# Tasks: Add Agent Skills Support

## 1. Skill Generator Script

- [x] 1.1 Create `scripts/` directory at repo root
- [x] 1.2 Implement `scripts/generate-skill.ts` with the following functionality:
  - Read `TOOL_DESCRIPTION` from `src/shared/schemas.ts`
  - Read version from `package.json`
  - Generate `SKILL.md` with proper frontmatter (name, description, license, compatibility, metadata)
  - Generate `references/API.md` with full JSON schema from Zod schemas
  - Write files atomically to `skills/ask-user-questions/`
- [x] 1.3 Add `tsx` as dev dependency if not present (for running TypeScript scripts)
  - Note: Not needed - using `bun run` directly which handles TypeScript natively

## 2. Build Integration

- [x] 2.1 Add `generate:skill` script to `package.json`: `bun run scripts/generate-skill.ts`
- [x] 2.2 Update `build` script in `package.json` to include skill generation
- [x] 2.3 Extend `sync-plugin-schemas` script to trigger skill generation
- [x] 2.4 Ensure build fails if skill generation fails (exit code propagation)

## 3. Skill Directory Structure

- [x] 3.1 Create `skills/ask-user-questions/` directory with subdirectories:
  - `scripts/` - Bundled executable TypeScript scripts
  - `references/` - API documentation
- [x] 3.2 Generate initial `SKILL.md` with:
  - Frontmatter: name, description, license (MIT), compatibility, metadata (author, version)
  - Body: Tool usage instructions with script references
- [x] 3.3 Generate initial `references/API.md` with:
  - Full JSON schema for `ask_user_questions` parameters
  - Parameter descriptions, examples, and validation guide
- [x] 3.4 Create `scripts/ask.ts` - Bun executable CLI runner
  - Accepts JSON from stdin or CLI argument
  - Invokes `bunx auq ask` with payload
  - Returns results as JSON
- [x] 3.5 Create `scripts/validate-params.ts` - Standalone schema validator
  - Self-contained JSON schema validation
  - Outputs `{valid: true/false, errors: [...]}`
  - Exit code 0 for valid, 1 for invalid

## 4. Validation

- [x] 4.1 Add `skills-ref` as dev dependency for skill validation
  - Note: Using `bunx skills-ref` instead of adding as dev dependency (on-demand install)
- [x] 4.2 Add `validate:skill` script to `package.json`: `skills-ref validate skills/ask-user-questions`
- [x] 4.3 Add validation to CI workflow (GitHub Actions)
- [x] 4.4 Verify generated skill passes `skills-ref validate` locally

## 5. Documentation

- [x] 5.1 Add "Agent Skills" section to README.md explaining:
  - What agent skills are
  - Where the skill is located
  - How to use it with skills-compatible agents
  - How to regenerate the skill
- [x] 5.2 Add inline comments to generator script explaining the generation process

## 6. Testing

- [x] 6.1 Run `bun run build` and verify skill is generated
- [x] 6.2 Run `skills-ref validate skills/ask-user-questions` and verify it passes
- [x] 6.3 Test skill content by manually reading with `cat skills/ask-user-questions/SKILL.md`
- [x] 6.4 Verify skill version matches package.json version
