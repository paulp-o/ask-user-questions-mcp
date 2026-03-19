/**
 * WebTransport
 *
 * Sends questions to the AUQ web platform API and polls for answers.
 * Used when AUQ_API_KEY and AUQ_API_URL env vars / config keys are set.
 */

import { ResponseFormatter } from "../session/ResponseFormatter.js";
import type { Question, UserAnswer } from "../session/types.js";

// ---------------------------------------------------------------------------
// Web API shapes
// ---------------------------------------------------------------------------

interface WebQuestionItem {
  id: string;
  title?: string;
  prompt: string;
  type: "singleSelect" | "multiSelect" | "freeText";
  options?: { id: string; label: string; description?: string }[];
}

interface WebAnswer {
  id: string;
  questionId: string;
  questionIndex: number;
  selectedOption?: string;
  selectedOptionsJson?: string;
  customText?: string;
  rejected: boolean;
  rejectionReason?: string;
  answeredAt: string;
}

interface WebCreateResponse {
  id: string;
  status: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

interface WebQuestionResponse {
  id: string;
  status: string;
  title: string | null;
  questions: WebQuestionItem[];
  answers: WebAnswer[];
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Format mapping helpers
// ---------------------------------------------------------------------------

/**
 * Convert MCP Question[] to the web API questionsJson format.
 */
export function mapQuestionsToWeb(questions: Question[]): WebQuestionItem[] {
  return questions.map((q, i) => {
    const hasOptions = q.options && q.options.length > 0;

    let type: WebQuestionItem["type"];
    if (!hasOptions) {
      type = "freeText";
    } else if (q.multiSelect === true) {
      type = "multiSelect";
    } else {
      type = "singleSelect";
    }

    const item: WebQuestionItem = {
      id: `q${i}`,
      title: q.title,
      prompt: q.prompt,
      type,
    };

    if (hasOptions) {
      item.options = q.options.map((opt, j) => ({
        id: String(j),
        label: opt.label,
        ...(opt.description ? { description: opt.description } : {}),
      }));
    }

    return item;
  });
}

/**
 * Convert web API answer objects back to MCP UserAnswer[].
 * Throws SESSION_REJECTED if any answer has rejected=true.
 */
export function mapWebAnswersToMcp(
  webAnswers: WebAnswer[],
  questions: Question[],
): UserAnswer[] {
  const userAnswers: UserAnswer[] = [];

  for (const wa of webAnswers) {
    if (wa.rejected) {
      throw new Error("SESSION_REJECTED");
    }

    const answer: UserAnswer = {
      questionIndex: wa.questionIndex,
      timestamp: wa.answeredAt,
    };

    // Multi-select: parse selectedOptionsJson → labels
    if (wa.selectedOptionsJson) {
      try {
        const ids: string[] = JSON.parse(wa.selectedOptionsJson);
        const question = questions[wa.questionIndex];
        if (question && question.options) {
          answer.selectedOptions = ids.map((optId) => {
            const opt = question.options[Number(optId)];
            return opt ? opt.label : optId;
          });
        } else {
          answer.selectedOptions = ids;
        }
      } catch {
        answer.selectedOptions = [];
      }
    }

    // Single-select: map option ID back to label
    if (wa.selectedOption && !wa.selectedOptionsJson) {
      const question = questions[wa.questionIndex];
      if (question && question.options) {
        const opt = question.options[Number(wa.selectedOption)];
        answer.selectedOption = opt ? opt.label : wa.selectedOption;
      } else {
        answer.selectedOption = wa.selectedOption;
      }
    }

    // Free text
    if (wa.customText) {
      answer.customText = wa.customText;
    }

    userAnswers.push(answer);
  }

  return userAnswers;
}

// ---------------------------------------------------------------------------
// WebTransport
// ---------------------------------------------------------------------------

export interface WebTransportOptions {
  apiKey: string;
  apiUrl: string;
  /** Polling interval in ms. Default: 2000 */
  pollIntervalMs?: number;
  /** Fetch timeout in ms. Default: 10000 */
  fetchTimeoutMs?: number;
}

export class WebTransport {
  private readonly apiKey: string;
  private readonly apiUrl: string;
  private readonly pollIntervalMs: number;
  private readonly fetchTimeoutMs: number;

  constructor(options: WebTransportOptions) {
    this.apiKey = options.apiKey;
    this.apiUrl = options.apiUrl.replace(/\/$/, ""); // strip trailing slash
    this.pollIntervalMs = options.pollIntervalMs ?? 2000;
    this.fetchTimeoutMs = options.fetchTimeoutMs ?? 10000;
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };
  }

  private async fetchWithTimeout(
    url: string,
    init: RequestInit = {},
    signal?: AbortSignal,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.fetchTimeoutMs);

