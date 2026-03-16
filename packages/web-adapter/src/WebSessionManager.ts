import type { Question, SessionAnswer } from "@paulp-o/auq-shared";
import { ResponseFormatter } from "@paulp-o/auq-shared";

import { AuqApiClient, type GetSessionResponse } from "./client.js";
import { validateWebAdapterConfig, type WebSessionManagerConfig } from "./config.js";
import { ApiUnavailableError } from "./errors.js";

export class WebSessionManager {
  private readonly client: AuqApiClient;
  private readonly pollInterval: number;
  private readonly sessionTimeout: number;
  private readonly maxPollErrors: number;
  private readonly sessionStates = new Map<string, GetSessionResponse>();

  constructor(config: WebSessionManagerConfig) {
    const validatedConfig = validateWebAdapterConfig(config);

    this.client = new AuqApiClient({
      baseUrl: validatedConfig.apiUrl,
      apiKey: validatedConfig.apiKey,
      maxRetries: validatedConfig.maxRetries,
      retryBaseDelayMs: validatedConfig.retryBaseDelayMs,
      fetchFn: validatedConfig.fetchFn,
    });
    this.pollInterval = validatedConfig.pollInterval;
    this.sessionTimeout = validatedConfig.sessionTimeout;
    this.maxPollErrors = validatedConfig.maxPollErrors;
  }

  async createSession(
    questions: Question[],
    _workingDirectory?: string,
  ): Promise<string> {
    const session = await this.client.createSession(questions);
    return session.id;
  }

  async waitForAnswers(
    sessionId: string,
    timeoutMs?: number,
    expectedCallId?: string,
    signal?: AbortSignal,
  ): Promise<string> {
    const startedAt = Date.now();
    const effectiveTimeout = timeoutMs ?? this.sessionTimeout;
    let consecutiveErrors = 0;

    while (true) {
      if (signal?.aborted) {
        throw new Error("ABORTED");
      }

      let session: GetSessionResponse;

      try {
        session = await this.client.getSession(sessionId);
        consecutiveErrors = 0;
      } catch (error) {
        consecutiveErrors += 1;

        if (consecutiveErrors >= this.maxPollErrors) {
          if (error instanceof ApiUnavailableError) {
            throw error;
          }

          if (error instanceof Error) {
            throw new ApiUnavailableError(error.message, { cause: error });
          }

          throw new ApiUnavailableError("API unavailable");
        }

        if (
          effectiveTimeout > 0 &&
          Date.now() - startedAt > effectiveTimeout
        ) {
          throw new Error("Timeout waiting for user response");
        }

        await this.sleep(this.pollInterval, signal);
        continue;
      }

      this.sessionStates.set(sessionId, session);
      if (expectedCallId && "callId" in session && session.callId !== expectedCallId) {
        await this.sleep(this.pollInterval, signal);
        continue;
      }

      if (session.status === "completed") {
        return sessionId;
      }

      if (session.status === "rejected") {
        throw new Error("SESSION_REJECTED");
      }

      if (session.status === "abandoned") {
        throw new Error("ABORTED");
      }

      if (session.status === "timed_out") {
        throw new Error("Timeout waiting for user response");
      }

      if (
        effectiveTimeout > 0 &&
        Date.now() - startedAt > effectiveTimeout
      ) {
        throw new Error("Timeout waiting for user response");
      }

      await this.sleep(this.pollInterval, signal);
    }
  }

  async startSession(
    questions: Question[],
    callId?: string,
    workingDirectory?: string,
    signal?: AbortSignal,
  ): Promise<{ formattedResponse: string; sessionId: string }> {
    const sessionId = await this.createSession(questions, workingDirectory);
    const timeoutMs = this.sessionTimeout > 0 ? this.sessionTimeout : undefined;
    const abortHandler = () => undefined;

    try {
      if (signal) {
        if (signal.aborted) {
          throw new Error("ABORTED");
        }

        signal.addEventListener("abort", abortHandler, { once: true });
      }

      await this.waitForAnswers(sessionId, timeoutMs, callId, signal);

      const finalSession =
        this.sessionStates.get(sessionId) ??
        (await this.client.getSession(sessionId));

      if (finalSession.status === "rejected") {
        const reason = finalSession.rejectionReason ?? "No reason provided.";
        return {
          formattedResponse: `Session rejected: ${reason}`,
          sessionId,
        };
      }

      const answers = finalSession.answers ?? [];
      const sessionAnswer: SessionAnswer = {
        answers,
        sessionId,
        timestamp: new Date().toISOString(),
        callId,
        workingDirectory,
      };
      ResponseFormatter.validateAnswers(sessionAnswer, questions);
      const formattedResponse = ResponseFormatter.formatUserResponse(
        sessionAnswer,
        questions,
      );

      return {
        formattedResponse,
        sessionId,
      };
    } catch (error) {
      if (error instanceof Error && error.message === "SESSION_REJECTED") {
        const finalSession = this.sessionStates.get(sessionId);
        const reason = finalSession?.rejectionReason ?? "No reason provided.";
        return {
          formattedResponse: `Session rejected: ${reason}`,
          sessionId,
        };
      }

      throw error;
    } finally {
      if (signal) {
        signal.removeEventListener("abort", abortHandler);
      }
      this.sessionStates.delete(sessionId);
    }
  }

  private async sleep(ms: number, signal?: AbortSignal): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        signal?.removeEventListener("abort", onAbort);
        resolve();
      }, ms);

      const onAbort = () => {
        clearTimeout(timeoutId);
        signal?.removeEventListener("abort", onAbort);
        reject(new Error("ABORTED"));
      };

      if (signal) {
        signal.addEventListener("abort", onAbort, { once: true });
      }
    });
  }
}