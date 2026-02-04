# Change: Add Agent Skills Support

## Why

AI agents using AUQ currently receive usage instructions via MCP tool descriptions or OpenCode plugin metadata. The [Agent Skills](https://agentskills.io) specification provides a standardized, portable format for teaching agents how to use tools effectively. By providing an AUQ skill following this specification, agents across all skills-compatible environments (Claude Code, Cursor, VS Code, Gemini CLI, etc.) can discover and load AUQ usage instructions on demand.

## What Changes

- **New skill directory**: `skills/ask-user-questions/` containing `SKILL.md` and `references/API.md`
- **New generator script**: `scripts/generate-skill.ts` that extracts tool description from `src/shared/schemas.ts`
- **Build integration**: `bun run build` now generates the skill; build fails if generation fails
- **Sync command extension**: `bun run sync-plugin-schemas` extended to sync skill content
- **Validation**: skills-ref CLI validates generated skill during CI
- **Documentation**: README.md updated with Agent Skills section

## Impact

- **Affected specs**: New `agent-skills` capability
- **Affected code**:
  - `scripts/generate-skill.ts` (new)
  - `skills/ask-user-questions/SKILL.md` (new, generated)
  - `skills/ask-user-questions/references/API.md` (new, generated)
  - `package.json` (new scripts)
  - `README.md` (documentation update)
- **No breaking changes**: Existing MCP and OpenCode integrations unchanged
- **Distribution**: Generated files committed to git, NOT included in npm package (repo-only)
