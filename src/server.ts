import { FastMCP } from "fastmcp";
import { randomUUID } from "crypto";
import { z } from "zod";

import type { Question } from "./session/types.js";

import { SessionManager } from "./session/index.js";
import { getSessionDirectory } from "./session/utils.js";

// Get session directory (auto-detects global vs local install)
const sessionDir = getSessionDirectory();

// Log session directory for debugging
console.error(`[AUQ] Session directory: ${sessionDir}`);

// Initialize session manager with detected session directory
const sessionManager = new SessionManager({ baseDir: sessionDir });

const server = new FastMCP({
  name: "AskUserQuestions",
  instructions:
    "This MCP server provides a tool to ask structured questions to the user. " +
    "Use the ask_user_questions tool when you need to:\n" +
    "- Gather user preferences or requirements during execution\n" +
    "- Clarify ambiguous instructions or implementation choices\n" +
    "- Get decisions on what direction to take\n" +
    "- Offer choices to the user about multiple valid approaches\n\n" +
    "The tool allows AI models to pause execution and gather direct user input through an interactive TUI, " +
    "returning formatted responses for continued reasoning. " +
    "Each question supports 2-4 multiple-choice options with descriptions, and users can always provide custom text input. " +
    "Both single-select and multi-select modes are supported.",
  version: "0.1.7",
});

// Define the question and option schemas
const OptionSchema = z.object({
  label: z
    .string()
    .describe(
      "The display text for this option that the user will see and select. " +
        "Should be concise (1-5 words) and clearly describe the choice."
    ),
  description: z
    .string()
    .optional()
    .describe(
      "Explanation of what this option means or what will happen if chosen. " +
        "Useful for providing context about trade-offs or implications."
    ),
});

const QuestionSchema = z.object({
  prompt: z
    .string()
    .describe(
      "The complete question to ask the user. Should be clear, specific, and end with a question mark. " +
        "Example: 'Which programming language do you want to use?' " +
        "If multiSelect is true, phrase it accordingly, e.g. 'Which features do you want to enable?'"
    ),
  title: z
    .string()
    .min(
      1,
      "Question title is required. Provide a short summary like 'Language' or 'Framework'."
    )
    .describe(
      "Very short label displayed as a chip/tag (max 12 chars). " +
        "Examples: 'Auth method', 'Library', 'Approach'. " +
        "This title appears in the interface to help users quickly identify questions."
    ),
  options: z
    .array(OptionSchema)
    .min(2)
    .max(4)
    .describe(
      "The available choices for this question. Must have 2-4 options. " +
        "Each option should be a distinct, mutually exclusive choice (unless multiSelect is enabled). " +
        "There should be no 'Other' option, that will be provided automatically."
    ),
  multiSelect: z
    .boolean()
    .describe(
      "Set to true to allow the user to select multiple options instead of just one. " +
        "Use when choices are not mutually exclusive. Default: false (single-select)"
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
    "Use this tool when you need to ask the user questions during execution. " +
    "This allows you to:\n" +
    "1. Gather user preferences or requirements\n" +
    "2. Clarify ambiguous instructions\n" +
    "3. Get decisions on implementation choices as you work\n" +
    "4. Offer choices to the user about what direction to take\n\n" +
    "FEATURES:\n" +
    "- Ask 1-4 structured questions via an interactive terminal interface\n" +
    "- Each question includes 2-4 multiple-choice options with explanatory descriptions\n" +
    "- Users can always provide custom free-text input as an alternative to predefined options\n" +
    "- Single-select mode (default): User picks ONE option or provides custom text\n" +
    "- Multi-select mode (multiSelect: true): User can select MULTIPLE options\n\n" +
    "USAGE NOTES:\n" +
    "- Always provide a descriptive 'title' field (max 12 chars) for each question\n" +
    "- Use multiSelect: true when choices are not mutually exclusive\n" +
    "- Option labels should be concise (1-5 words)\n" +
    "- Questions should end with a question mark\n" +
    "- Don't include an 'Other' option - it's provided automatically\n\n" +
    "- If user seems not aware how to answer the question, inform them that they need to install the 'auq' cli tool.\n\n" +
    "Returns a formatted summary of all questions and answers.",
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
      const questions: Question[] = args.questions.map((q) => ({
        options: q.options.map((opt) => ({
          description: opt.description,
          label: opt.label,
        })),
        prompt: q.prompt,
        title: q.title,
        multiSelect: q.multiSelect,
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
      .max(4)
      .describe(
        "Questions to ask the user (1-4 questions). " +
          "Each question must include: prompt (full question text), title (short label, max 12 chars), " +
          "options (2-4 choices with labels and descriptions), and multiSelect (boolean)."
      ),
  }),
});

// Start the server with stdio transport
server.start({
  transportType: "stdio",
});
