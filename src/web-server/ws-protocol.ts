import type { WSContext } from "hono/ws";
import type { WebSocket } from "ws";
import type { WSMessage } from "@auq/shared";

export type { WSMessage, WSMessageType } from "@auq/shared";
export { WS_TYPES } from "@auq/shared";

/**
 * Broadcast a WebSocket message to all connected clients.
 */
export function broadcast(
  clients: Set<WSContext<WebSocket>>,
  msg: WSMessage,
): void {
  const data = JSON.stringify(msg);
  for (const client of clients) {
    if (client.readyState === 1) {
      client.send(data);
    }
  }
}

/**
 * Create a typed WSMessage envelope.
 */
export function createMessage<T>(
  type: string,
  payload?: T,
  requestId?: string,
): WSMessage<T> {
  return {
    type,
    payload,
    requestId,
    timestamp: new Date().toISOString(),
  };
}