import { FastMCP } from "fastmcp";
import { z } from "zod";

const server = new FastMCP({
  instructions:
    "This MCP server provides a tool to ask users structured questions via the terminal. " +
    "The ask_user_questions tool allows AI models to pause and gather direct user input through " +
    "an interactive TUI, returning formatted responses for continued reasoning.",
  name: "AskUserQuery",
  version: "0.1.0",
});

// Define the question and option schemas
const OptionSchema = z.object({
  description: z
    .string()
    .optional()
    .describe("Optional explanatory note for this option"),
  label: z.string().describe("The visible text of the choice"),
});

const QuestionSchema = z.object({
  options: z
    .array(OptionSchema)
    .min(1)
    .describe("Non-empty list of predefined answer choices"),
  prompt: z.string().describe("The full question text"),
});

// Add the ask_user_questions tool
server.addTool({
  annotations: {
    openWorldHint: true, // This tool interacts with the user's terminal
    readOnlyHint: false, // This tool waits for user input
    title: "Ask User Questions",
  },
  description:
    "Ask the user one or more structured questions via an interactive terminal interface. " +
    "Each question includes multiple-choice options and allows custom free-text responses. " +
    "Returns a formatted summary of all questions and answers.",
  execute: async (args) => {
    // TODO: Implement session creation and TUI coordination
    // For now, return a placeholder response
    const placeholderResponse = args.questions
      .map((q, i) => {
        return `${i + 1}. ${q.prompt}\n→ [User response will be collected via TUI]`;
      })
      .join("\n\n");

    return {
      content: [
        {
          text: `[PLACEHOLDER] Questions queued for user:\n\n${placeholderResponse}\n\n(Session management and TUI not yet implemented)`,
          type: "text",
        },
      ],
    };
  },
  name: "ask_user_questions",
  parameters: z.object({
    questions: z
      .array(QuestionSchema)
      .min(1)
      .describe("Array of questions to ask the user"),
  }),
});

// Start the server with stdio transport
server.start({
  transportType: "stdio",
});
