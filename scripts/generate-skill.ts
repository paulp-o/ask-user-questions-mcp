#!/usr/bin/env bun
/**
 * Agent Skill Generator Script
 *
 * Generates the SKILL.md and references/API.md files for the ask-user-questions
 * agent skill following the agentskills.io specification.
 *
 * This script reads from the source of truth:
 * - TOOL_DESCRIPTION from src/shared/schemas.ts
 * - Version from package.json
 * - Schema limits and defaults for JSON schema generation
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
import {
  TOOL_DESCRIPTION,
  DEFAULT_LIMITS,
  SCHEMA_LIMITS,
} from "../src/shared/schemas.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");

// Output paths
const SKILL_DIR = join(rootDir, "skills/ask-user-questions");
const SCRIPTS_DIR = join(SKILL_DIR, "scripts");
const REFERENCES_DIR = join(SKILL_DIR, "references");
const SKILL_FILE = join(SKILL_DIR, "SKILL.md");
const API_FILE = join(REFERENCES_DIR, "API.md");

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
 * Generate the SKILL.md content following agentskills.io specification
 * Includes bundled scripts for validation and execution
 */
function generateSkillMd(version: string): string {
  return `---
name: ask-user-questions
description: Ask clarifying questions to users during AI task execution. Use when you need user input on preferences, implementation choices, or ambiguous instructions.
license: MIT
compatibility: Requires auq CLI installed (bun add -g auq-mcp-server) or bunx auq
metadata:
  author: paulp-o
  version: "${version}"
---

# Ask User Questions

Enable human-in-the-loop interactions by asking clarifying questions during AI task execution. Questions appear in a separate terminal UI, allowing users to respond without interrupting their workflow.

## When to Use

- **Gather preferences**: "Which authentication method do you prefer?"
- **Clarify ambiguity**: "Should I use REST or GraphQL for this API?"
- **Get implementation decisions**: "Which database should I use?"
- **Offer choices**: "Which features should I enable?"

**Do NOT use for:**
- Confirmation prompts ("Should I proceed?", "Is this plan ready?")
- Yes/no questions that don't offer meaningful choices

## How It Works

1. Call the \`ask_user_questions\` MCP tool with your questions
2. A session is created and displayed in the AUQ terminal UI
3. User selects answers (with option for custom "Other" input)
4. Formatted answers are returned to your agent

## Usage

### Via MCP Tool

\`\`\`json
{
  "questions": [
    {
      "prompt": "Which authentication method would you like to use?",
      "title": "Auth",
      "options": [
        {"label": "JWT (Recommended)", "description": "Stateless, scalable"},
        {"label": "Session cookies", "description": "Traditional, server-side"},
        {"label": "OAuth 2.0", "description": "Third-party providers"}
      ],
      "multiSelect": false
    }
  ]
}
\`\`\`

### Via Bundled Scripts

\`\`\`bash
# Validate parameters before sending
bun scripts/validate-params.ts '{"questions": [...]}'

# Execute the ask command
bun scripts/ask.ts '{"questions": [...]}'

# Or pipe JSON from stdin
echo '{"questions": [...]}' | bun scripts/ask.ts
\`\`\`

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`questions\` | array | Yes | ${SCHEMA_LIMITS.MIN_QUESTIONS}-${DEFAULT_LIMITS.maxQuestions} question objects |

Each question object:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| \`prompt\` | string | Yes | Full question text (end with ?) |
| \`title\` | string | Yes | Short label, max 12 chars |
| \`options\` | array | Yes | ${SCHEMA_LIMITS.MIN_OPTIONS}-${DEFAULT_LIMITS.maxOptions} option objects |
| \`multiSelect\` | boolean | Yes | Allow multiple selections |

Each option object:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| \`label\` | string | Yes | Display text (1-5 words) |
| \`description\` | string | No | Context about trade-offs |

## Examples

### Single-Select Question

\`\`\`json
{
  "questions": [{
    "prompt": "Which programming language do you want to use?",
    "title": "Language",
    "options": [
      {"label": "TypeScript (Recommended)", "description": "Type-safe, modern"},
      {"label": "JavaScript", "description": "Flexible, universal"},
      {"label": "Python", "description": "Great for scripting"}
    ],
    "multiSelect": false
  }]
}
\`\`\`

### Multi-Select Question

\`\`\`json
{
  "questions": [{
    "prompt": "Which features do you want to enable?",
    "title": "Features",
    "options": [
      {"label": "Dark mode (Recommended)"},
      {"label": "Notifications (Recommended)"},
      {"label": "Analytics"},
      {"label": "Export to PDF"}
    ],
    "multiSelect": true
  }]
}
\`\`\`

## Output

The tool returns formatted text with user answers:

\`\`\`
Question 1: Which authentication method would you like to use?
Answer: JWT (Recommended)

Question 2: Which features do you want to enable?
Answer: Multiple selections:
- Dark mode
- Notifications
\`\`\`

## Bundled Scripts

### scripts/ask.ts
Bun executable CLI runner that invokes \`bunx auq ask\` with the provided JSON payload.

\`\`\`bash
bun scripts/ask.ts '{"questions": [...]}'
\`\`\`

### scripts/validate-params.ts
Standalone schema validator that checks parameters against the JSON schema.

\`\`\`bash
bun scripts/validate-params.ts '{"questions": [...]}'
# Output: {"valid": true/false, "errors": [...]}
\`\`\`

## Best Practices

1. **Always recommend an option** - Add "(Recommended)" to the best choice
2. **Keep questions focused** - One decision per question
3. **Provide context** - Use descriptions to explain trade-offs
4. **Use multiSelect wisely** - Only when choices aren't mutually exclusive
5. **Be specific** - "Which database?" not "What do you think about databases?"

## Troubleshooting

### Questions not appearing
- Ensure AUQ CLI is running: \`auq\` or \`bunx auq\`
- Check MCP server is connected

### Timeout issues
- Sessions don't timeout by default
- Configure in \`.auqrc.json\` if needed

## See Also

- [API Reference](references/API.md) - Full JSON schema and validation details
- [AUQ Repository](https://github.com/paulp-o/ask-user-questions-mcp) - Source code
`;
}

