import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Question, UserAnswer } from "@paulp-o/auq-shared";

const {
  mockCreateSession,
  mockFormatUserResponse,
  mockGetSession,
  mockValidateAnswers,
} = vi.hoisted(() => ({
  mockCreateSession: vi.fn(),
  mockFormatUserResponse: vi.fn(),
  mockGetSession: vi.fn(),
  mockValidateAnswers: vi.fn(),
}));

vi.mock("../client.js", () => ({
  AuqApiClient: vi.fn(() => ({
    createSession: mockCreateSession,
    getSession: mockGetSession,
  })),
}));

vi.mock("@paulp-o/auq-shared", async () => {
  const actual = await vi.importActual<typeof import("@paulp-o/auq-shared")>(
    "@paulp-o/auq-shared",
  );

  return {
    ...actual,
    ResponseFormatter: {
      formatUserResponse: mockFormatUserResponse,
      validateAnswers: mockValidateAnswers,
    },
  };
});

import { WebSessionManager } from "../WebSessionManager.js";
import { ApiUnavailableError } from "../errors.js";

describe("WebSessionManager", () => {
  const questions: Question[] = [
    {
      options: [{ label: "TypeScript" }, { label: "JavaScript" }],
      prompt: "Pick one language",
      title: "Language",
    },
  ];

  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();

    mockCreateSession.mockResolvedValue({ id: "session-1", status: "pending" });
    mockGetSession.mockResolvedValue({ status: "completed", answers: [] });
    mockValidateAnswers.mockImplementation((answers: UserAnswer[]) => answers);
    mockFormatUserResponse.mockReturnValue("formatted response");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("createSession calls client and returns session id", async () => {
    const manager = new WebSessionManager({ apiKey: "test-key", apiUrl: "https://api.example.com" });

    const sessionId = await manager.createSession(questions);

    expect(sessionId).toBe("session-1");
    expect(mockCreateSession).toHaveBeenCalledTimes(1);
    expect(mockCreateSession).toHaveBeenCalledWith(questions);
  });

  it("waitForAnswers polls until status is completed", async () => {
    vi.useFakeTimers();
    mockGetSession
      .mockResolvedValueOnce({ status: "pending" })
      .mockResolvedValueOnce({ status: "completed", answers: [] });

    const manager = new WebSessionManager({ apiKey: "test-key", apiUrl: "https://api.example.com" });
    const waitPromise = manager.waitForAnswers("session-1");

    await Promise.resolve();
    expect(mockGetSession).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(3000);
    await expect(waitPromise).resolves.toBe("session-1");
    expect(mockGetSession).toHaveBeenCalledTimes(2);
  });

  it("waitForAnswers throws SESSION_REJECTED on rejected status", async () => {
    mockGetSession.mockResolvedValue({ status: "rejected" });
    const manager = new WebSessionManager({ apiKey: "test-key", apiUrl: "https://api.example.com" });

    await expect(manager.waitForAnswers("session-1")).rejects.toThrow("SESSION_REJECTED");
  });

  it("waitForAnswers throws ABORTED when signal is aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const manager = new WebSessionManager({ apiKey: "test-key", apiUrl: "https://api.example.com" });

    await expect(
      manager.waitForAnswers("session-1", undefined, undefined, controller.signal),
    ).rejects.toThrow("ABORTED");
  });

  it("waitForAnswers throws timeout error when timeout is exceeded", async () => {
    vi.useFakeTimers();
    mockGetSession.mockResolvedValue({ status: "pending" });
    const manager = new WebSessionManager({ apiKey: "test-key", apiUrl: "https://api.example.com" });
    const waitPromise = manager.waitForAnswers("session-1", 100);
    const rejectionExpectation = expect(waitPromise).rejects.toThrow(
      "Timeout waiting for user response",
    );

    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(3000);
    await rejectionExpectation;
  });

  it("waitForAnswers respects default poll interval of 3000ms", async () => {
    vi.useFakeTimers();
    mockGetSession
      .mockResolvedValueOnce({ status: "pending" })
      .mockResolvedValueOnce({ status: "completed", answers: [] });

    const manager = new WebSessionManager({ apiKey: "test-key", apiUrl: "https://api.example.com" });
    const waitPromise = manager.waitForAnswers("session-1");

    await Promise.resolve();
    expect(mockGetSession).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(2999);
    expect(mockGetSession).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    await expect(waitPromise).resolves.toBe("session-1");
    expect(mockGetSession).toHaveBeenCalledTimes(2);
  });

  it("startSession orchestrates create, wait, and format response", async () => {
    const manager = new WebSessionManager({ apiKey: "test-key", apiUrl: "https://api.example.com" });
    const createSessionSpy = vi.spyOn(manager, "createSession").mockResolvedValue("session-1");
    const waitForAnswersSpy = vi.spyOn(manager, "waitForAnswers").mockResolvedValue("session-1");
    mockGetSession.mockResolvedValue({
      answers: [
        {
          questionIndex: 0,
          selectedOption: "TypeScript",
          timestamp: "2026-03-15T00:00:00.000Z",
        },
      ],
      status: "completed",
    });

    const result = await manager.startSession(questions, "call-123", "/tmp/project");

    expect(createSessionSpy).toHaveBeenCalledWith(questions, "/tmp/project");
    expect(waitForAnswersSpy).toHaveBeenCalledTimes(1);
    expect(waitForAnswersSpy.mock.calls[0]?.[0]).toBe("session-1");
    expect(waitForAnswersSpy.mock.calls[0]?.[2]).toBe("call-123");
    expect(mockValidateAnswers).toHaveBeenCalledTimes(1);
    expect(mockFormatUserResponse).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      formattedResponse: "formatted response",
      sessionId: "session-1",
    });
  });

  it("startSession registers and cleans up abort handler", async () => {
    const manager = new WebSessionManager({ apiKey: "test-key", apiUrl: "https://api.example.com" });
    const controller = new AbortController();
    const addEventListenerSpy = vi.spyOn(controller.signal, "addEventListener");
    const removeEventListenerSpy = vi.spyOn(controller.signal, "removeEventListener");
    vi.spyOn(manager, "createSession").mockResolvedValue("session-1");
    vi.spyOn(manager, "waitForAnswers").mockResolvedValue("session-1");
    mockGetSession.mockResolvedValue({ answers: [], status: "completed" });

    await manager.startSession(questions, "call-123", undefined, controller.signal);

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "abort",
      expect.any(Function),
      { once: true },
    );
    const registeredHandler = addEventListenerSpy.mock.calls[0]?.[1];
    expect(removeEventListenerSpy).toHaveBeenCalledWith("abort", registeredHandler);
  });

  it("waitForAnswers continues polling after transient getSession failure", async () => {
    vi.useFakeTimers();
    mockGetSession
      .mockRejectedValueOnce(new Error("temporary failure"))
      .mockResolvedValueOnce({ status: "completed", answers: [] });

    const manager = new WebSessionManager({ apiKey: "test-key", apiUrl: "https://api.example.com" });
    const waitPromise = manager.waitForAnswers("session-1");

    await Promise.resolve();
    expect(mockGetSession).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(3000);
    await expect(waitPromise).resolves.toBe("session-1");
    expect(mockGetSession).toHaveBeenCalledTimes(2);
  });

  it("waitForAnswers throws ApiUnavailableError after consecutive poll failures exceed threshold", async () => {
    vi.useFakeTimers();
    mockGetSession.mockRejectedValue(new Error("network failure"));

    const manager = new WebSessionManager({ apiKey: "test-key", apiUrl: "https://api.example.com" });
    const waitPromise = manager.waitForAnswers("session-1");
    const rejectionPromise = waitPromise.catch((error: unknown) => error);

    await Promise.resolve();
    expect(mockGetSession).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(3000);
    await vi.advanceTimersByTimeAsync(3000);
    const error = await rejectionPromise;
    expect(error).toBeInstanceOf(ApiUnavailableError);
    expect(mockGetSession).toHaveBeenCalledTimes(3);
  });

  it("createSession propagates ApiUnavailableError from client", async () => {
    const apiError = new ApiUnavailableError("API unavailable");
    mockCreateSession.mockRejectedValueOnce(apiError);

    const manager = new WebSessionManager({ apiKey: "test-key", apiUrl: "https://api.example.com" });

    await expect(manager.createSession(questions)).rejects.toBe(apiError);
  });

  it("startSession propagates ApiUnavailableError from createSession", async () => {
    const apiError = new ApiUnavailableError("API unavailable");
    const manager = new WebSessionManager({ apiKey: "test-key", apiUrl: "https://api.example.com" });
    vi.spyOn(manager, "createSession").mockRejectedValueOnce(apiError);

    await expect(manager.startSession(questions)).rejects.toBe(apiError);
  });
});