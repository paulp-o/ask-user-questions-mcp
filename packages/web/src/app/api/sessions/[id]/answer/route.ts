import type { NextRequest } from "next/server";
import type { SessionAnswer, UserAnswer } from "@auq/core";

import { getServerState } from "../../../../../lib/server-state";

type AnswerRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const isUserAnswer = (value: unknown): value is UserAnswer => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const answer = value as Partial<UserAnswer>;
  return (
    typeof answer.questionIndex === "number"
    && typeof answer.timestamp === "string"
  );
};

export async function POST(
  request: Request | NextRequest,
  { params }: AnswerRouteContext,
): Promise<Response> {
  const { sessionManager } = await getServerState();
  const body = (await request.json().catch(() => null)) as { answers?: unknown } | null;

  if (!body || !Array.isArray(body.answers) || !body.answers.every(isUserAnswer)) {
    return Response.json(
      { error: "Invalid request body. Expected { answers: UserAnswer[] }." },
      { status: 400 },
    );
  }

  const { id } = await params;

  const sessionAnswer: SessionAnswer = {
    sessionId: id,
    timestamp: new Date().toISOString(),
    answers: body.answers,
  };

  try {
    await sessionManager.saveSessionAnswers(id, sessionAnswer);
    const updatedSession = await sessionManager.getSession(id);

    return Response.json({
      success: true,
      session: {
        id: updatedSession.request.sessionId,
        request: updatedSession.request,
        status: updatedSession.status,
        answers: updatedSession.answers ?? null,
      },
    });
  } catch {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }
}