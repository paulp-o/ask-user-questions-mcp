import { getServerState } from "../../../lib/server-state";

const VALID_STATUS_FILTERS = new Set(["pending", "completed", "rejected"]);

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