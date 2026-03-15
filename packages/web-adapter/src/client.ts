import type { Question, SessionStatusValue, UserAnswer } from "@paulp-o/auq-shared";

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

export interface AuqApiClientConfig {
  baseUrl: string;
  apiKey: string;
  fetchFn?: typeof fetch;
}

export class AuqApiClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly fetchFn: typeof fetch;

  constructor(config: AuqApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.apiKey = config.apiKey;
    this.fetchFn = config.fetchFn ?? fetch;
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

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const response = await this.fetchFn(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });

    if (!response.ok) {
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

      throw new Error(errorMessage);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }
}