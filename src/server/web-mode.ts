import { WebSessionManager, ApiUnavailableError } from "@paulp-o/auq-web-adapter";
import type { AUQConfig } from "../config/types.js";
import { getConfig } from "../config/ConfigLoader.js";
import { SessionManager } from "../session/SessionManager.js";
import type { Question } from "../session/types.js";
import { getSessionDirectory } from "../session/utils.js";

export interface SessionManagerLike {
  initialize?(): Promise<void>;
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
  getSessionStatus?(sessionId: string): Promise<any>;
  getSessionRequest?(sessionId: string): Promise<any>;
  getSessionAnswers?(sessionId: string): Promise<any>;
  getAllSessionIds?(): Promise<string[]>;
  cleanupExpiredSessions?(): Promise<number>;
  updateSessionStatus?(sessionId: string, status: string): Promise<void>;
  markSessionAsRead?(sessionId: string): Promise<any>;
}

function createLocalSessionManager(): SessionManager {
  return new SessionManager({ baseDir: getSessionDirectory() });
}

export function createFallbackSessionManager(config: AUQConfig): SessionManagerLike {
  if (!config.web.api_key || !config.web.api_url) {
    return createLocalSessionManager();
  }

  const webManager = new WebSessionManager({
    apiUrl: config.web.api_url,
    apiKey: config.web.api_key,
  });

  let activeManager: SessionManagerLike = webManager;
  let localManager: SessionManager | null = null;

  const getLocalManager = (): SessionManager => {
    if (!localManager) {
      localManager = createLocalSessionManager();
    }
    return localManager;
  };

  const ensureLocalManager = async (): Promise<SessionManager> => {
    const manager = getLocalManager();
    await manager.initialize?.();
    return manager;
  };

  return {
    initialize: async () => {
      await activeManager.initialize?.();
    },
    createSession: (questions, workingDirectory) =>
      activeManager.createSession(questions, workingDirectory),
    waitForAnswers: (sessionId, timeoutMs, expectedCallId, signal) =>
      activeManager.waitForAnswers(
        sessionId,
        timeoutMs,
        expectedCallId,
        signal,
      ),
    startSession: async (questions, callId, workingDirectory, signal) => {
      try {
        return await activeManager.startSession(
          questions,
          callId,
          workingDirectory,
          signal,
        );
      } catch (error) {
        if (error instanceof ApiUnavailableError) {
          const message = error instanceof Error ? error.message : "Unknown error";
          console.error(
            "[AUQ] Web API unavailable, falling back to local mode:",
            message,
          );
          const fallbackManager = await ensureLocalManager();
          activeManager = fallbackManager;
          return fallbackManager.startSession(
            questions,
            callId,
            workingDirectory,
            signal,
          );
        }

        throw error;
      }
    },
    getSessionStatus: async (sessionId) =>
      activeManager.getSessionStatus?.(sessionId),
    getSessionRequest: async (sessionId) =>
      activeManager.getSessionRequest?.(sessionId),
    getSessionAnswers: async (sessionId) =>
      activeManager.getSessionAnswers?.(sessionId),
    getAllSessionIds: async () => activeManager.getAllSessionIds?.() ?? [],
    cleanupExpiredSessions: async () =>
      activeManager.cleanupExpiredSessions?.() ?? 0,
    updateSessionStatus: async (sessionId, status) =>
      activeManager.updateSessionStatus?.(sessionId, status),
    markSessionAsRead: async (sessionId) =>
      activeManager.markSessionAsRead?.(sessionId),
  };
}

export function createSessionManagerForMode(config?: AUQConfig): SessionManagerLike {
  const resolvedConfig = config ?? getConfig();
  if (resolvedConfig.web.api_key) {
    return createFallbackSessionManager(resolvedConfig);
  }

  return createLocalSessionManager();
}

export async function checkWebApiHealth(
  apiUrl: string,
  apiKey: string,
): Promise<{ healthy: boolean; latencyMs: number; error?: string }> {
  const startedAt = Date.now();
  const healthUrl = `${apiUrl.replace(/\/$/, "")}/api/v1/health`;

  try {
    const response = await fetch(healthUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "x-api-key": apiKey,
      },
    });
    const latencyMs = Date.now() - startedAt;

    if (!response.ok) {
      return {
        healthy: false,
        latencyMs,
        error: `Health check failed with status ${response.status}`,
      };
    }

    return { healthy: true, latencyMs };
  } catch (error) {
    const latencyMs = Date.now() - startedAt;
    return {
      healthy: false,
      latencyMs,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}