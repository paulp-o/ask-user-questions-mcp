import { beforeEach, describe, expect, it, vi } from "vitest";

const handlers = new Map<unknown, Function>();

class ServerMock {
  connect = vi.fn();

  setRequestHandler(schema: unknown, handler: Function) {
    handlers.set(schema, handler);
  }
}

vi.mock("@modelcontextprotocol/sdk/server/index.js", () => ({
  Server: ServerMock,
}));

const ListToolsRequestSchema = Symbol("list");
const CallToolRequestSchema = Symbol("call");

vi.mock("@modelcontextprotocol/sdk/types.js", () => ({
  ListToolsRequestSchema,
  CallToolRequestSchema,
}));

describe("createMcpServer", () => {
  beforeEach(() => {
    handlers.clear();
  });

  it("registers tool definitions and non-blocking ask flow", async () => {
    const { createMcpServer } = await import("../../src/lib/mcp-transport");

    const sessionManager = {
      createSession: vi.fn().mockResolvedValue("session-123"),
      getAllSessionIds: vi.fn().mockResolvedValue(["session-123"]),
      getSessionStatus: vi.fn().mockResolvedValue({
        status: "pending",
        rejectionReason: null,
      }),
      getSessionAnswers: vi.fn(),
      getSessionRequest: vi.fn(),
    } as any;

    createMcpServer(sessionManager);

    const listHandler = handlers.get(ListToolsRequestSchema) as Function;
    const callHandler = handlers.get(CallToolRequestSchema) as Function;

    const listResult = await listHandler();
    expect(listResult.tools).toHaveLength(2);
    expect(listResult.tools.map((tool: { name: string }) => tool.name)).toEqual(
      expect.arrayContaining(["ask_user_questions", "get_answered_questions"]),
    );
    expect(listResult.tools[0].inputSchema).toBeTypeOf("object");
    expect(listResult.tools[1].inputSchema).toBeTypeOf("object");

    const askResult = await callHandler({
      params: {
        name: "ask_user_questions",
        arguments: {
          questions: [
            {
              title: "Title",
              prompt: "Prompt",
              options: [
                { label: "A" },
                { label: "B" },
              ],
              multiSelect: false,
            },
          ],
        },
      },
    });

    expect(sessionManager.createSession).toHaveBeenCalledTimes(1);
    expect(askResult.content[0].text).toContain("session-123");
  });

  it("returns formatted output for completed sessions", async () => {
    const { createMcpServer } = await import("../../src/lib/mcp-transport");

    const sessionManager = {
      createSession: vi.fn(),
      getAllSessionIds: vi.fn().mockResolvedValue(["abcd-1234-efgh-5678-ijklmnopqrst"]),
      getSessionStatus: vi.fn().mockResolvedValue({
        status: "completed",
        rejectionReason: null,
      }),
      getSessionAnswers: vi.fn().mockResolvedValue({
        sessionId: "abcd-1234-efgh-5678-ijklmnopqrst",
        timestamp: new Date().toISOString(),
        answers: [{ questionIndex: 0, selectedOption: "A", timestamp: new Date().toISOString() }],
      }),
      getSessionRequest: vi.fn().mockResolvedValue({
        sessionId: "abcd-1234-efgh-5678-ijklmnopqrst",
        status: "completed",
        timestamp: new Date().toISOString(),
        questions: [
          {
            title: "Title",
            prompt: "Prompt",
            options: [{ label: "A" }, { label: "B" }],
          },
        ],
      }),
    } as any;

    createMcpServer(sessionManager);

    const callHandler = handlers.get(CallToolRequestSchema) as Function;
    const result = await callHandler({
      params: {
        name: "get_answered_questions",
        arguments: { session_id: "abcd-1234" },
      },
    });

    expect(result.content[0].text).toContain("[Session:");
  });
});