import BetterSqlite3 from "better-sqlite3";

import { getSqliteClient } from "./db";

const CREATE_SESSIONS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  request TEXT NOT NULL,
  status TEXT NOT NULL,
  answers TEXT,
  rejectReason TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  expiresAt TEXT
);`;

const CREATE_SESSION_HISTORY_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS session_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sessionId TEXT NOT NULL,
  event TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  metadata TEXT,
  FOREIGN KEY(sessionId) REFERENCES sessions(id) ON DELETE CASCADE
);`;

export const initializeDatabase = async (
  sqlite?: InstanceType<typeof BetterSqlite3>,
): Promise<void> => {
  const client = sqlite ?? getSqliteClient();
  if (!client) {
    throw new Error("SQLite client is not initialized");
  }

  client.pragma("foreign_keys = ON");
  client.exec(CREATE_SESSIONS_TABLE_SQL);
  client.exec(CREATE_SESSION_HISTORY_TABLE_SQL);
};

export const importLegacyFileStoreSessions = async (): Promise<void> => {
  return;
};