/**
 * Build JSON Schema from our known schema structure
 * This avoids adding zod-to-json-schema as a dependency
 */
function buildJsonSchema(): object {
  return {
    $schema: "http://json-schema.org/draft-07/schema#",
    type: "object",
    properties: {
      questions: {
        type: "array",
        description: `Questions to ask the user (${SCHEMA_LIMITS.MIN_QUESTIONS}-${DEFAULT_LIMITS.maxQuestions} questions). Each question must include: prompt (full question text), title (short label, max 12 chars), options (${SCHEMA_LIMITS.MIN_OPTIONS}-${DEFAULT_LIMITS.maxOptions} choices with labels and descriptions), and multiSelect (boolean).`,
        minItems: SCHEMA_LIMITS.MIN_QUESTIONS,
        maxItems: DEFAULT_LIMITS.maxQuestions,
        items: {
          type: "object",
          properties: {
            prompt: {
              type: "string",
              description:
                "The complete question to ask the user. Should be clear, specific, and end with a question mark. Example: 'Which programming language do you want to use?' If multiSelect is true, phrase it accordingly, e.g. 'Which features do you want to enable?'",
            },
            title: {
              type: "string",
              minLength: 1,
              description:
                "Very short label displayed as a chip/tag (max 12 chars). Examples: 'Auth method', 'Library', 'Approach'. This title appears in the interface to help users quickly identify questions.",
            },
            options: {
              type: "array",
              description: `The available choices for this question. Must have ${SCHEMA_LIMITS.MIN_OPTIONS}-${DEFAULT_LIMITS.maxOptions} options. Each option should be a distinct, mutually exclusive choice (unless multiSelect is enabled). There should be no 'Other' option, that will be provided automatically.`,
              minItems: SCHEMA_LIMITS.MIN_OPTIONS,
              maxItems: DEFAULT_LIMITS.maxOptions,
              items: {
                type: "object",
                properties: {
                  label: {
                    type: "string",
                    description:
                      "The display text for this option. Should be concise (1-5 words). To mark as recommended, append '(recommended)' to the label text.",
                  },
                  description: {
                    type: "string",
                    description:
                      "Explanation of what this option means or what will happen if chosen. Useful for providing context about trade-offs or implications.",
                  },
                },
                required: ["label"],
                additionalProperties: false,
              },
            },
            multiSelect: {
              type: "boolean",
              description:
                "Set to true to allow the user to select multiple options instead of just one. Use when choices are not mutually exclusive. Default: false (single-select)",
            },
          },
          required: ["prompt", "title", "options", "multiSelect"],
          additionalProperties: false,
        },
      },
    },
    required: ["questions"],
    additionalProperties: false,
  };
}

