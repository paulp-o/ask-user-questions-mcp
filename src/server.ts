import { FastMCP } from "fastmcp";
import { z } from "zod";

import type { Question } from "./session/types.js";
import { resolveSessionDirectory } from "./session/utils.js";

import { SessionManager } from "./session/index.js";

// Initialize session manager
const sessionManager = new SessionManager();

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
  execute: async (args, { log }) => {
    try {
      // Initialize session manager if not already done
      await sessionManager.initialize();

      // Validate questions (using existing Zod schema validation)
      if (!args.questions || args.questions.length === 0) {
        throw new Error("At least one question is required");
      }

      // Convert Zod-validated questions to our internal Question type
      const questions: Question[] = args.questions.map((q) => ({
        options: q.options.map((opt) => ({
          description: opt.description,
          label: opt.label,
        })),
        prompt: q.prompt,
      }));

      // Create new session
      const sessionId = await sessionManager.createSession(questions);

      // Return session information for Subtask 1
      // (Future subtasks will handle TUI interaction and response collection)
      const sessionDir = sessionManager.getConfig().baseDir;
      return {
        content: [
          {
            text:
              `Session created with ID: ${sessionId}\n\n` +
              `Questions stored in: ${sessionDir}/${sessionId}/\n` +
              `Total questions: ${questions.length}\n\n` +
              `[TUI implementation coming in subtask 3 - run 'auq' command when available]`,
            type: "text",
          },
        ],
      };
    } catch (error) {
      log.error("Failed to create session", { error: String(error) });
      return {
        content: [
          {
            text: `Error creating session: ${error}`,
            type: "text",
          },
        ],
      };
    }
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
