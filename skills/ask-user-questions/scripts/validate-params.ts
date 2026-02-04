#!/usr/bin/env bun
/**
 * ask-user-questions Parameter Validator
 *
 * A standalone Bun executable script that validates JSON input against the
 * ask_user_questions MCP tool parameter schema.
 *
 * Usage:
 *   echo '{"questions": [...]}' | bun validate-params.ts
 *   bun validate-params.ts '{"questions": [...]}'
 *
 * Exit codes:
 *   0 - Valid input
 *   1 - Invalid input or error
 */

// =============================================================================
// JSON SCHEMA for ask_user_questions parameters
// =============================================================================

/**
 * Complete JSON Schema for validating ask_user_questions parameters.
 * This schema is self-contained and defines all constraints for the MCP tool.
 */
const SCHEMA = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  properties: {
    questions: {
      type: "array",
      description:
        "Questions to ask the user (1-5 questions). Each question must include: prompt (full question text), title (short label, max 12 chars), options (2-5 choices with labels and descriptions), and multiSelect (boolean).",
      minItems: 1, // At least 1 question required
      maxItems: 5, // Maximum 5 questions allowed
      items: {
        type: "object",
        properties: {
          prompt: {
            type: "string",
            description:
              "The complete question to ask the user. Should be clear, specific, and end with a question mark.",
          },
          title: {
            type: "string",
            minLength: 1, // Title cannot be empty
            description:
              "Very short label displayed as a chip/tag (max 12 chars). Examples: 'Auth method', 'Library', 'Approach'.",
          },
          options: {
            type: "array",
            description:
              "The available choices for this question. Must have 2-5 options. There should be no 'Other' option, that will be provided automatically.",
            minItems: 2, // At least 2 options required
            maxItems: 5, // Maximum 5 options allowed
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
                    "Explanation of what this option means or what will happen if chosen. Optional but recommended for clarity.",
                },
              },
              required: ["label"], // Only label is required for each option
              additionalProperties: false, // No extra properties allowed on options
            },
          },
          multiSelect: {
            type: "boolean",
            description:
              "Set to true to allow the user to select multiple options instead of just one. Use when choices are not mutually exclusive.",
          },
        },
        required: ["prompt", "title", "options", "multiSelect"], // All question fields are required
        additionalProperties: false, // No extra properties allowed on questions
      },
    },
  },
  required: ["questions"], // Root must have questions array
  additionalProperties: false, // No extra properties allowed at root
} as const;

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validates a value against the JSON schema.
 * Returns an array of error messages. Empty array means valid.
 */
