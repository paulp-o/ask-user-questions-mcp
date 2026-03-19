import {
  createSessionEventEmitter,
  SessionManager,
  type SessionEventEmitter,
} from "@auq/core";

import { SQLiteStore } from "./stores/SQLiteStore";

export type ServerState = {
  events: SessionEventEmitter;
  sessionManager: SessionManager;
  store: SQLiteStore;
};

let serverStatePromise: null | Promise<ServerState> = null;

export const getServerState = async (): Promise<ServerState> => {
  if (!serverStatePromise) {
    serverStatePromise = (async () => {
      const store = new SQLiteStore();
      const events = createSessionEventEmitter();
      const sessionManager = new SessionManager({ events, storage: store });

      await sessionManager.initialize();

      return { events, sessionManager, store };
    })();
  }

  return serverStatePromise;
};