/**
 * Generate the references/API.md content with full JSON schema
 */
function generateApiMd(): string {
  // Build JSON Schema from our known structure
  const jsonSchema = buildJsonSchema();
  const schemaString = JSON.stringify(jsonSchema, null, 2);

  return `# ask_user_questions Tool Reference

## Purpose

The \`ask_user_questions\` MCP tool allows agents to ask users questions with multiple-choice answers through an interactive TUI (Text User Interface). Use this tool when you need to gather user preferences, make decisions that require user input, or clarify ambiguous requirements.

## JSON Schema

\`\`\`json
${schemaString}
\`\`\`

## Quick Reference

### Root Parameters

| Parameter | Type | Required | Constraints | Description |
|-----------|------|----------|-------------|-------------|
| \`questions\` | array | Yes | ${SCHEMA_LIMITS.MIN_QUESTIONS}-${DEFAULT_LIMITS.maxQuestions} items | Array of question objects to ask the user |

### Question Object

| Property | Type | Required | Constraints | Description |
|----------|------|----------|-------------|-------------|
| \`prompt\` | string | Yes | - | The complete question text (should end with ?) |
| \`title\` | string | Yes | min: 1 char | Short label displayed as chip/tag (max 12 chars) |
| \`options\` | array | Yes | ${SCHEMA_LIMITS.MIN_OPTIONS}-${DEFAULT_LIMITS.maxOptions} items | Available choices for the question |
| \`multiSelect\` | boolean | Yes | - | Whether multiple options can be selected |

### Option Object

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| \`label\` | string | Yes | Display text (1-5 words). Append "(Recommended)" to mark as recommended |
| \`description\` | string | No | Explanation of what this option means or implies |

## Examples

### Single-Select Question

\`\`\`json
{
  "questions": [{
    "prompt": "Which programming language do you want to use?",
    "title": "Language",
    "options": [
      {"label": "TypeScript (Recommended)", "description": "Strong typing with excellent tooling"},
      {"label": "JavaScript", "description": "Flexible and widely supported"},
      {"label": "Python", "description": "Great for data processing"}
    ],
    "multiSelect": false
  }]
}
\`\`\`

### Multi-Select Question

\`\`\`json
{
  "questions": [{
    "prompt": "Which features do you want to enable?",
    "title": "Features",
    "options": [
      {"label": "Authentication", "description": "Add user login and session management"},
      {"label": "Database (Recommended)", "description": "Include database configuration"},
      {"label": "API Documentation", "description": "Auto-generated API docs"},
      {"label": "Testing", "description": "Setup test framework"}
    ],
    "multiSelect": true
  }]
}
\`\`\`

### Multiple Questions

\`\`\`json
{
  "questions": [
    {
      "prompt": "Which framework do you prefer?",
      "title": "Framework",
      "options": [{"label": "React"}, {"label": "Vue"}, {"label": "Svelte"}],
      "multiSelect": false
    },
    {
      "prompt": "Which styling approach?",
      "title": "Styling",
      "options": [{"label": "CSS Modules"}, {"label": "Tailwind CSS (Recommended)"}],
      "multiSelect": false
    }
  ]
}
\`\`\`

## Validation

Use the bundled validation script to check parameters before calling the tool:

\`\`\`bash
bun scripts/validate-params.ts '{"questions": [...]}'
\`\`\`

The validator checks:
- Questions array has ${SCHEMA_LIMITS.MIN_QUESTIONS}-${DEFAULT_LIMITS.maxQuestions} items
- Each question has required fields (\`prompt\`, \`title\`, \`options\`, \`multiSelect\`)
- Each question has ${SCHEMA_LIMITS.MIN_OPTIONS}-${DEFAULT_LIMITS.maxOptions} options
- Each option has a \`label\` property
- No additional properties are present

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Validation passed |
| 1 | Validation failed (see output for details) |

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| Missing required property | Question missing \`prompt\`, \`title\`, \`options\`, or \`multiSelect\` | Add all required fields |
| Too many/few questions | Array has 0 or >5 questions | Use ${SCHEMA_LIMITS.MIN_QUESTIONS}-${DEFAULT_LIMITS.maxQuestions} questions |
| Too many/few options | Question has <2 or >5 options | Use ${SCHEMA_LIMITS.MIN_OPTIONS}-${DEFAULT_LIMITS.maxOptions} options per question |
| Missing option label | Option object lacks \`label\` | Add \`label\` to every option |
| Invalid multiSelect | Not a boolean value | Use \`true\` or \`false\` (no quotes) |

## Notes

- The "Other" option is automatically added by the TUI - do not include it
- Append "(Recommended)" to option labels to mark them as recommended
- For multi-select questions, multiple options can be marked as recommended
- Keep option labels concise (1-5 words) for better readability
`;
}

