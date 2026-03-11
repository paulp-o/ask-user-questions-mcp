import { FastMCP } from "fastmcp";
import { randomUUID } from "crypto";
import {
  AskUserQuestionsParametersSchema,
  createAskUserQuestionsCore,
} from "./core/ask-user-questions.js";
import { GetAnsweredQuestionsArgsSchema, GET_ANSWERED_QUESTIONS_DESCRIPTION, TOOL_DESCRIPTION } from "./shared/schemas.js";

const askUserQuestionsCore = createAskUserQuestionsCore();

// Track active requests with their AbortControllers for disconnect handling
const activeRequests = new Map<string, { controller: AbortController; sessionId?: string }>();

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

      // Create AbortController for this request to handle disconnects
      const controller = new AbortController();
      activeRequests.set(callId, { controller });

      // Capture working directory if available from MCP context
      // Note: MCP protocol does not currently expose client working directory
      // This field is reserved for future protocol enhancements
      const workingDirectory = (ctx as { workingDirectory?: string })
        .workingDirectory;

      try {
        // Handle non-blocking mode
        if (args.nonBlocking) {
          const { sessionId, questionCount } = await askUserQuestionsCore.askNonBlocking(
            args.questions,
            callId,
            workingDirectory,
          );
          const shortId = sessionId.slice(0, 8);
          const responseText =
            `[Session: ${shortId} | Questions: ${questionCount} | Status: pending]\n\n` +
            `Questions submitted successfully.\n` +
            `Use get_answered_questions(session_id="${shortId}") or \`auq fetch-answers ${shortId}\` to retrieve answers.`;
          return {
            content: [{ text: responseText, type: "text" }],
          };
        }

        const { formattedResponse, sessionId } = await askUserQuestionsCore.ask(
          args.questions,
          callId,
          workingDirectory,
          controller.signal,
        );

        // Update entry with sessionId for disconnect handler
        const entry = activeRequests.get(callId);
        if (entry) {
          entry.sessionId = sessionId;
        }

        log.info("Session completed successfully", { sessionId, callId });

        // Prepend metadata header to blocking responses
        const shortId = sessionId.slice(0, 8);
        const count = args.questions.length;
        const header = `[Session: ${shortId} | Questions: ${count}]`;
        const responseWithHeader = `${header}\n\n${formattedResponse}`;

        // Return formatted response to AI model
        return {
          content: [
            {
              text: responseWithHeader,
              type: "text",
            },
          ],
        };
      } catch (error) {
        // Handle abort (AI client disconnected)
        if (error instanceof Error && error.message === "ABORTED") {
          log.warn("Session aborted: AI client disconnected", { callId });
          return {
            content: [
              {
                text: "Session aborted: AI client disconnected",
                type: "text",
              },
            ],
          };
        }
        throw error; // Re-throw other errors to outer catch
      } finally {
        activeRequests.delete(callId);
      }
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


// Add the get_answered_questions tool
server.addTool({
  name: "get_answered_questions",
  annotations: {
    title: "Get Answered Questions",
    openWorldHint: false,
    readOnlyHint: true,
    idempotentHint: true,
  },
  description: GET_ANSWERED_QUESTIONS_DESCRIPTION,
  parameters: GetAnsweredQuestionsArgsSchema,
  execute: async (args, ctx) => {
    const { log } = ctx as {
      log: {
        info: (...args: unknown[]) => void;
        warn: (...args: unknown[]) => void;
        error: (...args: unknown[]) => void;
      };
    };

    const callId = randomUUID();
    const controller = new AbortController();
    activeRequests.set(callId, { controller });

    try {
      await askUserQuestionsCore.ensureInitialized();

      const { formattedResponse, sessionId, status } =
        await askUserQuestionsCore.getAnsweredQuestions(
          args.session_id,
          args.blocking,
          controller.signal,
        );

      log.info("Fetched answered questions", { sessionId, status, callId });

      return {
        content: [{ text: formattedResponse, type: "text" }],
      };
    } catch (error) {
      if (error instanceof Error && error.message === "ABORTED") {
        log.warn("Fetch aborted: AI client disconnected", { callId });
        return {
          content: [{ text: "Fetch aborted: AI client disconnected", type: "text" }],
        };
      }
      log.error("Fetch answered questions failed", { error: String(error) });
      return {
        content: [{ text: `Error fetching answers: ${error}`, type: "text" }],
      };
    } finally {
      activeRequests.delete(callId);
    }
  },
});

// Handle AI client disconnections gracefully
// Note: FastMCP disconnect event support depends on the version.
// If the event is not available, stale detection handles orphaned sessions as fallback.
try {
  (server as unknown as { on: (event: string, handler: () => void) => void }).on("disconnect", async () => {
    for (const [callId, entry] of activeRequests.entries()) {
      try {
        entry.controller.abort();
        if (entry.sessionId) {
          await askUserQuestionsCore.markAbandoned(entry.sessionId).catch(() => {});
        }
      } catch {
        // Silently ignore errors during disconnect cleanup
      }
      activeRequests.delete(callId);
    }
  });
} catch {
  // FastMCP version may not support disconnect events
  // Graceful fallback: stale detection handles orphaned sessions
}

// Start the server with stdio transport
server.start({
  transportType: "stdio",
});
