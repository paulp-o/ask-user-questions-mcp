import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createSessionManagerForMode, checkWebApiHealth } from "../server/web-mode.js";
import { getConfig, loadConfig } from "../config/ConfigLoader.js";

const webMocks = vi.hoisted(() => ({
  createSession: vi.fn(async () => "web-session-id"),
  startSession: vi.fn(async () => ({
    formattedResponse: "web response",
    sessionId: "web-session-id",
  })),
  waitForAnswers: vi.fn(async () => "web-session-id"),
  configs: [] as Array<{ apiKey: string; apiUrl: string }>,
}));

const localMocks = vi.hoisted(() => ({
  createSession: vi.fn(async () => "local-session-id"),
  startSession: vi.fn(async () => ({
    formattedResponse: "local response",
    sessionId: "local-session-id",
  })),
  waitForAnswers: vi.fn(async () => "local-session-id"),
  initialize: vi.fn(async () => undefined),
  getSessionStatus: vi.fn(async () => null),
  getSessionRequest: vi.fn(async () => null),
  getSessionAnswers: vi.fn(async () => null),
  getAllSessionIds: vi.fn(async () => []),
  cleanupExpiredSessions: vi.fn(async () => 0),
  updateSessionStatus: vi.fn(async () => undefined),
  markSessionAsRead: vi.fn(async () => undefined),
}));

const webModuleMocks = vi.hoisted(() => {
  class MockApiUnavailableError extends Error {
    statusCode?: number;

    constructor(message: string, options?: { cause?: Error; statusCode?: number }) {
      super(message, options);
      this.name = "ApiUnavailableError";
      this.statusCode = options?.statusCode;
    }
  }

  return {
    ApiUnavailableError: MockApiUnavailableError,
    WebSessionManager: vi.fn().mockImplementation(
      (config: { apiKey: string; apiUrl: string }) => {
        webMocks.configs.push(config);
        return {
          createSession: webMocks.createSession,
          startSession: webMocks.startSession,
          waitForAnswers: webMocks.waitForAnswers,
        };
      },
    ),
  };
});

const sessionManagerCtor = vi.hoisted(() =>
  vi.fn().mockImplementation(() => ({
    createSession: localMocks.createSession,
    startSession: localMocks.startSession,
    waitForAnswers: localMocks.waitForAnswers,
    initialize: localMocks.initialize,
    getSessionStatus: localMocks.getSessionStatus,
    getSessionRequest: localMocks.getSessionRequest,
    getSessionAnswers: localMocks.getSessionAnswers,
    getAllSessionIds: localMocks.getAllSessionIds,
    cleanupExpiredSessions: localMocks.cleanupExpiredSessions,
    updateSessionStatus: localMocks.updateSessionStatus,
    markSessionAsRead: localMocks.markSessionAsRead,
  })),
);

vi.mock("../config/ConfigLoader.js", () => ({
  getConfig: vi.fn(),
  loadConfig: vi.fn(),
}));

vi.mock("@paulp-o/auq-web-adapter", () => ({
  ApiUnavailableError: webModuleMocks.ApiUnavailableError,
  WebSessionManager: webModuleMocks.WebSessionManager,
}));

vi.mock("../session/SessionManager.js", () => ({
  SessionManager: sessionManagerCtor,
}));

const noWebConfig = {
  web: {
    mode: "local",
  },
};

const webConfig = {
  web: {
    mode: "local",
    api_key: "test-api-key",
    api_url: "https://self-hosted.example.com",
  },
};

const webConfigWithoutUrl = {
  web: {
    mode: "local",
    api_key: "test-api-key",
  },
};

const sampleQuestions = [
  {
    title: "Question",
    prompt: "Choose one",
    options: [{ label: "A", description: "Option A" }],
    multiSelect: false,
  },
];

describe("createSessionManagerForMode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    webMocks.configs.length = 0;
    vi.mocked(loadConfig).mockReturnValue(noWebConfig as any);
    vi.mocked(getConfig).mockReturnValue(noWebConfig as any);
    webMocks.startSession.mockResolvedValue({
      formattedResponse: "web response",
      sessionId: "web-session-id",
    });
    localMocks.startSession.mockResolvedValue({
      formattedResponse: "local response",
      sessionId: "local-session-id",
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("initializes in local mode when no api_key is configured", async () => {
    const manager = createSessionManagerForMode(loadConfig() as any);

    expect(manager).toBeTruthy();
    expect(webModuleMocks.WebSessionManager).not.toHaveBeenCalled();
    expect(sessionManagerCtor).toHaveBeenCalledTimes(1);
  });

  it("initializes in web mode when api_key is present", async () => {
    vi.mocked(loadConfig).mockReturnValue(webConfig as any);
    vi.mocked(getConfig).mockReturnValue(webConfig as any);

    createSessionManagerForMode(loadConfig() as any);

    expect(webModuleMocks.WebSessionManager).toHaveBeenCalledTimes(1);
    expect(sessionManagerCtor).not.toHaveBeenCalled();
  });

  it("passes apiUrl and apiKey to WebSessionManager", async () => {
    vi.mocked(loadConfig).mockReturnValue(webConfig as any);

    createSessionManagerForMode(loadConfig() as any);

    expect(webModuleMocks.WebSessionManager).toHaveBeenCalledTimes(1);
    expect(webMocks.configs[0]).toEqual({
      apiKey: "test-api-key",
      apiUrl: "https://self-hosted.example.com",
    });
  });

  it("initializes in local mode when api_key exists without api_url", async () => {
    vi.mocked(loadConfig).mockReturnValue(webConfigWithoutUrl as any);

    createSessionManagerForMode(loadConfig() as any);

    expect(webModuleMocks.WebSessionManager).not.toHaveBeenCalled();
    expect(sessionManagerCtor).toHaveBeenCalledTimes(1);
  });

  it("falls back to local mode when web session throws ApiUnavailableError", async () => {
    vi.mocked(loadConfig).mockReturnValue(webConfig as any);
    webMocks.startSession.mockRejectedValueOnce(
      new webModuleMocks.ApiUnavailableError("service unavailable", {
        statusCode: 503,
      }),
    );
    localMocks.startSession.mockResolvedValueOnce({
      formattedResponse: "local fallback response",
      sessionId: "local-fallback-session-id",
    });

    const manager = createSessionManagerForMode(loadConfig() as any);
    const result = await manager.startSession(sampleQuestions as any);

    expect(webModuleMocks.WebSessionManager).toHaveBeenCalledTimes(1);
    expect(sessionManagerCtor).toHaveBeenCalledTimes(1);
    expect(localMocks.startSession).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      formattedResponse: "local fallback response",
      sessionId: "local-fallback-session-id",
    });
  });
});

describe("checkWebApiHealth", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns healthy=true when API is reachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("ok", { status: 200 })),
    );

    const result = await checkWebApiHealth(
      "https://self-hosted.example.com",
      "test-api-key",
    );

    expect(result.healthy).toBe(true);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("returns healthy=false when API is unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }),
    );

    const result = await checkWebApiHealth(
      "https://self-hosted.example.com",
      "test-api-key",
    );

    expect(result.healthy).toBe(false);
    expect(result.error).toContain("network down");
  });
});