    // If caller provides a signal, abort our controller when it aborts
    const onExternalAbort = () => controller.abort();
    if (signal) {
      signal.addEventListener("abort", onExternalAbort);
    }

    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      return res;
    } finally {
      clearTimeout(timeout);
      if (signal) {
        signal.removeEventListener("abort", onExternalAbort);
      }
    }
  }

  private async postQuestion(
    questions: Question[],
    signal?: AbortSignal,
  ): Promise<string> {
    const webQuestions = mapQuestionsToWeb(questions);
    const title = questions[0]?.title ?? undefined;

    const url = `${this.apiUrl}/api/v1/questions`;
    let res: Response;
    try {
      res = await this.fetchWithTimeout(
        url,
        {
          method: "POST",
          headers: this.authHeaders(),
          body: JSON.stringify({ questionsJson: webQuestions, title }),
        },
        signal,
      );
    } catch (err) {
      throw new Error(
        `Web API network error (POST /api/v1/questions): ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    if (!res.ok) {
      throw new Error(
        `Web API error: ${res.status} ${res.statusText} — check your AUQ_API_KEY and AUQ_API_URL`,
      );
    }

    const data = (await res.json()) as WebCreateResponse;
    return data.id;
  }

  private async getQuestion(
    sessionId: string,
    signal?: AbortSignal,
  ): Promise<WebQuestionResponse> {
    const url = `${this.apiUrl}/api/v1/questions/${sessionId}`;
    let res: Response;
    try {
      res = await this.fetchWithTimeout(
        url,
        { method: "GET", headers: this.authHeaders() },
        signal,
      );
    } catch (err) {
      throw new Error(
        `Web API network error (GET /api/v1/questions/${sessionId}): ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    if (res.status === 404) {
      throw new Error(`Web API error: question ${sessionId} not found`);
    }
    if (!res.ok) {
      throw new Error(
        `Web API error: ${res.status} ${res.statusText} on GET /api/v1/questions/${sessionId}`,
      );
    }

    return (await res.json()) as WebQuestionResponse;
  }

  private sleep(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, ms);
      if (signal) {
        const onAbort = () => {
          clearTimeout(timer);
          reject(new Error("Aborted"));
        };
        signal.addEventListener("abort", onAbort, { once: true });
      }
    });
  }

  private buildFormattedResponse(
    webResp: WebQuestionResponse,
    questions: Question[],
  ): string {
    const userAnswers = mapWebAnswersToMcp(webResp.answers, questions);
    return ResponseFormatter.formatUserResponse(
      {
        answers: userAnswers,
        sessionId: webResp.id,
        timestamp: webResp.updatedAt,
      },
      questions,
      webResp.id,
    );
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Submit questions and block until the user answers.
   * Equivalent to SessionManager.startSession().
   */
  async startSession(
    questions: Question[],
    _callId?: string,
    _workingDirectory?: string,
    signal?: AbortSignal,
  ): Promise<{ formattedResponse: string; sessionId: string }> {
    const sessionId = await this.postQuestion(questions, signal);

    // Poll until answered, rejected, or aborted
    while (true) {
      if (signal?.aborted) {
        await this.markAbandoned(sessionId).catch(() => undefined);
        throw new Error("Aborted");
      }

      const webResp = await this.getQuestion(sessionId, signal);

      if (webResp.status === "rejected") {
        // Find the rejection reason from the first rejected answer
        const rejectedAnswer = webResp.answers.find((a) => a.rejected);
        const reason = rejectedAnswer?.rejectionReason;
        const formattedResponse = ResponseFormatter.formatRejectedStatus(
          sessionId,
          reason,
        );
        throw Object.assign(new Error("SESSION_REJECTED"), {
          formattedResponse,
          sessionId,
        });
      }

      if (webResp.status === "completed") {
        const formattedResponse = this.buildFormattedResponse(webResp, questions);
        return { formattedResponse, sessionId };
      }

      // Still pending — wait then poll again
      try {
        await this.sleep(this.pollIntervalMs, signal);
      } catch {
        await this.markAbandoned(sessionId).catch(() => undefined);
        throw new Error("Aborted");
      }
    }
  }

  /**
   * Submit questions without waiting for answers.
   * Returns the web question ID (used as sessionId for later retrieval).
   * Equivalent to SessionManager.createSession().
   */
  async createSession(
    questions: Question[],
    _workingDirectory?: string,
  ): Promise<string> {
    return this.postQuestion(questions);
  }

  /**
   * Retrieve answers for a previously submitted question set.
   * If blocking=true, polls until answered.
   * Equivalent to SessionManager.waitForAnswers() / getAnsweredQuestions().
   */
  async getAnsweredQuestions(
    sessionId: string,
    blocking?: boolean,
    signal?: AbortSignal,
  ): Promise<
    | { formattedResponse: string; sessionId: string; status: "completed" }
    | { formattedResponse: string; sessionId: string; status: "pending" }
  > {
    if (!blocking) {
      // Non-blocking: return current state
      const webResp = await this.getQuestion(sessionId, signal);

      if (webResp.status === "completed") {
        const formattedResponse = this.buildFormattedResponse(
          webResp,
          webResp.questions as unknown as Question[],
        );
        return { formattedResponse, sessionId, status: "completed" };
      }

      if (webResp.status === "rejected") {
        throw new Error("SESSION_REJECTED");
      }

      const formattedResponse = ResponseFormatter.formatPendingStatus(sessionId);
      return { formattedResponse, sessionId, status: "pending" };
    }

    // Blocking: poll until done
    while (true) {
      if (signal?.aborted) {
        throw new Error("Aborted");
      }

      const webResp = await this.getQuestion(sessionId, signal);

      if (webResp.status === "rejected") {
        throw new Error("SESSION_REJECTED");
      }

      if (webResp.status === "completed") {
        const formattedResponse = this.buildFormattedResponse(
          webResp,
          webResp.questions as unknown as Question[],
        );
        return { formattedResponse, sessionId, status: "completed" };
      }

      try {
        await this.sleep(this.pollIntervalMs, signal);
      } catch {
        throw new Error("Aborted");
      }
    }
  }

  /**
   * Mark a pending question as abandoned (e.g., on process exit or abort).
   */
  async markAbandoned(sessionId: string): Promise<void> {
    const url = `${this.apiUrl}/api/v1/questions/${sessionId}`;
    try {
      await this.fetchWithTimeout(url, {
        method: "DELETE",
        headers: this.authHeaders(),
      });
    } catch {
      // Best-effort — ignore network errors on cleanup
    }
  }
}