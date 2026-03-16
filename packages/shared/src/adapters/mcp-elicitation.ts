import type { Question, UserAnswer } from "../session/types.js";

export interface PrimitiveSchemaDefinition {
  type: "string" | "number" | "integer" | "boolean" | "array";
  title?: string;
  description?: string;
  enum?: string[];
  enumNames?: string[];
  default?: unknown;
  minimum?: number;
  maximum?: number;
  items?: { type: "string"; enum?: string[] };
}

export interface McpElicitationSchema {
  message: string;
  requestedSchema: {
    type: "object";
    properties: Record<string, PrimitiveSchemaDefinition>;
    required?: string[];
  };
}

export interface McpElicitationResult {
  action: "accept" | "decline" | "cancel";
  content?: Record<string, string | number | boolean | string[]>;
}

const DEFAULT_ELICITATION_MESSAGE = "Please answer the following questions";

function propertyKey(index: number): string {
  return `q_${index}`;
}

function toOptionLabels(question: Question): string[] {
  return question.options.map((option) => option.label);
}

function toQuestion(
  key: string,
  definition: PrimitiveSchemaDefinition,
  schemaMessage: string,
): Question {
  const title = definition.title || key;
  const prompt = definition.description || schemaMessage;

  if (definition.type === "string") {
    if (!definition.enum?.length) {
      throw new Error(`Unsupported MCP property ${key}: string type requires enum`);
    }

    return {
      title,
      prompt,
      options: definition.enum.map((value) => ({ label: value })),
      multiSelect: false,
    };
  }

  if (definition.type === "array") {
    if (definition.items?.type !== "string" || !definition.items.enum?.length) {
      throw new Error(
        `Unsupported MCP property ${key}: array type requires string items with enum`,
      );
    }

    return {
      title,
      prompt,
      options: definition.items.enum.map((value) => ({ label: value })),
      multiSelect: true,
    };
  }

  if (definition.type === "number" || definition.type === "integer" || definition.type === "boolean") {
    if (!definition.enum?.length) {
      throw new Error(
        `Unsupported MCP property ${key}: ${definition.type} type without enum is not supported`,
      );
    }

    return {
      title,
      prompt,
      options: definition.enum.map((value) => ({ label: value })),
      multiSelect: false,
    };
  }

  throw new Error(`Unsupported MCP property ${key}: type ${definition.type} is not supported`);
}

export function auqToMcpElicitation(
  questions: Question[],
  message = DEFAULT_ELICITATION_MESSAGE,
): McpElicitationSchema {
  const properties: Record<string, PrimitiveSchemaDefinition> = {};
  const required: string[] = [];

  for (const [index, question] of questions.entries()) {
    const key = propertyKey(index);
    required.push(key);

    if (question.multiSelect) {
      properties[key] = {
        type: "array",
        title: question.title,
        description: question.prompt,
        items: {
          type: "string",
          enum: toOptionLabels(question),
        },
      };
      continue;
    }

    properties[key] = {
      type: "string",
      title: question.title,
      description: question.prompt,
      enum: toOptionLabels(question),
    };
  }

  return {
    message,
    requestedSchema: {
      type: "object",
      properties,
      required,
    },
  };
}

export function mcpElicitationToAuq(
  schema: McpElicitationSchema,
): { questions: Question[]; message: string } {
  const questions = Object.entries(schema.requestedSchema.properties).map(
    ([key, definition]) => toQuestion(key, definition, schema.message),
  );

  return { questions, message: schema.message };
}

export function mcpElicitationResultToAuqAnswers(
  result: McpElicitationResult,
  questions: Question[],
): UserAnswer[] {
  if (result.action !== "accept" || !result.content) {
    return [];
  }

  const timestamp = new Date().toISOString();
  const answers: UserAnswer[] = [];

  for (const [index, question] of questions.entries()) {
    const value = result.content[propertyKey(index)];
    if (value === undefined) {
      continue;
    }

    if (question.multiSelect) {
      const selectedOptions = Array.isArray(value)
        ? value.map((entry) => String(entry))
        : [String(value)];

      answers.push({
        questionIndex: index,
        selectedOptions,
        timestamp,
      });
      continue;
    }

    answers.push({
      questionIndex: index,
      selectedOption: String(value),
      timestamp,
    });
  }

  return answers;
}