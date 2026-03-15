---
created: 2026-03-15T13:00:00Z
last_updated: 2026-03-15T13:10:00Z
type: spec
change_id: auq-web-service
plan_number: 1
status: done
trigger: "Extract shared schemas, session types, and response formatter into packages/shared (@paulp-o/auq-shared)"
depends_on: none
next: 002_web-adapter-core.md
---

# Plan: Shared Package Extraction

## Background & Research

### Strategy
Phase 1 extracts three source files into a new `packages/shared` package (`@paulp-o/auq-shared`), then replaces the originals with re-exports so ALL existing consumers continue working with zero import path changes.

**Critical insight**: The design doc (tasks.md lines 11-12) says to "replace with re-exports from @paulp-o/auq-shared". This means we do NOT update the 35+ consumer files — we only update 2 source files to become re-export shims. All existing `import { X } from '../session/types.js'` paths keep working.

### Existing Package Pattern (`packages/opencode-plugin`)
The repo already has a workspace package that shows the exact pattern to follow:

- File: `packages/opencode-plugin/package.json`:
  ```json
  {
    "name": "@paulp-o/opencode-auq",
    "version": "2.0.0",
    "type": "module",
    "main": "dist/index.js",
    "types": "dist/index.d.ts",
    "files": ["dist", "README.md", "LICENSE"],
    "scripts": {
      "build": "tsc -p tsconfig.json",
      "prepublishOnly": "bun run build",
      "typecheck": "tsc -p tsconfig.json --noEmit"
    },
    "publishConfig": { "access": "public" }
  }
  ```

- File: `packages/opencode-plugin/tsconfig.json`:
  ```json
  {
    "extends": "@tsconfig/node22/tsconfig.json",
    "compilerOptions": {
      "outDir": "dist",
      "rootDir": "src",
      "declaration": true,
      "declarationMap": true
    },
    "include": ["src"]
  }
  ```

### File 1: `src/shared/schemas.ts` (171 lines)
Core Zod schemas. Key exports:
```ts
import { z } from "zod";

export const SCHEMA_LIMITS = { MAX_OPTIONS: 10, MAX_QUESTIONS: 10, MIN_OPTIONS: 2, MIN_QUESTIONS: 1 } as const;
export const DEFAULT_LIMITS = { maxOptions: 5, maxQuestions: 5, recommendedOptions: 4, recommendedQuestions: 4 } as const;
export const OptionSchema = z.object({ label: z.string().describe(...), description: z.string().optional().describe(...) });
export function createQuestionSchema(maxOptions = DEFAULT_LIMITS.maxOptions) { ... }
export function createQuestionsSchema(maxQuestions, maxOptions) { ... }
export function createAskUserQuestionsParametersSchema(maxQuestions, maxOptions) { ... }
export const QuestionSchema = createQuestionSchema();
export const QuestionsSchema = createQuestionsSchema();
export const AskUserQuestionsParametersSchema = createAskUserQuestionsParametersSchema();
export const TOOL_DESCRIPTION = "...";
export type QuestionInput = z.infer<typeof QuestionSchema>;
export const GetAnsweredQuestionsArgsSchema = z.object({ session_id: z.string().describe(...), blocking: z.boolean().default(false).describe(...) });
export type GetAnsweredQuestionsArgs = z.infer<typeof GetAnsweredQuestionsArgsSchema>;
export const GET_ANSWERED_QUESTIONS_DESCRIPTION = "...";
```
**Dependency**: `zod` (already in root package.json)

### File 2: `src/session/types.ts` (103 lines)
Pure TypeScript interfaces — no runtime dependencies:
```ts
export interface Option { description?: string; label: string; }
export interface Question { options: Option[]; prompt: string; title: string; multiSelect?: boolean; }
export interface SessionAnswer { answers: UserAnswer[]; sessionId: string; timestamp: string; callId?: string; workingDirectory?: string; lastReadAt?: string; }
export interface SessionConfig { baseDir: string; maxSessions?: number; retentionPeriod?: number; sessionTimeout?: number; }
export interface SessionRequest { questions: Question[]; sessionId: string; status: '...' | '...'; timestamp: string; callId?: string; workingDirectory?: string; }
export interface SessionStatus { createdAt: string; currentQuestionIndex?: number; lastModified: string; sessionId: string; status: '...' | '...'; totalQuestions: number; callId?: string; rejectionReason?: string | null; workingDirectory?: string; }
export interface UserAnswer { customText?: string; questionIndex: number; selectedOption?: string; selectedOptions?: string[]; timestamp: string; }
export const SESSION_FILES = { ANSWERS: 'answers.json', REQUEST: 'request.json', STATUS: 'status.json' } as const;
export type SessionStatusValue = SessionStatus['status'];
export const DEFAULT_SESSION_CONFIG: Partial<SessionConfig> = { ... };
```
**Dependencies**: None (pure types + constants)

