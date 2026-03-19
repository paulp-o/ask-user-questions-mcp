import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  request: text("request").notNull(),
  status: text("status").notNull(),
  answers: text("answers"),
  rejectReason: text("rejectReason"),
  createdAt: text("createdAt").notNull(),
  updatedAt: text("updatedAt").notNull(),
  expiresAt: text("expiresAt"),
});

export const sessionHistory = sqliteTable("session_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: text("sessionId")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  event: text("event").notNull(),
  timestamp: text("timestamp").notNull(),
  metadata: text("metadata"),
});