/**
 * Write file atomically using temp file + rename pattern
 */
function writeFileAtomic(filePath: string, content: string): void {
  const tempPath = `${filePath}.tmp`;
  try {
    writeFileSync(tempPath, content, "utf-8");
    // In Node.js/Bun, renameSync is atomic on the same filesystem
    renameSync(tempPath, filePath);
  } catch (error) {
    // Clean up temp file if it exists
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
  console.log("🔧 Generating Agent Skill files...\n");

  // Get version from package.json
  const version = getVersion();
  console.log(`📦 Package version: ${version}`);

  // Create directories if they don't exist
  if (!existsSync(SKILL_DIR)) {
    mkdirSync(SKILL_DIR, { recursive: true });
    console.log(`📁 Created directory: skills/ask-user-questions/`);
  }
  if (!existsSync(SCRIPTS_DIR)) {
    mkdirSync(SCRIPTS_DIR, { recursive: true });
    console.log(`📁 Created directory: skills/ask-user-questions/scripts/`);
  }
  if (!existsSync(REFERENCES_DIR)) {
    mkdirSync(REFERENCES_DIR, { recursive: true });
    console.log(`📁 Created directory: skills/ask-user-questions/references/`);
  }

  // Generate and write SKILL.md
  const skillContent = generateSkillMd(version);
  writeFileAtomic(SKILL_FILE, skillContent);
  console.log(`✓ Generated: skills/ask-user-questions/SKILL.md`);

  // Generate and write API.md
  const apiContent = generateApiMd();
  writeFileAtomic(API_FILE, apiContent);
  console.log(`✓ Generated: skills/ask-user-questions/references/API.md`);

  // Note: scripts/*.ts files are static and not regenerated
  // They are committed to git and maintained manually
  const askScript = join(SCRIPTS_DIR, "ask.ts");
  const validateScript = join(SCRIPTS_DIR, "validate-params.ts");
  if (existsSync(askScript) && existsSync(validateScript)) {
    console.log(
      `✓ Scripts present: scripts/ask.ts, scripts/validate-params.ts`,
    );
  } else {
    console.log(
      `⚠ Warning: Script files missing in skills/ask-user-questions/scripts/`,
    );
  }

  console.log(`\n✅ Agent Skill generation complete!`);
  console.log(`   Version: ${version}`);
  console.log(`   Generated: SKILL.md, references/API.md`);
  console.log(`   Static: scripts/ask.ts, scripts/validate-params.ts`);
}

// Run the generator
try {
  main();
} catch (error) {
  console.error(`\n❌ Error generating skill files:`);
  console.error(error);
  process.exit(1);
}
