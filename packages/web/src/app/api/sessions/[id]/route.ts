import type { NextRequest } from "next/server";

import { getServerState } from "../../../../lib/server-state";

type SessionRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  _request: Request | NextRequest,
  { params }: SessionRouteContext,
): Promise<Response> {
  const { sessionManager } = await getServerState();

  try {
    const { id } = await params;
    const session = await sessionManager.getSession(id);
    return Response.json({
      id: session.request.sessionId,
      request: session.request,
      status: session.status,
      answers: session.answers ?? null,
    });
  } catch {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }
}

export async function DELETE(
  _request: Request | NextRequest,
  { params }: SessionRouteContext,
): Promise<Response> {
  const { sessionManager } = await getServerState();

  try {
    const { id } = await params;
    await sessionManager.deleteSession(id);
    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }
}