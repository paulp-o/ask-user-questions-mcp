import { createKeepalive, getSseEmitter, type SseClient } from "../../../lib/sse-emitter";
import { getServerState } from "../../../lib/server-state";

export async function GET(request: Request): Promise<Response> {
  const { events } = await getServerState();
  const emitter = getSseEmitter(events);

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const client: SseClient = {
        enqueue: (chunk) => controller.enqueue(chunk),
      };

      emitter.addClient(client);
      const stopKeepalive = createKeepalive(client, 30000);

      const onAbort = () => {
        stopKeepalive();
        emitter.removeClient(client);
        controller.close();
      };

      if (request.signal.aborted) {
        onAbort();
        return;
      }

      request.signal.addEventListener("abort", onAbort, { once: true });
    },
    cancel() {
      return;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}