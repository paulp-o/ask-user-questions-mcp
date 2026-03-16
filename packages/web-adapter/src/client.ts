import type { Question, SessionStatusValue, UserAnswer } from "@paulp-o/auq-shared";

import type { AuqApiClientConfig } from "./config.js";
import { ApiUnavailableError, NetworkError } from "./errors.js";

export interface CreateSessionResponse {
  id: string;
  status: string;
}

export interface GetSessionResponse {
  status: SessionStatusValue | "in_progress";
  answers?: UserAnswer[];
  rejectionReason?: string | null;
  callId?: string;
}

export class AuqApiClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly fetchFn: typeof fetch;
  private readonly maxRetries: number;
  private readonly retryBaseDelayMs: number;

  constructor(config: AuqApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.apiKey = config.apiKey;
    this.fetchFn = config.fetchFn ?? fetch;
    this.maxRetries = config.maxRetries ?? 3;
    this.retryBaseDelayMs = config.retryBaseDelayMs ?? 1000;
  }

  async createSession(
    questions: Question[],
    title?: string,
  ): Promise<CreateSessionResponse> {
    const payload: { questions: Question[]; title?: string } = { questions };

    if (title) {
      payload.title = title;
    }

    return this.request<CreateSessionResponse>("POST", "/api/v1/questions", payload);
  }

  async getSession(sessionId: string): Promise<GetSessionResponse> {
    return this.request<GetSessionResponse>(
      "GET",
      `/api/v1/questions/${encodeURIComponent(sessionId)}`,
    );
  }

  private isRetryable(status: number): boolean {
    return [429, 500, 502, 503, 504].includes(status);
  }

  private retryDelay(attempt: number): number {
    return Math.min(this.retryBaseDelayMs * 2 ** attempt, 10000) + Math.random() * 500;
  }

  private async sleep(ms: number): Promise<void> {
    if (ms <= 0) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async getErrorMessage(response: Response): Promise<string> {
    let errorMessage = `Request failed (${response.status} ${response.statusText})`;

    try {
      const errorBody = await response.json();

      if (
        errorBody &&
        typeof errorBody === "object" &&
        "message" in errorBody &&
        typeof errorBody.message === "string"
      ) {
        errorMessage = errorBody.message;
      }
    } catch {
      // Ignore JSON parse errors and keep default message.
    }

    return errorMessage;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      try {
        const response = await this.fetchFn(`${this.baseUrl}${path}`, {
          method,
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
          },
          ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        });

        if (!response.ok) {
          const errorMessage = await this.getErrorMessage(response);

          if (!this.isRetryable(response.status)) {
            throw new Error(errorMessage);
          }

          if (attempt < this.maxRetries) {
            await this.sleep(this.retryDelay(attempt));
            continue;
          }

          throw new ApiUnavailableError(errorMessage, {
            statusCode: response.status,
          });
        }

        if (response.status === 204) {
          return undefined as T;
        }

        return (await response.json()) as T;
      } catch (error) {
        if (error instanceof TypeError) {
          if (attempt < this.maxRetries) {
            await this.sleep(this.retryDelay(attempt));
            continue;
          }

          throw new NetworkError("Network request failed", {
            cause: error,
          });
        }

        throw error;
      }
    }

    throw new ApiUnavailableError("API unavailable after retries");
  }
}