### File 3: `src/session/ResponseFormatter.ts` (374 lines)
Response formatting utility class:
```ts
import type { Question, SessionAnswer, UserAnswer } from './types.js';

export class ResponseFormatter {
  static formatUserResponse(answers: SessionAnswer, questions: Question[], sessionId?: string): string { ... }
  static validateAnswers(answers: SessionAnswer, questions: Question[]): void { ... }
  static formatElaborateRequest(questionIndex, title, prompt, customExplanation?, elaborateText?): string { ... }
  static formatRephraseRequest(questionIndex, title): string { ... }
  static getShortId(sessionId: string): string { ... }
  static formatNonBlockingSubmission(sessionId, questionCount): string { ... }
  static formatPendingStatus(sessionId, remainingTime?): string { ... }
  static formatRejectedStatus(sessionId, reason?): string { ... }
  static formatSessionStatus(sessionId, status): string { ... }
  private static formatQuestion(question, questionAnswers, index): string { ... }
}
```
**Dependency**: Imports from `./types.js` (will become local import within shared package)

### Current Workspaces Config
Root `package.json` currently has:
```json
"workspaces": ["packages/opencode-plugin"]
```
Must add `packages/shared` to this array.

### Current Build Script
Root `package.json` build script:
```json
"build": "bun run sync-plugin-schemas && bun run generate:skill && tsc && tsc -p tsconfig.opentui.json"
```
Must add shared package build step (run BEFORE main tsc since main may depend on it).

### Session Barrel Export
File: `src/session/index.ts`:
```ts
export * from './atomic-operations.js';
export { SessionManager } from './SessionManager.js';
export * from './types.js';
export * from './utils.js';
```
The `export * from './types.js'` line will continue working since `types.ts` will become a re-export shim.

### Files Importing schemas.ts (4 files, NO changes needed — re-export shim handles it)
- `src/__tests__/schema-validation.test.ts` — imports `GetAnsweredQuestionsArgsSchema`
- `src/server.ts` — imports `GetAnsweredQuestionsArgsSchema`, `GET_ANSWERED_QUESTIONS_DESCRIPTION`, `TOOL_DESCRIPTION`
- `scripts/generate-skill.ts` — imports `TOOL_DESCRIPTION`
- `src/core/ask-user-questions.ts` — imports and re-exports schemas

### Files Importing session/types.ts (31 files, NO changes needed — re-export shim handles it)
All 31 consumer files import via relative paths like `../session/types.js`. Since `src/session/types.ts` becomes a `export * from '@paulp-o/auq-shared/session/types'` shim, they all keep working.

---

## Testing Plan (TDD - tests first)

- [ ] Create `packages/shared/src/__tests__/schemas.test.ts` — import schemas from the new package location, verify `OptionSchema.parse()`, `QuestionSchema.parse()`, `createQuestionSchema()` with custom limits, `AskUserQuestionsParametersSchema.parse()`, `GetAnsweredQuestionsArgsSchema.parse()`, type exports (`QuestionInput`, `GetAnsweredQuestionsArgs`), and constant exports (`SCHEMA_LIMITS`, `DEFAULT_LIMITS`, `TOOL_DESCRIPTION`, `GET_ANSWERED_QUESTIONS_DESCRIPTION`). Use the same test patterns as `src/__tests__/schema-validation.test.ts`.
- [ ] Create `packages/shared/src/__tests__/types.test.ts` — import types and constants from the new package location, verify `SESSION_FILES` has correct values, `DEFAULT_SESSION_CONFIG` has expected defaults, type interfaces are importable (compile-time check via `satisfies`).
- [ ] Create `packages/shared/src/__tests__/response-format.test.ts` — import `ResponseFormatter` from new package location, verify `formatUserResponse()` with single-select and multi-select answers, `validateAnswers()` throws on invalid input, `formatNonBlockingSubmission()` / `formatPendingStatus()` / `formatRejectedStatus()` return expected strings.

## Implementation Plan

### Package Setup
- [ ] Create `packages/shared/package.json` with name `@paulp-o/auq-shared`, version `1.0.0`, type `module`, main `dist/index.js`, types `dist/index.d.ts`, files `["dist"]`, build script `tsc -p tsconfig.json`, publishConfig `{ "access": "public" }`, dependency on `zod` (same version as root: `^4.1.13`). Follow the `opencode-plugin` pattern exactly.
- [ ] Create `packages/shared/tsconfig.json` extending `@tsconfig/node22/tsconfig.json` with `outDir: "dist"`, `rootDir: "src"`, `declaration: true`, `declarationMap: true`, include `["src"]`. Add `@tsconfig/node22` to devDependencies.

### Source Files
- [ ] Create `packages/shared/src/schemas.ts` — copy entire content of `src/shared/schemas.ts` verbatim (171 lines). No modifications needed.
- [ ] Create `packages/shared/src/session/types.ts` — copy entire content of `src/session/types.ts` verbatim (103 lines). No modifications needed.
- [ ] Create `packages/shared/src/response/format.ts` — copy entire content of `src/session/ResponseFormatter.ts`, update the import path from `./types.js` to `../session/types.js`. This is the only import path change needed.
- [ ] Create `packages/shared/src/index.ts` — barrel export file: `export * from './schemas.js'; export * from './session/types.js'; export { ResponseFormatter } from './response/format.js';`

