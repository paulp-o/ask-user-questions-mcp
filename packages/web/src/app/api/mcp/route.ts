import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

import { createMcpServer } from "../../../lib/mcp-transport";
import { getServerState } from "../../../lib/server-state";

type StreamableTransportWithHandler = StreamableHTTPServerTransport & {
  handleRequest: (request: Request) => Promise<Response>;
};

export async function POST(request: Request): Promise<Response> {
  const { sessionManager } = await getServerState();
  const server = createMcpServer(sessionManager);

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  await server.connect(transport);
  const typedTransport = transport as StreamableTransportWithHandler;
  return typedTransport.handleRequest(request);
}