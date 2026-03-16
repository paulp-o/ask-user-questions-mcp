/**
 * AUTO-GENERATED FILE - DO NOT EDIT DIRECTLY
 * 
 * This file is generated from src/shared/schemas.ts by scripts/sync-plugin-schemas.mjs
 * Run "npm run sync-plugin-schemas" to regenerate.
 * 
 * Generated at: 2026-03-16T08:32:44.847Z
 */

import { tool } from "@opencode-ai/plugin/tool";

const z = tool.schema;

export * from '@paulp-o/auq-shared/schemas';

// Only export what the plugin needs
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const AskUserQuestionsArgs: any = AskUserQuestionsParametersSchema.shape;
export { TOOL_DESCRIPTION };