### Re-export Shims (preserve backward compatibility)
- [ ] Replace `src/shared/schemas.ts` content with: `export * from '@paulp-o/auq-shared/schemas';` (re-export shim). This preserves all 4 consumer imports without changes.
- [ ] Replace `src/session/types.ts` content with: `export * from '@paulp-o/auq-shared/session/types';` (re-export shim). This preserves all 31 consumer imports without changes.
- [ ] Update `src/session/ResponseFormatter.ts` import to use: `import type { Question, SessionAnswer, UserAnswer } from '@paulp-o/auq-shared';` (optional, but aligns with new package).

### Workspace & Build Integration
- [ ] Update root `package.json` workspaces array from `["packages/opencode-plugin"]` to `["packages/opencode-plugin", "packages/shared"]`.
- [ ] Add `@paulp-o/auq-shared` as a dependency in root `package.json` dependencies: `"@paulp-o/auq-shared": "workspace:*"` (workspace protocol for monorepo linking).
- [ ] Update root `package.json` build script to build shared package first: `"build": "bun run build:shared && bun run sync-plugin-schemas && bun run generate:skill && tsc && tsc -p tsconfig.opentui.json"`.
- [ ] Add `"build:shared": "cd packages/shared && tsc -p tsconfig.json"` script to root `package.json`.

### Verification
- [ ] Run `bun install` to link workspace packages and verify no resolution errors.
- [ ] Run `bun run build:shared` to verify shared package compiles without errors.
- [ ] Run `bun run build` to verify main package still compiles (re-export shims resolve correctly).
- [ ] Run `bun run test` to verify ALL existing tests still pass (re-export shims are transparent).
- [ ] Run shared package tests: `cd packages/shared && bunx vitest run` to verify new tests pass.

---

## Parallelization Plan

### Batch 1 (parallel) — Package setup + source file creation
- [ ] Programmer A: Create package infrastructure + copy source files
  - `packages/shared/package.json`
  - `packages/shared/tsconfig.json`
  - `packages/shared/src/schemas.ts` (copy from `src/shared/schemas.ts`)
  - `packages/shared/src/session/types.ts` (copy from `src/session/types.ts`)
  - `packages/shared/src/response/format.ts` (copy from `src/session/ResponseFormatter.ts`, fix import)
  - `packages/shared/src/index.ts` (barrel export)
  - Files: `packages/shared/**`

- [ ] Programmer B: Create test files for the shared package
  - `packages/shared/src/__tests__/schemas.test.ts`
  - `packages/shared/src/__tests__/types.test.ts`
  - `packages/shared/src/__tests__/response-format.test.ts`
  - Files: `packages/shared/src/__tests__/**`

### Batch 2 (after Batch 1) — Integration: re-export shims + workspace config
- [ ] Programmer C: Update root config + create re-export shims + verify
  - Update root `package.json` (workspaces, dependencies, build scripts)
  - Replace `src/shared/schemas.ts` with re-export shim
  - Replace `src/session/types.ts` with re-export shim
  - Run `bun install`
  - Run `bun run build:shared && bun run build`
  - Run `bun run test`
  - Run shared package tests
  - Files: `package.json`, `src/shared/schemas.ts`, `src/session/types.ts`

### Dependencies
Batch 2 must run after Batch 1 because:
- Re-export shims reference `@paulp-o/auq-shared` which must exist first
- Build verification requires both the shared package and updated root config
- Tests require the built shared package to be importable

### Risk Areas
- **Re-export path resolution**: The shim `export * from '@paulp-o/auq-shared/schemas'` requires the shared package to expose sub-path exports in package.json OR use the barrel `index.ts`. If sub-path exports don't work, fall back to `export * from '@paulp-o/auq-shared'` (barrel re-export).
- **Zod version alignment**: The shared package must use the same zod version as root (`^4.1.13`). Since it's a workspace package, it can use the root's hoisted zod.
- **Build order**: The shared package MUST build before the main package. The updated build script handles this.
- **ResponseFormatter import path**: When copying to `packages/shared/src/response/format.ts`, the import must change from `./types.js` to `../session/types.js` to match the new directory structure.

---

## Done Criteria
- [ ] `packages/shared/` exists with package.json, tsconfig.json, src/ with all 3 source files + barrel export + tests
- [ ] `bun run build:shared` compiles without errors, producing `packages/shared/dist/`
- [ ] `bun run build` (full build) succeeds — re-export shims resolve correctly
- [ ] `bun run test` passes — all existing tests work through re-export shims
- [ ] Shared package tests pass — schemas, types, and response formatter work from new location
- [ ] No consumer files modified — only `src/shared/schemas.ts` and `src/session/types.ts` replaced with shims