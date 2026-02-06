#!/usr/bin/env node
/**
 * Sync schema definitions from src/shared/schemas.ts to opencode-plugin.
 *
 * This script ensures the plugin always has identical schema definitions
 * (including .describe() strings) as the main package.
 *
 * Run: node scripts/sync-plugin-schemas.mjs
 * Or: npm run sync-plugin-schemas
 */

import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");

const SOURCE_FILE = join(rootDir, "src/shared/schemas.ts");
const TARGET_FILE = join(
  rootDir,
  "packages/opencode-plugin/src/generated-schemas.ts",
);

// Read source schemas
const sourceContent = readFileSync(SOURCE_FILE, "utf-8");

// Extract the schema definitions and TOOL_DESCRIPTION
// We need to transform: import { z } from "zod" -> use tool.schema
const schemaContent = sourceContent
  // Remove the zod import - plugin uses tool.schema
  .replace(/import \{ z \} from "zod";\n?/, "")
  // Remove export keywords from const (will re-export what we need)
  .replace(/export const /g, "const ")
  // Remove export keywords from functions (internal use only, avoids TS2742 portability issues)
  .replace(/export function /g, "function ")
  // Remove the type export at the end
  .replace(/export type QuestionInput[^;]+;/, "");

// Generate the target file content
const generatedContent = `/**
 * AUTO-GENERATED FILE - DO NOT EDIT DIRECTLY
 * 
 * This file is generated from src/shared/schemas.ts by scripts/sync-plugin-schemas.mjs
 * Run "npm run sync-plugin-schemas" to regenerate.
 * 
 * Generated at: ${new Date().toISOString()}
 */

import { tool } from "@opencode-ai/plugin/tool";

const z = tool.schema;

${schemaContent.trim()}

// Only export what the plugin needs
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const AskUserQuestionsArgs: any = AskUserQuestionsParametersSchema.shape;
export { TOOL_DESCRIPTION };
`;

// Write to target
writeFileSync(TARGET_FILE, generatedContent, "utf-8");

console.log(
  `✓ Synced schemas from src/shared/schemas.ts to packages/opencode-plugin/src/generated-schemas.ts`,
);
