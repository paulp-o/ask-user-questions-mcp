import {
  createSessionEventEmitter,
  SessionManager,
  type SessionEventEmitter,
} from "@auq/core";

import { SQLiteStore } from "./stores/SQLiteStore";
import { getSseEmitter, type SseEmitter } from "./sse-emitter";

export type ServerState = {
  events: SessionEventEmitter;
  sessionManager: SessionManager;
  store: SQLiteStore;
  sseEmitter: SseEmitter;
};

let serverStatePromise: null | Promise<ServerState> = null;

export const getServerState = async (): Promise<ServerState> => {
  if (!serverStatePromise) {
    serverStatePromise = (async () => {
      const store = new SQLiteStore();
      const events = createSessionEventEmitter();
      const sessionManager = new SessionManager({ events, storage: store });

      await sessionManager.initialize();

      const sseEmitter = getSseEmitter(events);

      return { events, sessionManager, store, sseEmitter };
    })();
  }

  return serverStatePromise;
};