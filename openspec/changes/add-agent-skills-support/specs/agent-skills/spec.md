# Agent Skills Specification

## Purpose

This capability defines how AUQ provides an Agent Skill following the [agentskills.io](https://agentskills.io) specification, enabling AI agents to discover and load AUQ usage instructions in a standardized format.

## ADDED Requirements

### Requirement: Skill Directory Structure

The system SHALL provide an Agent Skill in the `skills/ask-user-questions/` directory following the agentskills.io specification.

#### Scenario: Valid skill structure exists

- **WHEN** a user or agent inspects the skill directory
- **THEN** the directory contains a `SKILL.md` file
- **AND** the directory contains a `references/API.md` file

#### Scenario: Skill directory location

- **WHEN** an agent searches for the AUQ skill
- **THEN** the skill is located at `skills/ask-user-questions/` relative to the repository root

---

### Requirement: SKILL.md Frontmatter

The SKILL.md file SHALL contain valid YAML frontmatter with all required and configured metadata fields.

#### Scenario: Required frontmatter fields

- **WHEN** the SKILL.md frontmatter is parsed
- **THEN** it contains a `name` field with value `ask-user-questions`
- **AND** it contains a `description` field derived from the tool description
- **AND** it contains a `license` field with value `MIT`
- **AND** it contains a `compatibility` field with value `Requires auq CLI installed`

#### Scenario: Metadata fields

- **WHEN** the SKILL.md frontmatter is parsed
- **THEN** it contains a `metadata.author` field with value `paulp-o`
- **AND** it contains a `metadata.version` field matching the package.json version

#### Scenario: Name validation

- **WHEN** the skill name is validated
- **THEN** it contains only lowercase letters, numbers, and hyphens
- **AND** it does not start or end with a hyphen
- **AND** it does not contain consecutive hyphens

---

### Requirement: SKILL.md Body Content

The SKILL.md body SHALL contain tool usage instructions identical to those provided via MCP and OpenCode plugin.

#### Scenario: Tool description content

- **WHEN** an agent reads the SKILL.md body
- **THEN** the content includes the complete `TOOL_DESCRIPTION` from `src/shared/schemas.ts`
- **AND** the content explains when to use the ask_user_questions tool
- **AND** the content explains the available parameters

#### Scenario: Content synchronization

- **WHEN** the `TOOL_DESCRIPTION` in schemas.ts is updated
- **AND** the skill is regenerated
- **THEN** the SKILL.md body reflects the updated content

---

### Requirement: API Reference Document

The system SHALL provide a references/API.md file containing the complete JSON schema for the tool parameters.

#### Scenario: JSON schema content

- **WHEN** an agent reads references/API.md
- **THEN** it contains the full JSON schema for the `ask_user_questions` parameters
- **AND** the schema includes property descriptions extracted from Zod schemas

#### Scenario: Schema synchronization

- **WHEN** the Zod schemas in schemas.ts are updated
- **AND** the skill is regenerated
- **THEN** the references/API.md reflects the updated schema

---

### Requirement: Skill Generation Script

The system SHALL provide a generator script that creates the skill files from the source of truth.

#### Scenario: Generator location

- **WHEN** a developer looks for the skill generator
- **THEN** it is located at `scripts/generate-skill.ts`

#### Scenario: Generator execution

- **WHEN** the generator script is executed
- **THEN** it reads `TOOL_DESCRIPTION` from `src/shared/schemas.ts`
- **AND** it reads the version from `package.json`
- **AND** it generates `skills/ask-user-questions/SKILL.md`
- **AND** it generates `skills/ask-user-questions/references/API.md`

#### Scenario: Generator error handling

- **WHEN** the generator cannot read required source files
- **THEN** it exits with a non-zero exit code
- **AND** it prints an error message describing the failure

---

### Requirement: Build Integration

The skill generation SHALL be integrated into the build process.

#### Scenario: Build includes skill generation

- **WHEN** `bun run build` is executed
- **THEN** the skill files are generated as part of the build

#### Scenario: Build failure on generation error

- **WHEN** skill generation fails during build
- **THEN** the entire build fails with a non-zero exit code

#### Scenario: Sync command includes skill

- **WHEN** `bun run sync-plugin-schemas` is executed
- **THEN** the skill files are regenerated

---

### Requirement: Skill Validation

The generated skill SHALL be validated using the official skills-ref CLI.

#### Scenario: Local validation

- **WHEN** a developer runs `bun run validate:skill`
- **THEN** the skills-ref CLI validates the skill structure
- **AND** validation passes for correctly generated skills

#### Scenario: CI validation

- **WHEN** code is pushed to the repository
- **THEN** the CI workflow validates the generated skill
- **AND** the build fails if skill validation fails

---

### Requirement: Git Tracking

The generated skill files SHALL be committed to the git repository.

#### Scenario: Skill files in git

- **WHEN** a user clones the repository
- **THEN** the `skills/ask-user-questions/SKILL.md` file is present
- **AND** the `skills/ask-user-questions/references/API.md` file is present

#### Scenario: Skill not in npm package

- **WHEN** a user installs the npm package
- **THEN** the skills directory is NOT included in the installed package

---

### Requirement: README Documentation

The README.md SHALL document the Agent Skills feature.

#### Scenario: Agent Skills section

- **WHEN** a user reads the README.md
- **THEN** there is an "Agent Skills" section explaining the feature
- **AND** it explains what agent skills are
- **AND** it explains where the skill is located
- **AND** it explains how to use the skill with compatible agents
- **AND** it explains how to regenerate the skill
