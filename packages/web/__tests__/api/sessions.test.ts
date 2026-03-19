import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/lib/server-state", () => ({
  getServerState: vi.fn(),
}));

import { getServerState } from "../../src/lib/server-state";

type MockStoredSession = {
  answers?: unknown;
  request: {
    questions: unknown[];
    sessionId: string;
  };
  status: {
    createdAt: string;
    lastModified: string;
    status: string;
  };
};

const createStoredSession = (
  id: string,
  status: "completed" | "pending" | "rejected",
  answered = false,
): MockStoredSession => ({
  request: {
    sessionId: id,
    questions: [{ title: "Q1" }],
  },
  status: {
    status,
    createdAt: "2026-03-19T00:00:00.000Z",
    lastModified: "2026-03-19T00:05:00.000Z",
  },
  ...(answered
    ? {
        answers: {
          sessionId: id,
          timestamp: "2026-03-19T00:06:00.000Z",
          answers: [{ questionIndex: 0, selectedOption: "A", timestamp: "2026-03-19T00:06:00.000Z" }],
        },
      }
    : {}),
});

describe("sessions API routes", () => {
  const sessions = new Map<string, MockStoredSession>();

  const sessionManager = {
    getAllSessionIds: vi.fn(async () => Array.from(sessions.keys())),
    getSession: vi.fn(async (id: string) => {
      const session = sessions.get(id);
      if (!session) {
        throw new Error("Session not found");
      }
      return session;
    }),
    saveSessionAnswers: vi.fn(async (id: string, payload: any) => {
      const session = sessions.get(id);
      if (!session) {
        throw new Error("Session not found");
      }

      const next: MockStoredSession = {
        ...session,
        answers: payload,
        status: { ...session.status, status: "completed" },
      };
      sessions.set(id, next);
    }),
    deleteSession: vi.fn(async (id: string) => {
      if (!sessions.has(id)) {
        throw new Error("Session not found");
      }
      sessions.delete(id);
    }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    sessions.clear();
    sessions.set("s-1", createStoredSession("s-1", "pending"));
    sessions.set("s-2", createStoredSession("s-2", "completed", true));
    sessions.set("s-3", createStoredSession("s-3", "rejected"));
    vi.mocked(getServerState).mockResolvedValue({
      sessionManager: sessionManager as any,
    } as any);
  });

  it("GET /api/sessions returns an array", async () => {
    const { GET } = await import("../../src/app/api/sessions/route");

    const response = await GET(new Request("http://localhost/api/sessions"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(3);
  });

  it("GET /api/sessions?status=pending filters sessions", async () => {
    const { GET } = await import("../../src/app/api/sessions/route");

    const response = await GET(
      new Request("http://localhost/api/sessions?status=pending"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe("s-1");
    expect(body[0].status).toBe("pending");
  });

  it("GET /api/sessions/[id] returns session detail", async () => {
    const { GET } = await import("../../src/app/api/sessions/[id]/route");

    const response = await GET(new Request("http://localhost/api/sessions/s-1"), {
      params: { id: "s-1" },
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.id).toBe("s-1");
    expect(body.status.status).toBe("pending");
  });

  it("GET /api/sessions/[id] returns 404 for missing sessions", async () => {
    const { GET } = await import("../../src/app/api/sessions/[id]/route");

    const response = await GET(new Request("http://localhost/api/sessions/missing"), {
      params: { id: "missing" },
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Session not found");
  });

  it("POST /api/sessions/[id]/answer updates a session", async () => {
    const { POST } = await import("../../src/app/api/sessions/[id]/answer/route");

    const response = await POST(
      new Request("http://localhost/api/sessions/s-1/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: [
            {
              questionIndex: 0,
              selectedOption: "A",
              timestamp: "2026-03-19T00:10:00.000Z",
            },
          ],
        }),
      }),
      { params: { id: "s-1" } },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(sessionManager.saveSessionAnswers).toHaveBeenCalledTimes(1);
    expect(body.success).toBe(true);
    expect(body.session.status.status).toBe("completed");
  });

  it("DELETE /api/sessions/[id] removes a session", async () => {
    const { DELETE } = await import("../../src/app/api/sessions/[id]/route");

    const response = await DELETE(new Request("http://localhost/api/sessions/s-3"), {
      params: { id: "s-3" },
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(sessions.has("s-3")).toBe(false);
  });
});