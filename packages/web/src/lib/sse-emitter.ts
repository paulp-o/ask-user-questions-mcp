import type { SessionEventEmitter } from "@auq/core";

type SsePayload = Record<string, unknown>;

export interface SseClient {
  enqueue: (chunk: Uint8Array) => void;
}

const encoder = new TextEncoder();

const formatEvent = (event: string, data: SsePayload): Uint8Array => {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
};

const formatPing = (): Uint8Array => encoder.encode(": ping\n\n");

export class SseEmitter {
  private readonly clients = new Set<SseClient>();
  private boundEvents?: SessionEventEmitter;

  addClient(client: SseClient): void {
    this.clients.add(client);
  }

  removeClient(client: SseClient): void {
    this.clients.delete(client);
  }

  broadcast(event: string, data: SsePayload): void {
    const payload = formatEvent(event, data);
    for (const client of this.clients) {
      try {
        client.enqueue(payload);
      } catch {
        this.clients.delete(client);
      }
    }
  }

  attach(events: SessionEventEmitter): void {
    if (this.boundEvents === events) {
      return;
    }

    this.boundEvents = events;
    events.on("session:created", (sessionId) => {
      this.broadcast("session-created", { sessionId });
    });
    events.on("session:answered", (sessionId) => {
      this.broadcast("session-answered", { sessionId });
    });
    events.on("session:rejected", (sessionId, reason) => {
      this.broadcast("session-rejected", { sessionId, reason: reason ?? null });
    });
    events.on("session:timeout", (sessionId) => {
      this.broadcast("session-timeout", { sessionId });
    });
  }
}

let sharedEmitter: SseEmitter | null = null;

export const getSseEmitter = (events?: SessionEventEmitter): SseEmitter => {
  if (!sharedEmitter) {
    sharedEmitter = new SseEmitter();
  }

  if (events) {
    sharedEmitter.attach(events);
  }

  return sharedEmitter;
};

export const createKeepalive = (
  client: SseClient,
  intervalMs: number = 30000,
): (() => void) => {
  const timer = setInterval(() => {
    client.enqueue(formatPing());
  }, intervalMs);

  return () => clearInterval(timer);
};