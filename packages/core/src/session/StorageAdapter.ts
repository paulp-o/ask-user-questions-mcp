import type {
  SessionAnswer,
  SessionConfig,
  SessionRequest,
  SessionStatus,
} from "../shared/types.js";

export interface StoredSession {
  answers?: SessionAnswer;
  request: SessionRequest;
  status: SessionStatus;
}

export interface SessionListFilter {
  status?: SessionStatus["status"];
}

export interface SessionUpdate {
  answers?: SessionAnswer;
  request?: SessionRequest;
  status?: SessionStatus;
}

export interface StorageAdapter {
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  create(request: SessionRequest): Promise<string>;
  read(sessionId: string): Promise<StoredSession>;
  update(sessionId: string, updates: SessionUpdate): Promise<void>;
  list(filter?: SessionListFilter): Promise<StoredSession[]>;
  delete(sessionId: string): Promise<void>;
  getConfig?(): SessionConfig;
}