import { describe, expect, it, vi } from "vitest";

import type { Question, UserAnswer } from "@paulp-o/auq-shared";

import { AuqApiClient } from "../client.js";

describe("AuqApiClient", () => {
  const questions: Question[] = [
    {
      options: [{ label: "TypeScript" }, { label: "JavaScript" }],
      prompt: "Pick one language",
      title: "Language",
    },
  ];

  it("constructor config controls base URL and API key in requests", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ answers: [], status: "pending" }), {
        status: 200,
      }),
    );
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
});