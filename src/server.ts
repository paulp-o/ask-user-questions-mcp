import { FastMCP, type FastMCPSession } from "fastmcp";
import { randomUUID } from "crypto";
import {
  AskUserQuestionsParametersSchema,
  createAskUserQuestionsCore,
} from "./core/ask-user-questions.js";
import {
  GetAnsweredQuestionsArgsSchema,
  GET_ANSWERED_QUESTIONS_DESCRIPTION,
  TOOL_DESCRIPTION,
} from "./shared/schemas.js";

const askUserQuestionsCore = createAskUserQuestionsCore();

// Track active requests with their AbortControllers for disconnect handling
const activeRequests = new Map<
  string,
  { controller: AbortController; sessionId?: string }
>();
let shuttingDown = false;

type ToolLog = {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
};

function getToolLog(ctx: unknown): ToolLog {
  const { log } = ctx as { log: ToolLog };
  // FastMCP does not await these logging promises. Do not write to a transport
  // that is being closed; otherwise normal disconnects cause unhandled errors.
  return {
    error: (...args) => {
      if (!shuttingDown) log.error(...args);
    },
    info: (...args) => {
      if (!shuttingDown) log.info(...args);
    },
    warn: (...args) => {
      if (!shuttingDown) log.warn(...args);
    },
  };
}

async function discardResponseDuringShutdown() {
  if (!shuttingDown) return;

  // The SDK does not abort in-flight tool handlers when the transport closes.
  // With no client left to receive a result, keep it out of the response path.
  // This per-request pending promise is not top-level and does not keep the
  // process alive or spin its event loop during shutdown.
  await new Promise<never>(() => {});
}

const server = new FastMCP({
  logger: {
    debug: console.error,
    error: console.error,
    info: console.error,
    log: console.error,
    warn: console.error,
  },
  name: "AskUserQuestions",
  instructions:
    "MCP server for asking users structured questions during AI execution. " +
    "Use ask_user_questions tool to gather preferences, clarify requirements, or make implementation decisions without blocking AI workflow.",
  // AUQ does not consume roots. Avoid a client-controlled roots/list request
  // delaying stdio startup and preventing prompt disconnects from finishing.
  roots: { enabled: false },
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
    // Register before the first await so shutdown cannot miss a request while
    // the session directory is still initializing.
    const callId = randomUUID();
    const controller = new AbortController();
    activeRequests.set(callId, { controller });
    const log = getToolLog(ctx);

    try {
      if (shuttingDown) throw new Error("ABORTED");

      // Initialize session manager if not already done
      await askUserQuestionsCore.ensureInitialized();
      if (controller.signal.aborted) throw new Error("ABORTED");

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

      // Capture working directory if available from MCP context
      // Note: MCP protocol does not currently expose client working directory
      // This field is reserved for future protocol enhancements
      const workingDirectory = (ctx as { workingDirectory?: string })
        .workingDirectory;

      try {
        // Handle non-blocking mode
        if (args.nonBlocking) {
          const { sessionId, questionCount } =
            await askUserQuestionsCore.askNonBlocking(
              args.questions,
              callId,
              workingDirectory,
            );
          const shortId = sessionId.slice(0, 8);
          const responseText =
            `[Session: ${shortId} | Questions: ${questionCount} | Status: pending]\n\n` +
            `Questions submitted successfully.\n` +
            `Use get_answered_questions(session_id="${shortId}") or \`auq fetch-answers ${shortId}\` to retrieve answers.`;
          await discardResponseDuringShutdown();
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
        await discardResponseDuringShutdown();
        return {
          content: [
            {
              text: responseWithHeader,
              type: "text",
            },
          ],
        };
      } catch (error) {
        await discardResponseDuringShutdown();
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
      }
    } catch (error) {
      await discardResponseDuringShutdown();
      if (error instanceof Error && error.message === "ABORTED") {
        log.warn("Session aborted before initialization completed", { callId });
        return {
          content: [
            {
              text: "Session aborted: AI client disconnected",
              type: "text",
            },
          ],
        };
      }
      log.error("Session failed", { error: String(error) });
      return {
        content: [
          {
            text: `Error in session: ${error}`,
            type: "text",
          },
        ],
      };
    } finally {
      activeRequests.delete(callId);
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
    const log = getToolLog(ctx);

    const callId = randomUUID();
    const controller = new AbortController();
    activeRequests.set(callId, { controller });

    try {
      if (shuttingDown) throw new Error("ABORTED");
      await askUserQuestionsCore.ensureInitialized();
      if (controller.signal.aborted) throw new Error("ABORTED");

      const { formattedResponse, sessionId, status } =
        await askUserQuestionsCore.getAnsweredQuestions(
          args.session_id,
          args.blocking,
          controller.signal,
        );

      log.info("Fetched answered questions", { sessionId, status, callId });

      await discardResponseDuringShutdown();
      return {
        content: [{ text: formattedResponse, type: "text" }],
      };
    } catch (error) {
      await discardResponseDuringShutdown();
      if (error instanceof Error && error.message === "ABORTED") {
        log.warn("Fetch aborted: AI client disconnected", { callId });
        return {
          content: [
            { text: "Fetch aborted: AI client disconnected", type: "text" },
          ],
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

// Abort all in-flight work when the client transport disconnects.
async function abortActiveRequests() {
  shuttingDown = true;
  const requests = [...activeRequests.entries()];
  await Promise.all(
    requests.map(async ([callId, entry]) => {
      try {
        entry.controller.abort();
        if (entry.sessionId) {
          await askUserQuestionsCore
            .markAbandoned(entry.sessionId)
            .catch(() => {});
        }
      } catch {
        // Continue cleaning up the remaining requests.
      } finally {
        activeRequests.delete(callId);
      }
    }),
  );
}

const sessions = new Set<FastMCPSession>();

server.on("connect", ({ session }) => {
  sessions.add(session);
});

server.on("disconnect", ({ session }) => {
  sessions.delete(session);
  void abortActiveRequests();
});

const startPromise = server.start({ transportType: "stdio" });

// The MCP SDK's stdio transport listens for data but does not close itself on
// stdin EOF. Explicitly stop accepting input and abort pending work so an MCP
// client closing its pipe cannot leave an orphaned, busy Bun process behind.
let shutdownPromise: Promise<void> | undefined;

function shutdown(exitCode: number) {
  if (shutdownPromise) return shutdownPromise;

  shuttingDown = true;
  process.exitCode = exitCode;
  process.stdin.pause();

  shutdownPromise ??= (async () => {
    try {
      await abortActiveRequests();
      await startPromise;
      await Promise.all([...sessions].map((session) => session.close()));
      await server.stop();
    } catch (error) {
      process.exitCode = 1;
      console.error("Failed to shut down MCP server cleanly:", error);
    }
  })();

  return shutdownPromise;
}

// Register before awaiting startup: FastMCP waits briefly for client
// capabilities, and a client can close its pipe or forward a signal meanwhile.
process.stdout.on("error", (error: NodeJS.ErrnoException) => {
  if (shuttingDown && error.code === "EPIPE") return;

  process.exitCode = 1;
  console.error("MCP stdout failed:", error);
});
process.stdin.once("end", () => void shutdown(0));
process.stdin.once("close", () => void shutdown(0));
process.once("SIGINT", () => void shutdown(130));
process.once("SIGTERM", () => void shutdown(143));

if (process.stdin.readableEnded || process.stdin.destroyed) {
  void shutdown(0);
}

await startPromise;
