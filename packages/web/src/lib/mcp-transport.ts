import { z } from "zod";

import {
  AskUserQuestionsParametersSchema,
  GetAnsweredQuestionsArgsSchema,
  ResponseFormatter,
  type SessionManager,
} from "@auq/core";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const TOOL_DESCRIPTION =
  "Ask users structured questions and return a session id for async answering.";
const GET_ANSWERED_QUESTIONS_DESCRIPTION =
  "Get answers for a session returned by ask_user_questions.";

const toolResponse = (text: string) => ({
  content: [{ type: "text" as const, text }],
});

const resolveSessionId = async (
  sessionManager: SessionManager,
  sessionId: string,
): Promise<string> => {
  if (sessionId.length >= 36) {
    return sessionId;
  }

  const allIds = await sessionManager.getAllSessionIds();
  const match = allIds.find((id) => id.startsWith(sessionId));
  if (!match) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  return match;
};

export function createMcpServer(sessionManager: SessionManager): Server {
  const server = new Server(
    {
      name: "auq-mcp-web",
      version: "4.0.0",
    },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "ask_user_questions",
        description: TOOL_DESCRIPTION,
        inputSchema: z.toJSONSchema(AskUserQuestionsParametersSchema),
      },
      {
        name: "get_answered_questions",
        description: GET_ANSWERED_QUESTIONS_DESCRIPTION,
        inputSchema: z.toJSONSchema(GetAnsweredQuestionsArgsSchema),
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "ask_user_questions") {
      const args = AskUserQuestionsParametersSchema.parse(
        request.params.arguments ?? {},
      );

      const sessionId = await sessionManager.createSession(args.questions);

      return toolResponse(
        JSON.stringify({
          sessionId,
          questionCount: args.questions.length,
          status: "pending",
        }),
      );
    }

    if (request.params.name === "get_answered_questions") {
      const args = GetAnsweredQuestionsArgsSchema.parse(
        request.params.arguments ?? {},
      );
      const resolvedSessionId = await resolveSessionId(
        sessionManager,
        args.session_id,
      );

      const sessionStatus = await sessionManager.getSessionStatus(resolvedSessionId);
      if (!sessionStatus) {
        throw new Error(`Session not found: ${args.session_id}`);
      }

      if (sessionStatus.status === "completed") {
        const answers = await sessionManager.getSessionAnswers(resolvedSessionId);
        const requestData = await sessionManager.getSessionRequest(resolvedSessionId);

        if (!answers || !requestData) {
          throw new Error(`Session data incomplete: ${resolvedSessionId}`);
        }

        return toolResponse(
          ResponseFormatter.formatGetAnsweredResponse({
            sessionId: resolvedSessionId,
            status: "completed",
            answers,
            questions: requestData.questions,
          }),
        );
      }

      return toolResponse(
        ResponseFormatter.formatGetAnsweredResponse({
          sessionId: resolvedSessionId,
          status: sessionStatus.status,
          reason: sessionStatus.rejectionReason ?? undefined,
        }),
      );
    }

    throw new Error(`Unknown tool: ${request.params.name}`);
  });

  return server;
}