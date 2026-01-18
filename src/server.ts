import { FastMCP } from "fastmcp";
import { randomUUID } from "crypto";
import {
  AskUserQuestionsParametersSchema,
  createAskUserQuestionsCore,
} from "./core/ask-user-questions.js";

const askUserQuestionsCore = createAskUserQuestionsCore();

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
  version: "0.1.17",
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
    "- Don't include an 'Other' option - it's provided automatically\n" +
    "- Mark one option as recommended.\n\n" +
    "- If user seems not aware how to answer the question, inform them that they need to install the 'auq' cli tool.\n\n" +
    "Returns a formatted summary of all questions and answers.",
  execute: async (args, ctx) => {
    const { log } = ctx as {
      log: {
        info: (...args: unknown[]) => void;
        warn: (...args: unknown[]) => void;
        error: (...args: unknown[]) => void;
      };
    };

    try {
      // Initialize session manager if not already done
      await askUserQuestionsCore.ensureInitialized();

      // Clean up old sessions on startup (non-blocking)
      askUserQuestionsCore
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

      // Generate a per-tool-call ID and persist it with the session
      const callId = randomUUID();

      const { formattedResponse, sessionId } = await askUserQuestionsCore.ask(
        args.questions,
        callId,
      );

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
  parameters: AskUserQuestionsParametersSchema,
});

// Start the server with stdio transport
server.start({
  transportType: "stdio",
});