function validate(value: unknown): string[] {
  const errors: string[] = [];

  // Validate root is an object
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return ["Root value must be an object"];
  }

  const obj = value as Record<string, unknown>;

  // Validate required root property: questions
  if (!("questions" in obj)) {
    return ["Missing required property: 'questions'"];
  }

  // Validate questions is an array
  if (!Array.isArray(obj.questions)) {
    return ["'questions' must be an array"];
  }

  // Validate questions array length (1-5 items)
  if (obj.questions.length < 1) {
    errors.push("'questions' must have at least 1 item");
  }
  if (obj.questions.length > 5) {
    errors.push("'questions' must have at most 5 items");
  }

  // Validate no additional properties at root
  const allowedRootProps = ["questions"];
  for (const key of Object.keys(obj)) {
    if (!allowedRootProps.includes(key)) {
      errors.push(`Additional property not allowed at root: '${key}'`);
    }
  }

  // Validate each question
  obj.questions.forEach((question, qIndex) => {
    const qPath = `questions[${qIndex}]`;

    // Question must be an object
    if (
      typeof question !== "object" ||
      question === null ||
      Array.isArray(question)
    ) {
      errors.push(`${qPath} must be an object`);
      return; // Skip further validation for this question
    }

    const q = question as Record<string, unknown>;

    // Validate required question properties
    const requiredProps = ["prompt", "title", "options", "multiSelect"];
    for (const prop of requiredProps) {
      if (!(prop in q)) {
        errors.push(`${qPath} is missing required property: '${prop}'`);
      }
    }

    // Validate no additional properties on question
    const allowedQuestionProps = ["prompt", "title", "options", "multiSelect"];
    for (const key of Object.keys(q)) {
      if (!allowedQuestionProps.includes(key)) {
        errors.push(`${qPath} has additional property not allowed: '${key}'`);
      }
    }

    // Validate prompt (must be string)
    if ("prompt" in q) {
      if (typeof q.prompt !== "string") {
        errors.push(`${qPath}.prompt must be a string`);
      }
    }

    // Validate title (must be string with minLength 1)
    if ("title" in q) {
      if (typeof q.title !== "string") {
        errors.push(`${qPath}.title must be a string`);
      } else if (q.title.length < 1) {
        errors.push(`${qPath}.title must have at least 1 character`);
      }
    }

    // Validate multiSelect (must be boolean)
    if ("multiSelect" in q) {
      if (typeof q.multiSelect !== "boolean") {
        errors.push(`${qPath}.multiSelect must be a boolean`);
      }
    }

    // Validate options (must be array with 2-5 items)
    if ("options" in q) {
      if (!Array.isArray(q.options)) {
        errors.push(`${qPath}.options must be an array`);
      } else {
        // Check options array bounds
        if (q.options.length < 2) {
          errors.push(`${qPath}.options must have at least 2 items`);
        }
        if (q.options.length > 5) {
          errors.push(`${qPath}.options must have at most 5 items`);
        }

        // Validate each option
        q.options.forEach((option, oIndex) => {
          const oPath = `${qPath}.options[${oIndex}]`;

          // Option must be an object
          if (
            typeof option !== "object" ||
            option === null ||
            Array.isArray(option)
          ) {
            errors.push(`${oPath} must be an object`);
            return; // Skip further validation for this option
          }

          const opt = option as Record<string, unknown>;

          // Validate required option property: label
          if (!("label" in opt)) {
            errors.push(`${oPath} is missing required property: 'label'`);
          } else if (typeof opt.label !== "string") {
            errors.push(`${oPath}.label must be a string`);
          }

          // Validate optional description (if present, must be string)
          if ("description" in opt && typeof opt.description !== "string") {
            errors.push(`${oPath}.description must be a string`);
          }

          // Validate no additional properties on option
          const allowedOptionProps = ["label", "description"];
          for (const key of Object.keys(opt)) {
            if (!allowedOptionProps.includes(key)) {
              errors.push(
                `${oPath} has additional property not allowed: '${key}'`,
              );
            }
          }
        });
      }
    }
  });

  return errors;
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

/**
 * Main entry point - reads input, validates, and outputs result.
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  let input: string;

  // Read input from CLI argument or stdin
  if (args.length > 0) {
    // Use first CLI argument as input
    input = args[0];
    console.error("Reading input from CLI argument...");
  } else {
    // Read from stdin
    const chunks: Buffer[] = [];
    for await (const chunk of Bun.stdin.stream()) {
      chunks.push(Buffer.from(chunk));
    }
    input = Buffer.concat(chunks).toString("utf-8").trim();
    console.error("Reading input from stdin...");
  }

  // Handle empty input
  if (!input) {
    console.error("Error: No input provided");
    const result = { valid: false, errors: ["No input provided"] };
    console.log(JSON.stringify(result, null, 2));
    process.exit(1);
  }

  // Parse JSON input
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
    console.error("JSON parsed successfully");
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : "Invalid JSON";
    console.error(`Error: ${errorMsg}`);
    const result = { valid: false, errors: [`Invalid JSON: ${errorMsg}`] };
    console.log(JSON.stringify(result, null, 2));
    process.exit(1);
  }

  // Validate against schema
  console.error("Validating against ask_user_questions schema...");
  const errors = validate(parsed);

  // Output result
  const result = {
    valid: errors.length === 0,
    errors: errors,
  };

  console.log(JSON.stringify(result, null, 2));

  // Exit with appropriate code
  if (errors.length === 0) {
    console.error("Validation passed!");
    process.exit(0);
  } else {
    console.error(`Validation failed with ${errors.length} error(s)`);
    process.exit(1);
  }
}

// Run main function
main().catch((e) => {
  console.error(
    `Unexpected error: ${e instanceof Error ? e.message : String(e)}`,
  );
  const result = {
    valid: false,
    errors: ["Unexpected error during validation"],
  };
  console.log(JSON.stringify(result, null, 2));
  process.exit(1);
});
