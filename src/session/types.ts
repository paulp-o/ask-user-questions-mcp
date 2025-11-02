/**
 * Session-related TypeScript interfaces and types for AskUserQuery MCP server
 */

export interface Option {
  description?: string;
  label: string;
}

/**
 * Question interface - matches the FastMCP tool schema
 */
export interface Question {
  options: Option[];
  prompt: string;
}

export interface SessionAnswer {
  answers: UserAnswer[];
  sessionId: string;
  timestamp: string;
}

export interface SessionConfig {
  baseDir: string;
  maxSessions?: number;
  sessionTimeout?: number; // in milliseconds
}

export interface SessionRequest {
  questions: Question[];
  sessionId: string;
  status: "completed" | "in-progress" | "pending" | "timed_out";
  timestamp: string;
}

export interface SessionStatus {
  createdAt: string;
  currentQuestionIndex?: number;
  lastModified: string;
  sessionId: string;
  status: "abandoned" | "completed" | "in-progress" | "pending" | "timed_out";
  totalQuestions: number;
}

export interface UserAnswer {
  customText?: string;
  questionIndex: number;
  selectedOption?: string;
  timestamp: string;
}

/**
 * File names for session storage
 */
export const SESSION_FILES = {
  ANSWERS: "answers.json",
  REQUEST: "request.json",
  STATUS: "status.json",
} as const;

/**
 * Session status values for type safety
 */
export type SessionStatusValue = SessionStatus["status"];

/**
 * Default session configuration
 */
export const DEFAULT_SESSION_CONFIG: Partial<SessionConfig> = {
  baseDir: "~/.local/share/auq/sessions", // Will be resolved to actual path
  maxSessions: 100,
  sessionTimeout: 0, // 0 = infinite timeout (wait indefinitely for user)
};
