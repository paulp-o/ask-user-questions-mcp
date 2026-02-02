import { FastMCP } from "fastmcp";
import { randomUUID } from "crypto";
import {
  AskUserQuestionsParametersSchema,
  createAskUserQuestionsCore,
} from "./core/ask-user-questions.js";
import { TOOL_DESCRIPTION } from "./shared/schemas.js";

const askUserQuestionsCore = createAskUserQuestionsCore();

const server = new FastMCP({
  name: "AskUserQuestions",
  instructions:
    "MCP server for asking users structured questions during AI execution. " +
    "Use ask_user_questions tool to gather preferences, clarify requirements, or make implementation decisions without blocking AI workflow.",
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
  description: TOOL_DESCRIPTION,
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

      // Capture working directory if available from MCP context
      // Note: MCP protocol does not currently expose client working directory
      // This field is reserved for future protocol enhancements
      const workingDirectory = (ctx as { workingDirectory?: string })
        .workingDirectory;

      const { formattedResponse, sessionId } = await askUserQuestionsCore.ask(
        args.questions,
        callId,
        workingDirectory,
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
