import { describe, expect, it, vi } from "vitest";

const addTool = vi.fn();
const start = vi.fn();

const FastMCPMock = vi.fn().mockImplementation(() => ({
  addTool,
  start,
}));

vi.mock("fastmcp", () => ({
  FastMCP: FastMCPMock,
}));

describe("CLI server", () => {
  it("imports server module and registers expected MCP tools", async () => {
    await import("../src/server.ts");

    expect(FastMCPMock).toHaveBeenCalledTimes(1);
    expect(addTool).toHaveBeenCalledTimes(2);

    const toolNames = addTool.mock.calls.map((call) => call[0]?.name);
    expect(toolNames).toContain("ask_user_questions");
    expect(toolNames).toContain("get_answered_questions");
    expect(start).toHaveBeenCalledWith({ transportType: "stdio" });
  });
});