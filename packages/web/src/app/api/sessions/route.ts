import type { Question } from "@auq/core";
import { getServerState } from "../../../lib/server-state";

const VALID_STATUS_FILTERS = new Set(["pending", "completed", "rejected"]);

const isValidQuestion = (value: unknown): value is Question => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const question = value as Partial<Question> & { options?: unknown[] };
  return (
    typeof question.title === "string"
    && question.title.length > 0
    && typeof question.prompt === "string"
    && question.prompt.length > 0
    && Array.isArray(question.options)
    && question.options.length > 0
    && question.options.every(
      (option) => option && typeof option === "object" && typeof (option as { label?: unknown }).label === "string",
    )
  );
};

export async function GET(request: Request): Promise<Response> {
  const { sessionManager } = await getServerState();
  const url = new URL(request.url);
  const status = url.searchParams.get("status");

  if (status && !VALID_STATUS_FILTERS.has(status)) {
    return Response.json(
      { error: "Invalid status filter. Use pending, completed, or rejected." },
      { status: 400 },
    );
  }

  const sessionIds = await sessionManager.getAllSessionIds();
  const sessions = await Promise.all(
    sessionIds.map(async (sessionId) => {
      const session = await sessionManager.getSession(sessionId);
      return {
        id: session.request.sessionId,
        status: session.status.status,
        createdAt: session.status.createdAt,
        updatedAt: session.status.lastModified,
        questionCount: session.request.questions.length,
        answered: Boolean(session.answers),
      };
    }),
  );

  const filteredSessions = status
    ? sessions.filter((session) => session.status === status)
    : sessions;

  return Response.json(filteredSessions);
}

export async function POST(request: Request): Promise<Response> {
  const { sessionManager, sseEmitter } = await getServerState();
  const body = (await request.json().catch(() => null)) as { questions?: unknown } | null;

  if (!body || !Array.isArray(body.questions) || body.questions.length === 0) {
    return Response.json(
      { error: "Invalid request body. Expected { questions: Question[] } with at least one question." },
      { status: 400 },
    );
  }

  if (!body.questions.every(isValidQuestion)) {
    return Response.json(
      { error: "Invalid request body. Each question must include title, prompt, and options." },
      { status: 400 },
    );
  }

  const sessionId = await sessionManager.createSession(body.questions);
  sseEmitter.broadcast("session-created", { sessionId });

  return Response.json({ sessionId }, { status: 201 });
}