import { FastMCP } from "fastmcp";
import { randomUUID } from "crypto";
import { z } from "zod";

import type { Question } from "./session/types.js";

import { SessionManager } from "./session/index.js";
// import { resolveSessionDirectory } from "./session/utils.js";

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
  title: z
    .string()
    .optional()
    .describe(
      "REQUIRED: Short 1-2 word summary for UI display (e.g., 'Language', 'Framework', 'Theme'). " +
        "This title appears as a chip/tag in the interface and helps users quickly identify questions. " +
        "Provide a meaningful title for better UX - do not rely on auto-generated 'Q1', 'Q2' fallbacks."
    ),
});

// Add the ask_user_questions tool
server.addTool({
  name: "ask_user_questions",
  annotations: {
    title: "Ask User Questions",
    openWorldHint: true, // This tool interacts with the user's terminal
    readOnlyHint: false, // This tool waits for user input
    idempotentHint: true,
  },
  description:
    "Ask the user one or more structured questions via an interactive terminal interface. " +
    "Each question includes multiple-choice options and allows custom free-text responses. " +
    "Returns a formatted summary of all questions and answers. " +
    "IMPORTANT: Always provide a descriptive 'title' field (1-2 words) for each question to improve UI clarity.",
  execute: async (args, { log }) => {
    try {
      // Initialize session manager if not already done
      await sessionManager.initialize();

      // Clean up old sessions on startup (non-blocking)
      sessionManager
        .cleanupExpiredSessions()
        .then((count) => {
          if (count > 0) {
            log.info(`Cleaned up ${count} expired session(s)`);
          }
        })
        .catch((error) => {
          log.warn("Cleanup failed:", { error: String(error) });
        });

      // Validate questions (using existing Zod schema validation)
      if (!args.questions || args.questions.length === 0) {
        throw new Error("At least one question is required");
      }

      // Convert Zod-validated questions to our internal Question type
      // Auto-generate titles like "Q1", "Q2" if not provided
      const questions: Question[] = args.questions.map((q, index) => ({
        options: q.options.map((opt) => ({
          description: opt.description,
          label: opt.label,
        })),
        prompt: q.prompt,
        title: q.title || `Q${index + 1}`,
      }));

      log.info("Starting session and waiting for user answers...", {
        questionCount: questions.length,
      });

      // Start complete session lifecycle - this will wait for user answers
      // Generate a per-tool-call ID and persist it with the session
      const callId = randomUUID();
      const { formattedResponse, sessionId } =
        await sessionManager.startSession(questions, callId);

      log.info("Session completed successfully", { sessionId, callId });

      // Return formatted response to AI model
      return {
        content: [
          {
            text: formattedResponse,
            type: "text",
          },
        ],
      };
    } catch (error) {
      log.error("Session failed", { error: String(error) });
      return {
        content: [
          {
            text: `Error in session: ${error}`,
            type: "text",
          },
        ],
      };
    }
  },
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
