
import type { WSContext } from "hono/ws";
import type { WebSocket } from "ws";

import { SessionManager } from "../session/SessionManager.js";
import { createMessage, WS_TYPES } from "./ws-protocol.js";

export class HistoryBridge {
  private sessionManager: SessionManager;

  constructor() {
    this.sessionManager = new SessionManager();
  }

  async handleMessage(
    ws: WSContext<WebSocket>,
    type: string,
    payload: unknown,
    requestId?: string,
  ): Promise<void> {
    switch (type) {
      case WS_TYPES.HISTORY_LIST: {
        const {
          page = 1,
          pageSize = 20,
          status: filterStatus,
        } = (payload as {
          page?: number;
          pageSize?: number;
          status?: string;
        }) ?? {};
        try {
          const allIds = await this.sessionManager.getAllSessionIds();
          const sessions = [];
          for (const id of allIds) {
            const status = await this.sessionManager.getSessionStatus(id);
            if (!status) continue;
            if (filterStatus && status.status !== filterStatus) continue;
            sessions.push(status);
          }
          sessions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
          const total = sessions.length;
          const offset = (page - 1) * pageSize;
          const paginated = sessions.slice(offset, offset + pageSize);
          ws.send(
            JSON.stringify(
              createMessage(
                WS_TYPES.HISTORY_LIST_RESULT,
                { sessions: paginated, total, page, pageSize },
                requestId,
              ),
            ),
          );
        } catch (err) {
          ws.send(
            JSON.stringify(
              createMessage(
                WS_TYPES.HISTORY_LIST_RESULT,
                { sessions: [], total: 0, page: 1, pageSize, error: String(err) },
                requestId,
              ),
            ),
          );
        }
        break;
      }
      case WS_TYPES.HISTORY_DETAIL: {
        const { sessionId } = payload as { sessionId: string };
        try {
          const [status, request, answers] = await Promise.all([
            this.sessionManager.getSessionStatus(sessionId),
            this.sessionManager.getSessionRequest(sessionId),
            this.sessionManager.getSessionAnswers(sessionId),
          ]);
          ws.send(
            JSON.stringify(
              createMessage(
                WS_TYPES.HISTORY_DETAIL_RESULT,
                { sessionId, status, request, answers },
                requestId,
              ),
            ),
          );
        } catch (err) {
          ws.send(
            JSON.stringify(
              createMessage(
                WS_TYPES.HISTORY_DETAIL_RESULT,
                { sessionId, error: String(err) },
                requestId,
              ),
            ),
          );
        }
        break;
      }
    }
  }
}
