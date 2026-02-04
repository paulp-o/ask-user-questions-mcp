# Tasks: Add Agent Skills Support

## 1. Skill Generator Script

- [ ] 1.1 Create `scripts/` directory at repo root
- [ ] 1.2 Implement `scripts/generate-skill.ts` with the following functionality:
  - Read `TOOL_DESCRIPTION` from `src/shared/schemas.ts`
  - Read version from `package.json`
  - Generate `SKILL.md` with proper frontmatter (name, description, license, compatibility, metadata)
  - Generate `references/API.md` with full JSON schema from Zod schemas
  - Write files atomically to `skills/ask-user-questions/`
- [ ] 1.3 Add `tsx` as dev dependency if not present (for running TypeScript scripts)

## 2. Build Integration

- [ ] 2.1 Add `generate:skill` script to `package.json`: `bun run scripts/generate-skill.ts`
- [ ] 2.2 Update `build` script in `package.json` to include skill generation
- [ ] 2.3 Extend `sync-plugin-schemas` script to trigger skill generation
- [ ] 2.4 Ensure build fails if skill generation fails (exit code propagation)

## 3. Skill Directory Structure

- [ ] 3.1 Create `skills/ask-user-questions/` directory
- [ ] 3.2 Generate initial `SKILL.md` with:
  - Frontmatter: name, description, license (MIT), compatibility, metadata (author, version)
  - Body: Tool usage instructions derived from `TOOL_DESCRIPTION`
- [ ] 3.3 Generate initial `references/API.md` with:
  - Full JSON schema for `ask_user_questions` parameters
  - Parameter descriptions extracted from Zod schemas

## 4. Validation

- [ ] 4.1 Add `skills-ref` as dev dependency for skill validation
- [ ] 4.2 Add `validate:skill` script to `package.json`: `skills-ref validate skills/ask-user-questions`
- [ ] 4.3 Add validation to CI workflow (GitHub Actions)
- [ ] 4.4 Verify generated skill passes `skills-ref validate` locally

## 5. Documentation

- [ ] 5.1 Add "Agent Skills" section to README.md explaining:
  - What agent skills are
  - Where the skill is located
  - How to use it with skills-compatible agents
  - How to regenerate the skill
- [ ] 5.2 Add inline comments to generator script explaining the generation process

## 6. Testing

- [ ] 6.1 Run `bun run build` and verify skill is generated
- [ ] 6.2 Run `skills-ref validate skills/ask-user-questions` and verify it passes
- [ ] 6.3 Test skill content by manually reading with `cat skills/ask-user-questions/SKILL.md`
- [ ] 6.4 Verify skill version matches package.json version
