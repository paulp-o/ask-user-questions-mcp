import type { Question } from "@paulp-o/auq-shared";

export interface SessionManagerLike {
  createSession(questions: Question[], workingDirectory?: string): Promise<string>;
  startSession(
    questions: Question[],
    callId?: string,
    workingDirectory?: string,
    signal?: AbortSignal,
  ): Promise<{ formattedResponse: string; sessionId: string }>;
  waitForAnswers(
    sessionId: string,
    timeoutMs?: number,
    expectedCallId?: string,
    signal?: AbortSignal,
  ): Promise<string>;
  initialize?(): Promise<void>;
  getSessionStatus?(sessionId: string): Promise<any>;
  getSessionRequest?(sessionId: string): Promise<any>;
  getSessionAnswers?(sessionId: string): Promise<any>;
  getAllSessionIds?(): Promise<string[]>;
  cleanupExpiredSessions?(): Promise<number>;
  updateSessionStatus?(sessionId: string, status: string): Promise<void>;
  markSessionAsRead?(sessionId: string): Promise<any>;
}