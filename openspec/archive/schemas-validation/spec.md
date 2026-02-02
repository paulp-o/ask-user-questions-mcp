# Schemas and Validation Capability

Provides Zod-based schema definitions and runtime validation for questions, options, and responses.

## Overview

The schema system ensures type safety and runtime validation across the entire AUQ system. Schemas are defined using Zod v4 and are shared between the MCP server, CLI, TUI, and OpenCode plugin to maintain consistency.

**Key Files:**

- `src/shared/schemas.ts` - Main schema definitions
- `src/session/types.ts` - TypeScript interfaces
- `src/session/ResponseFormatter.ts` - Response validation
- `packages/opencode-plugin/src/index.ts` - Plugin schema definitions (inline copy)

---

## Requirements

### Requirement: Option Schema

The system SHALL validate option objects for questions.

#### Scenario: Valid Option

- **WHEN** an option has a label string
- **THEN** validation SHALL pass

#### Scenario: Optional Description

- **WHEN** an option has a description
- **THEN** it SHALL be accepted
- **AND** when omitted, validation SHALL still pass

#### Scenario: Label Constraint

- **WHEN** validating an option
- **THEN** label SHOULD be concise (1-5 words as guidance, not enforced)

---

### Requirement: Question Schema

The system SHALL validate question objects with all required fields.

#### Scenario: Required Fields

- **WHEN** a question is validated
- **THEN** it MUST have:
  - `prompt`: Non-empty string
  - `title`: Non-empty string (min 1 character)
  - `options`: Array of 2-4 Option objects
  - `multiSelect`: Boolean value

#### Scenario: Title Validation

- **WHEN** validating title
- **THEN** it MUST have at least 1 character
- **AND** UI guidance recommends max 12 characters

#### Scenario: Options Array Bounds

- **WHEN** validating options array
- **THEN** it MUST have minimum 2 options
- **AND** maximum 4 options

#### Scenario: MultiSelect Required

- **WHEN** validating multiSelect
- **THEN** it MUST be a boolean (not optional)

---

### Requirement: Questions Array Schema

The system SHALL validate arrays of questions.

#### Scenario: Array Bounds

- **WHEN** validating questions array
- **THEN** it MUST have minimum 1 question
- **AND** maximum 4 questions

#### Scenario: Empty Array Rejection

- **WHEN** an empty array is provided
- **THEN** validation SHALL fail with appropriate error

---

### Requirement: MCP Parameters Schema

The system SHALL validate the complete MCP tool parameters.

#### Scenario: Parameter Structure

- **WHEN** validating MCP parameters
- **THEN** the object MUST have a `questions` field
- **AND** the `questions` field MUST conform to QuestionsSchema

---

### Requirement: Schema Descriptions

The system SHALL include descriptive text for LLM consumption.

#### Scenario: Field Descriptions

- **WHEN** schemas are defined
- **THEN** each field SHALL have a `.describe()` annotation explaining:
  - Purpose of the field
  - Constraints and expectations
  - Examples where helpful

#### Scenario: Description Content

- **WHEN** describing the `prompt` field
- **THEN** it SHALL mention: "The complete question to ask the user. Should be clear, specific, and end with a question mark."

- **WHEN** describing the `title` field
- **THEN** it SHALL mention: "Very short label displayed as a chip/tag (max 12 chars)."

- **WHEN** describing the `options` field
- **THEN** it SHALL mention: "Must have 2-4 options. There should be no 'Other' option, that will be provided automatically."

- **WHEN** describing the `multiSelect` field
- **THEN** it SHALL mention: "Set to true to allow the user to select multiple options. Default: false (single-select)"

---

### Requirement: Response Validation

The system SHALL validate user answers against original questions.

#### Scenario: Answer Index Validation

- **WHEN** validating answers
- **THEN** each answer's `questionIndex` MUST be a valid index (0 to questions.length-1)

#### Scenario: Option Existence Validation

- **WHEN** an answer has `selectedOption`
- **THEN** the option label MUST exist in the question's options array

#### Scenario: Multi-Select Option Validation

- **WHEN** an answer has `selectedOptions`
- **THEN** each selected option label MUST exist in the question's options array

#### Scenario: Answer Content Requirement

- **WHEN** validating an answer
- **THEN** it MUST have at least one of:
  - `selectedOption` (single-select)
  - `selectedOptions` (multi-select)
  - `customText` (custom input)

---

### Requirement: Schema Synchronization

The system SHALL maintain consistent schemas across packages.

#### Scenario: Main Package Schemas

- **WHEN** schemas are defined in `src/shared/schemas.ts`
- **THEN** they SHALL be the source of truth for the main package

#### Scenario: Plugin Schema Parity

- **WHEN** schemas are defined in the OpenCode plugin
- **THEN** they SHALL be defined inline using `tool.schema`
- **AND** maintain identical validation rules as the main package

#### Scenario: Manual Sync Process

- **WHEN** schemas change in the main package
- **THEN** the plugin schemas MUST be manually updated
- **AND** the sync script (`scripts/sync-schemas.mjs`) notes this requirement

---

### Requirement: Type Exports

The system SHALL export TypeScript types derived from schemas.

#### Scenario: QuestionInput Type

- **WHEN** importing from schemas
- **THEN** `QuestionInput` type SHALL be available as `z.infer<typeof QuestionSchema>`

---

## Technical Design

### Schema Hierarchy

```
AskUserQuestionsParametersSchema
└── questions: QuestionsSchema
    └── []: QuestionSchema
        ├── prompt: string
        ├── title: string (min 1)
        ├── options: OptionSchema[] (min 2, max 4)
        │   └── OptionSchema
        │       ├── label: string
        │       └── description: string (optional)
        └── multiSelect: boolean
```

### Schema Definitions

```typescript
const OptionSchema = z.object({
  label: z.string().describe("..."),
  description: z.string().optional().describe("..."),
});

const QuestionSchema = z.object({
  prompt: z.string().describe("..."),
  title: z.string().min(1, "...").describe("..."),
  options: z.array(OptionSchema).min(2).max(4).describe("..."),
  multiSelect: z.boolean().describe("..."),
});

const QuestionsSchema = z.array(QuestionSchema).min(1).max(4);

const AskUserQuestionsParametersSchema = z.object({
  questions: QuestionsSchema.describe("..."),
});
```

### Validation Flow

```
MCP Tool Call
    │
    ▼
AskUserQuestionsParametersSchema.parse()
    │
    ├─► Success: Process questions
    │
    └─► Failure: Return validation error
```

### Response Validation

```typescript
ResponseFormatter.validateAnswers(answers, questions)
    │
    ├─► Check answer indices
    │
    ├─► Check selected options exist
    │
    ├─► Check answer has content
    │
    └─► Throw on validation failure
```

---

## Dependencies

- `zod` v4.1.13 - Schema validation library
- TypeScript - Type inference from schemas
