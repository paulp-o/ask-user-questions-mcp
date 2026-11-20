export interface Option {
  description?: string;
  label: string;
}

export interface Question {
  options: Option[];
  prompt: string;
  title: string;
  multiSelect?: boolean;
}

export interface SessionAnswer {
  answers: UserAnswer[];
  sessionId: string;
  timestamp: string;
  callId?: string;
  workingDirectory?: string;
  lastReadAt?: string;
}

export interface SessionConfig {
  baseDir: string;
  maxSessions?: number;
  retentionPeriod?: number;
  sessionTimeout?: number;
}

export interface SessionRequest {
  questions: Question[];
  sessionId: string;
  status:
    | "completed"
    | "elaborate_requested"
    | "in-progress"
    | "pending"
    | "rejected"
    | "rephrase_requested"
    | "timed_out";
  timestamp: string;
  callId?: string;
  workingDirectory?: string;
}

export interface SessionStatus {
  createdAt: string;
  currentQuestionIndex?: number;
  lastModified: string;
  sessionId: string;
  status:
    | "abandoned"
    | "completed"
    | "elaborate_requested"
    | "in-progress"
    | "pending"
    | "rejected"
    | "rephrase_requested"
    | "timed_out";
  totalQuestions: number;
  callId?: string;
  rejectionReason?: string | null;
  workingDirectory?: string;
}

export interface UserAnswer {
  customText?: string;
  questionIndex: number;
  selectedOption?: string;
  selectedOptions?: string[];
  timestamp: string;
}

export const SESSION_FILES = {
  ANSWERS: "answers.json",
  REQUEST: "request.json",
  STATUS: "status.json",
} as const;

export type SessionStatusValue = SessionStatus["status"];

export const DEFAULT_SESSION_CONFIG: Partial<SessionConfig> = {
  baseDir: "~/.local/share/auq/sessions",
  maxSessions: 100,
  retentionPeriod: 604800000,
  sessionTimeout: 0,
};