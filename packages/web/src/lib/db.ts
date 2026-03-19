import { existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

import BetterSqlite3 from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";

import * as schema from "./schema";

export type WebDatabase = BetterSQLite3Database<typeof schema>;
export type SqliteClient = InstanceType<typeof BetterSqlite3>;

const DEFAULT_DB_PATH = "~/.local/share/auq/sessions.db";

const resolvePath = (rawPath: string): string => {
  if (rawPath === ":memory:") {
    return rawPath;
  }

  if (rawPath.startsWith("~/")) {
    return join(homedir(), rawPath.slice(2));
  }

  return rawPath;
};

const ensureParentDirectory = (dbPath: string): void => {
  if (dbPath === ":memory:") {
    return;
  }

  const parent = dirname(dbPath);
  if (!existsSync(parent)) {
    mkdirSync(parent, { recursive: true });
  }
};

export const resolveDatabasePath = (databaseUrl?: string): string => {
  return resolvePath(databaseUrl ?? process.env.DATABASE_URL ?? DEFAULT_DB_PATH);
};

export const createDatabaseConnection = (databaseUrl?: string): {
  db: WebDatabase;
  path: string;
  sqlite: SqliteClient;
} => {
  const path = resolveDatabasePath(databaseUrl);
  ensureParentDirectory(path);

  const sqlite = new BetterSqlite3(path);
  const db = drizzle(sqlite, { schema });

  return { db, path, sqlite };
};

let sharedDb: WebDatabase | null = null;
let sharedSqlite: SqliteClient | null = null;

export const getDb = (databaseUrl?: string): WebDatabase => {
  if (sharedDb && !databaseUrl) {
    return sharedDb;
  }

  const { db, sqlite } = createDatabaseConnection(databaseUrl);
  if (!databaseUrl) {
    sharedDb = db;
    sharedSqlite = sqlite;
  }

  return db;
};

export const getSqliteClient = (): null | SqliteClient => {
  if (!sharedSqlite) {
    getDb();
  }

  return sharedSqlite;
};

export const closeDb = (): void => {
  sharedSqlite?.close();
  sharedSqlite = null;
  sharedDb = null;
};

export const db = getDb();