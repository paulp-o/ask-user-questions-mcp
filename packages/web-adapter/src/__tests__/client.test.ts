import { describe, expect, it, vi } from "vitest";

import type { Question, UserAnswer } from "@paulp-o/auq-shared";

import { AuqApiClient } from "../client.js";
import { ApiUnavailableError, NetworkError } from "../errors.js";

describe("AuqApiClient", () => {
  const questions: Question[] = [
    {
      options: [{ label: "TypeScript" }, { label: "JavaScript" }],
      prompt: "Pick one language",
      title: "Language",
    },
  ];

  const successSessionResponse = () =>
    new Response(JSON.stringify({ answers: [], status: "pending" }), {
      status: 200,
    });

  it("constructor config controls base URL and API key in requests", async () => {
    const fetchFn = vi.fn().mockResolvedValue(successSessionResponse());
    const client = new AuqApiClient({
      apiKey: "constructor-key",
      baseUrl: "https://constructor.example.com",
      fetchFn: fetchFn as typeof fetch,
    });

    await client.getSession("session-123");

    expect(fetchFn).toHaveBeenCalledWith(
      "https://constructor.example.com/api/v1/questions/session-123",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer constructor-key",
        }),
      }),
    );
  });

  it("createSession sends POST with body and Bearer auth header", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "req-123", status: "pending" }), {
        status: 200,
      }),
    );
    const client = new AuqApiClient({
      apiKey: "test-key",
      baseUrl: "https://example.com",
      fetchFn: fetchFn as typeof fetch,
    });

    const result = await client.createSession(questions, "Test Session");

    expect(result).toEqual({ id: "req-123", status: "pending" });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledWith(
      "https://example.com/api/v1/questions",
      expect.objectContaining({
        body: JSON.stringify({ questions, title: "Test Session" }),
        headers: expect.objectContaining({
          Authorization: "Bearer test-key",
          "Content-Type": "application/json",
        }),
        method: "POST",
      }),
    );
  });

  it("getSession sends GET with Bearer auth header", async () => {
    const answers: UserAnswer[] = [
      {
        questionIndex: 0,
        selectedOption: "TypeScript",
        timestamp: "2026-03-15T00:00:00.000Z",
      },
    ];
    const fetchFn = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ answers, status: "completed" }), {
        status: 200,
      }),
    );
    const client = new AuqApiClient({
      apiKey: "test-key",
      baseUrl: "https://example.com",
      fetchFn: fetchFn as typeof fetch,
    });

    const result = await client.getSession("req-123");

    expect(result).toEqual({ answers, status: "completed" });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledWith(
      "https://example.com/api/v1/questions/req-123",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-key",
        }),
        method: "GET",
      }),
    );
  });

  it("retries on network error and succeeds on second attempt", async () => {
    const fetchFn = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(successSessionResponse());
    const client = new AuqApiClient({
      apiKey: "test-key",
      baseUrl: "https://example.com",
      fetchFn: fetchFn as typeof fetch,
    });
    vi.spyOn(client as any, "retryDelay").mockReturnValue(0);

    const result = await client.getSession("req-123");

    expect(result).toEqual({ answers: [], status: "pending" });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it.each([500, 503, 429])( "retries on %s and succeeds on second attempt", async (statusCode) => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "temporary failure" }), {
          status: statusCode,
          statusText: "Error",
        }),
      )
      .mockResolvedValueOnce(successSessionResponse());
    const client = new AuqApiClient({
      apiKey: "test-key",
      baseUrl: "https://example.com",
      fetchFn: fetchFn as typeof fetch,
    });
    vi.spyOn(client as any, "retryDelay").mockReturnValue(0);

    const result = await client.getSession("req-123");

    expect(result).toEqual({ answers: [], status: "pending" });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it.each([400, 401, 404])( "does not retry on %s and throws immediately", async (statusCode) => {
    const fetchFn = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: "client error" }), {
        status: statusCode,
        statusText: "Bad Request",
      }),
    );
    const client = new AuqApiClient({
      apiKey: "test-key",
      baseUrl: "https://example.com",
      fetchFn: fetchFn as typeof fetch,
    });
    vi.spyOn(client as any, "retryDelay").mockReturnValue(0);

    await expect(client.getSession("req-123")).rejects.toThrow("client error");
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("throws ApiUnavailableError after exhausting retries on 5xx", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: "service down" }), {
        status: 503,
        statusText: "Service Unavailable",
      }),
    );
    const client = new AuqApiClient({
      apiKey: "test-key",
      baseUrl: "https://example.com",
      fetchFn: fetchFn as typeof fetch,
      maxRetries: 2,
    });
    vi.spyOn(client as any, "retryDelay").mockReturnValue(0);

    await expect(client.getSession("req-123")).rejects.toBeInstanceOf(
      ApiUnavailableError,
    );
    await expect(client.getSession("req-123")).rejects.toMatchObject({
      statusCode: 503,
    });
    expect(fetchFn).toHaveBeenCalledTimes(6);
  });

  it("throws NetworkError after exhausting retries on network failures", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new TypeError("network down"));
    const client = new AuqApiClient({
      apiKey: "test-key",
      baseUrl: "https://example.com",
      fetchFn: fetchFn as typeof fetch,
      maxRetries: 2,
    });
    vi.spyOn(client as any, "retryDelay").mockReturnValue(0);

    await expect(client.getSession("req-123")).rejects.toBeInstanceOf(NetworkError);
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it("respects maxRetries config", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "temporary failure" }), {
          status: 500,
          statusText: "Server Error",
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "still down" }), {
          status: 500,
          statusText: "Server Error",
        }),
      )
      .mockResolvedValueOnce(successSessionResponse());
    const client = new AuqApiClient({
      apiKey: "test-key",
      baseUrl: "https://example.com",
      fetchFn: fetchFn as typeof fetch,
      maxRetries: 1,
    });
    vi.spyOn(client as any, "retryDelay").mockReturnValue(0);

    await expect(client.getSession("req-123")).rejects.toBeInstanceOf(
      ApiUnavailableError,
    );
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });
});