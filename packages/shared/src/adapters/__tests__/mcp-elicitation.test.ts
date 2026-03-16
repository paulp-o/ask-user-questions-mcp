import { describe, expect, it } from "vitest";

import {
  auqToMcpElicitation,
  mcpElicitationResultToAuqAnswers,
  mcpElicitationToAuq,
  type McpElicitationSchema,
} from "../mcp-elicitation.js";
import type { Question } from "../../session/types.js";

const questions: Question[] = [
  {
    title: "Language",
    prompt: "Which language do you want to use?",
    options: [
      { label: "TypeScript", description: "Type-safe and modern" },
      { label: "JavaScript", description: "Flexible scripting" },
    ],
    multiSelect: false,
  },
  {
    title: "Features",
    prompt: "Which features should we enable?",
    options: [
      { label: "Auth" },
      { label: "Logging" },
      { label: "Metrics" },
    ],
    multiSelect: true,
  },
];

describe("mcp elicitation adapter", () => {
  it("converts a single-select AUQ question to MCP string enum", () => {
    const schema = auqToMcpElicitation([questions[0]!]);

    expect(schema.message).toBe("Please answer the following questions");
    expect(schema.requestedSchema.properties.q_0).toEqual({
      type: "string",
      title: "Language",
      description: "Which language do you want to use?",
      enum: ["TypeScript", "JavaScript"],
    });
  });

  it("converts multi-select AUQ question to MCP array enum items", () => {
    const schema = auqToMcpElicitation([questions[1]!], "Pick all that apply");

    expect(schema.message).toBe("Pick all that apply");
    expect(schema.requestedSchema.properties.q_0).toEqual({
      type: "array",
      title: "Features",
      description: "Which features should we enable?",
      items: {
        type: "string",
        enum: ["Auth", "Logging", "Metrics"],
      },
    });
  });

  it("converts multiple AUQ questions and marks all as required", () => {
    const schema = auqToMcpElicitation(questions);

    expect(Object.keys(schema.requestedSchema.properties)).toEqual(["q_0", "q_1"]);
    expect(schema.requestedSchema.required).toEqual(["q_0", "q_1"]);
  });

  it("maps AUQ prompt into MCP schema descriptions", () => {
    const schema = auqToMcpElicitation([questions[0]!]);

    expect(schema.requestedSchema.properties.q_0?.description).toBe(
      "Which language do you want to use?",
    );
  });

  it("converts MCP string enum to single-select AUQ question", () => {
    const schema: McpElicitationSchema = {
      message: "Server question",
      requestedSchema: {
        type: "object",
        properties: {
          q_0: {
            type: "string",
            title: "Runtime",
            description: "Which runtime?",
            enum: ["Bun", "Node.js"],
          },
        },
      },
    };

    const converted = mcpElicitationToAuq(schema);

    expect(converted.questions).toEqual([
      {
        title: "Runtime",
        prompt: "Which runtime?",
        options: [{ label: "Bun" }, { label: "Node.js" }],
        multiSelect: false,
      },
    ]);
    expect(converted.message).toBe("Server question");
  });

  it("converts MCP array with enum items to multi-select AUQ question", () => {
    const schema: McpElicitationSchema = {
      message: "Select features",
      requestedSchema: {
        type: "object",
        properties: {
          q_0: {
            type: "array",
            title: "Features",
            description: "Pick features",
            items: { type: "string", enum: ["Auth", "Metrics"] },
          },
        },
      },
    };

    const converted = mcpElicitationToAuq(schema);

    expect(converted.questions[0]).toEqual({
      title: "Features",
      prompt: "Pick features",
      options: [{ label: "Auth" }, { label: "Metrics" }],
      multiSelect: true,
    });
  });

  it("uses property key as title fallback and message as prompt fallback", () => {
    const schema: McpElicitationSchema = {
      message: "Please answer",
      requestedSchema: {
        type: "object",
        properties: {
          preferred_stack: {
            type: "string",
            enum: ["Web", "Mobile"],
          },
        },
      },
    };

    const converted = mcpElicitationToAuq(schema);

    expect(converted.questions[0]).toEqual({
      title: "preferred_stack",
      prompt: "Please answer",
      options: [{ label: "Web" }, { label: "Mobile" }],
      multiSelect: false,
    });
  });

  it("round-trips AUQ -> MCP -> AUQ and preserves question semantics", () => {
    const mcp = auqToMcpElicitation(questions, "Custom message");
    const roundTrip = mcpElicitationToAuq(mcp);

    expect(roundTrip.message).toBe("Custom message");
    expect(roundTrip.questions).toEqual(
      questions.map((question) => ({
        title: question.title,
        prompt: question.prompt,
        multiSelect: question.multiSelect ?? false,
        options: question.options.map((option) => ({ label: option.label })),
      })),
    );
  });

  it("converts accept elicitation result to AUQ answers", () => {
    const result = mcpElicitationResultToAuqAnswers(
      {
        action: "accept",
        content: {
          q_0: "TypeScript",
          q_1: ["Auth", "Metrics"],
        },
      },
      questions,
    );

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      questionIndex: 0,
      selectedOption: "TypeScript",
    });
    expect(result[1]).toMatchObject({
      questionIndex: 1,
      selectedOptions: ["Auth", "Metrics"],
    });
    expect(result[0]?.timestamp).toEqual(expect.any(String));
    expect(result[1]?.timestamp).toEqual(expect.any(String));
  });

  it("returns empty answers for decline and cancel actions", () => {
    expect(
      mcpElicitationResultToAuqAnswers({ action: "decline", content: { q_0: "TypeScript" } }, questions),
    ).toEqual([]);
    expect(
      mcpElicitationResultToAuqAnswers({ action: "cancel", content: { q_0: "TypeScript" } }, questions),
    ).toEqual([]);
  });

  it("rejects unsupported number and boolean schema properties without enum", () => {
    const numberSchema: McpElicitationSchema = {
      message: "unsupported",
      requestedSchema: {
        type: "object",
        properties: {
          q_0: { type: "number", title: "Count" },
        },
      },
    };

    const booleanSchema: McpElicitationSchema = {
      message: "unsupported",
      requestedSchema: {
        type: "object",
        properties: {
          q_0: { type: "boolean", title: "Enabled" },
        },
      },
    };

    expect(() => mcpElicitationToAuq(numberSchema)).toThrow(
      "number type without enum is not supported",
    );
    expect(() => mcpElicitationToAuq(booleanSchema)).toThrow(
      "boolean type without enum is not supported",
    );
  });
});