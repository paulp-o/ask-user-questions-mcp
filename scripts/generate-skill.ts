#!/usr/bin/env bun
/**
 * Agent Skill Generator Script
 *
 * Generates the SKILL.md file for the ask-user-questions agent skill.
 * Uses TOOL_DESCRIPTION from src/shared/schemas.ts as the source of truth.
 *
 * Run: bun run scripts/generate-skill.ts
 * Or: bun run generate:skill
 */

import {
  existsSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  renameSync,
  unlinkSync,
} from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { TOOL_DESCRIPTION } from "../src/shared/schemas.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");

// Output paths
const SKILL_DIR = join(rootDir, "skills/ask-user-questions");
const SKILL_FILE = join(SKILL_DIR, "SKILL.md");

/**
 * Read version from package.json
 */
function getVersion(): string {
  const packageJsonPath = join(rootDir, "package.json");
  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
    return packageJson.version;
  } catch (error) {
    console.error(`Error reading package.json: ${error}`);
    process.exit(1);
  }
}

/**
 * Generate SKILL.md using TOOL_DESCRIPTION as the prompt content
 */
function generateSkillMd(version: string): string {
  return `---
name: ask-user-questions
description: Ask clarifying questions to users via interactive TUI. Use when you need user input on preferences, implementation choices, or ambiguous instructions.
license: MIT
metadata:
  author: paulp-o
  version: "${version}"
---

# Ask User Questions

${TOOL_DESCRIPTION}

## Usage

\`\`\`bash
# Ask questions via CLI
npx auq ask '{"questions": [...]}'

# Or pipe JSON input
echo '{"questions": [...]}' | npx auq ask
\`\`\`

## Parameters

\`\`\`json
{
  "questions": [
    {
      "prompt": "Which authentication method would you like to use?",
      "title": "Auth",
      "options": [
        {"label": "JWT (Recommended)", "description": "Stateless, scalable"},
        {"label": "Session cookies", "description": "Traditional, server-side"}
      ],
      "multiSelect": false
    }
  ]
}
\`\`\`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| \`questions\` | array | Yes | 1-5 question objects |
| \`questions[].prompt\` | string | Yes | Full question text |
| \`questions[].title\` | string | Yes | Short label (max 12 chars) |
| \`questions[].options\` | array | Yes | 2-5 options with \`label\` and optional \`description\` |
| \`questions[].multiSelect\` | boolean | Yes | Allow multiple selections |
`;
}

/**
 * Write file atomically using temp file + rename pattern
 */
function writeFileAtomic(filePath: string, content: string): void {
  const tempPath = `${filePath}.tmp`;
  try {
    writeFileSync(tempPath, content, "utf-8");
    renameSync(tempPath, filePath);
  } catch (error) {
    try {
      if (existsSync(tempPath)) {
        unlinkSync(tempPath);
      }
    } catch {
      // Ignore cleanup errors
    }
    throw error;
  }
}

/**
 * Main generation function
 */
function main(): void {
  console.log("🔧 Generating Agent Skill...\n");

  const version = getVersion();
  console.log(`📦 Package version: ${version}`);

  // Create skill directory if it doesn't exist
  if (!existsSync(SKILL_DIR)) {
    mkdirSync(SKILL_DIR, { recursive: true });
    console.log(`📁 Created directory: skills/ask-user-questions/`);
  }

  // Generate and write SKILL.md
  const skillContent = generateSkillMd(version);
  writeFileAtomic(SKILL_FILE, skillContent);
  console.log(`✓ Generated: skills/ask-user-questions/SKILL.md`);

  console.log(`\n✅ Agent Skill generation complete!`);
}

// Run the generator
try {
  main();
} catch (error) {
  console.error(`\n❌ Error generating skill files:`);
  console.error(error);
  process.exit(1);
}
