import BetterSqlite3 from "better-sqlite3";
import { describe, expect, it } from "vitest";

import { initializeDatabase } from "../src/lib/init";

const getTableColumns = (
  sqlite: InstanceType<typeof BetterSqlite3>,
  tableName: string,
  ): string[] => {
  const rows = sqlite.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  return rows.map((row) => row.name);
};

describe("initializeDatabase", () => {
  it("creates required tables", async () => {
    const sqlite = new BetterSqlite3(":memory:");

    await initializeDatabase(sqlite);

    const tables = sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all() as Array<{ name: string }>;
    const names = tables.map((table) => table.name);

    expect(names).toContain("sessions");
    expect(names).toContain("session_history");

    sqlite.close();
  });

  it("creates sessions and session_history columns", async () => {
    const sqlite = new BetterSqlite3(":memory:");

    await initializeDatabase(sqlite);

    expect(getTableColumns(sqlite, "sessions")).toEqual([
      "id",
      "request",
      "status",
      "answers",
      "rejectReason",
      "createdAt",
      "updatedAt",
      "expiresAt",
    ]);

    expect(getTableColumns(sqlite, "session_history")).toEqual([
      "id",
      "sessionId",
      "event",
      "timestamp",
      "metadata",
    ]);

    sqlite.close();
  });
});