
import type { WSContext } from "hono/ws";
import type { WebSocket } from "ws";
import type { SessionAnswer, SessionRequest } from "@auq/shared";

import { SessionManager } from "../session/SessionManager.js";
import {
  createTUIWatcher,
  type EnhancedTUISessionWatcher,
} from "../tui/session-watcher.js";
import { broadcast, createMessage, WS_TYPES } from "./ws-protocol.js";

interface SessionBridgeState {
  sessions: Map<string, SessionRequest>;
  statuses: Map<string, string>;
}

export class SessionBridge {
  private watcher: EnhancedTUISessionWatcher;
  private sessionManager: SessionManager;
  private clients: Set<WSContext<WebSocket>>;
  private state: SessionBridgeState = {
    sessions: new Map(),
    statuses: new Map(),
  };
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    clients: Set<WSContext<WebSocket>>,
    watcher?: EnhancedTUISessionWatcher,
    sessionManager?: SessionManager,
  ) {
    this.clients = clients;
    this.watcher = watcher ?? createTUIWatcher({ autoLoadData: true });
    this.sessionManager = sessionManager ?? new SessionManager();
  }

  static create(
    clients: Set<WSContext<WebSocket>>,
    watcher: EnhancedTUISessionWatcher,
    sessionManager: SessionManager,
  ): SessionBridge {
    return new SessionBridge(clients, watcher, sessionManager);
  }

  start(): void {
    this.watcher.startEnhancedWatching((event) => {
      if (event.type === "session-created" && event.sessionRequest) {
        this.state.sessions.set(event.sessionId, event.sessionRequest);
        this.state.statuses.set(event.sessionId, event.sessionRequest.status);
        broadcast(
          this.clients,
          createMessage(WS_TYPES.SESSION_NEW, {
            sessionId: event.sessionId,
            session: event.sessionRequest,
          }),
        );
      }
    });

    this.pollInterval = setInterval(() => {
      void this.pollStatusChanges();
    }, 2000);
  }

  stop(): void {
    this.watcher.stop();
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  async getInitialState(): Promise<SessionRequest[]> {
    const sessionIds = await this.watcher.getPendingSessions();
    const sessions: SessionRequest[] = [];
    for (const id of sessionIds) {
      const req = await this.watcher.getSessionRequest(id);
      if (req) {
        this.state.sessions.set(id, req);
        this.state.statuses.set(id, req.status);
        sessions.push(req);
      }
    }
    return sessions;
  }

  async handleMessage(
    ws: WSContext<WebSocket>,
    type: string,
    payload: unknown,
    requestId?: string,
  ): Promise<void> {
    switch (type) {
      case WS_TYPES.SESSION_LIST: {
        const sessions = await this.getInitialState();
        ws.send(
          JSON.stringify(
            createMessage(WS_TYPES.SESSION_LIST_RESULT, { sessions }, requestId),
          ),
        );
        break;
      }
      case WS_TYPES.SESSION_ANSWER: {
        const { sessionId, answers } = payload as {
          sessionId: string;
          answers: SessionAnswer;
        };
        try {
          await this.sessionManager.saveSessionAnswers(sessionId, answers);
          ws.send(
            JSON.stringify(
              createMessage(
                WS_TYPES.SESSION_ANSWER_RESULT,
                { ok: true, sessionId },
                requestId,
              ),
            ),
          );
        } catch (err) {
          ws.send(
            JSON.stringify(
              createMessage(
                WS_TYPES.SESSION_ANSWER_RESULT,
                { ok: false, error: String(err), sessionId },
                requestId,
              ),
            ),
          );
        }
        break;
      }
      case WS_TYPES.SESSION_REJECT: {
        const { sessionId, reason } = payload as {
          sessionId: string;
          reason?: string;
        };
        try {
          await this.sessionManager.rejectSession(sessionId, reason);
          ws.send(
            JSON.stringify(
              createMessage(
                WS_TYPES.SESSION_REJECT_RESULT,
                { ok: true, sessionId },
                requestId,
              ),
            ),
          );
        } catch (err) {
          ws.send(
            JSON.stringify(
              createMessage(
                WS_TYPES.SESSION_REJECT_RESULT,
                { ok: false, error: String(err), sessionId },
                requestId,
              ),
            ),
          );
        }
        break;
      }
    }
  }

  private async pollStatusChanges(): Promise<void> {
    try {
      const allIds = await this.sessionManager.getAllSessionIds();
      for (const id of allIds) {
        const status = await this.sessionManager.getSessionStatus(id);
        if (!status) continue;

        const prevStatus = this.state.statuses.get(id);
        if (prevStatus && prevStatus !== status.status) {
          this.state.statuses.set(id, status.status);
          if (
            status.status === "completed" ||
            status.status === "rejected" ||
            status.status === "timed_out" ||
            status.status === "abandoned"
          ) {
            this.state.sessions.delete(id);
            broadcast(
              this.clients,
              createMessage(WS_TYPES.SESSION_REMOVED, {
                sessionId: id,
                status: status.status,
              }),
            );
          } else {
            broadcast(
              this.clients,
              createMessage(WS_TYPES.SESSION_STATUS, {
                sessionId: id,
                status: status.status,
              }),
            );
          }
        }
      }
    } catch {
      // polling errors are non-fatal
    }
  }
}
