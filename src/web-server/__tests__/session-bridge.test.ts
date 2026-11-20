import { describe, it, expect, vi, beforeEach } from "vitest";
import type { WSContext } from "hono/ws";
import type { WebSocket } from "ws";
import type { SessionAnswer, SessionRequest } from "@auq/shared";

import { WS_TYPES } from "../ws-protocol.js";
import { SessionBridge } from "../session-bridge.js";
import type { EnhancedTUISessionWatcher } from "../../tui/session-watcher.js";
import type { SessionManager } from "../../session/SessionManager.js";

function createMockWs(): WSContext<WebSocket> & { sentMessages: string[] } {
  const sentMessages: string[] = [];
  return {
    readyState: 1,
    sentMessages,
    send(data: string) {
      sentMessages.push(data);
    },
    close: vi.fn(),
  } as unknown as WSContext<WebSocket> & { sentMessages: string[] };
}

function createMockWatcher(): EnhancedTUISessionWatcher {
  return {
    startEnhancedWatching: vi.fn(),
    stop: vi.fn(),
    getPendingSessions: vi.fn().mockResolvedValue([]),
    getSessionRequest: vi.fn().mockResolvedValue(null),
    watchedPath: "/tmp/sessions",
  } as unknown as EnhancedTUISessionWatcher;
}

function createMockSessionManager(): SessionManager {
  return {
    saveSessionAnswers: vi.fn().mockResolvedValue(undefined),
    rejectSession: vi.fn().mockResolvedValue(undefined),
    getAllSessionIds: vi.fn().mockResolvedValue([]),
    getSessionStatus: vi.fn().mockResolvedValue(null),
  } as unknown as SessionManager;
}

describe("SessionBridge", () => {
  let clients: Set<WSContext<WebSocket>>;
  let bridge: SessionBridge;
  let mockWatcher: EnhancedTUISessionWatcher;
  let mockSM: SessionManager;

  beforeEach(() => {
    clients = new Set();
    mockWatcher = createMockWatcher();
    mockSM = createMockSessionManager();
    bridge = SessionBridge.create(clients, mockWatcher, mockSM);
  });

  it("session:list returns empty sessions when none pending", async () => {
    const ws = createMockWs();
    await bridge.handleMessage(ws, WS_TYPES.SESSION_LIST, undefined, "req1");
    expect(ws.sentMessages).toHaveLength(1);
    const msg = JSON.parse(ws.sentMessages[0]) as {
      type: string;
      payload: { sessions: unknown[] };
      requestId: string;
    };
    expect(msg.type).toBe(WS_TYPES.SESSION_LIST_RESULT);
    expect(msg.payload.sessions).toEqual([]);
    expect(msg.requestId).toBe("req1");
  });

  it("session:answer calls saveSessionAnswers", async () => {
    const ws = createMockWs();
    const answers: SessionAnswer = {
      sessionId: "sess-1",
      answers: [],
      timestamp: new Date().toISOString(),
    };
    await bridge.handleMessage(ws, WS_TYPES.SESSION_ANSWER, {
      sessionId: "sess-1",
      answers,
    });
    expect(mockSM.saveSessionAnswers).toHaveBeenCalledWith("sess-1", answers);
    const msg = JSON.parse(ws.sentMessages[0]) as {
      type: string;
      payload: { ok: boolean };
    };
    expect(msg.type).toBe(WS_TYPES.SESSION_ANSWER_RESULT);
    expect(msg.payload.ok).toBe(true);
  });

  it("session:reject calls rejectSession", async () => {
    const ws = createMockWs();
    await bridge.handleMessage(ws, WS_TYPES.SESSION_REJECT, {
      sessionId: "sess-2",
      reason: "not relevant",
    });
    expect(mockSM.rejectSession).toHaveBeenCalledWith("sess-2", "not relevant");
    const msg = JSON.parse(ws.sentMessages[0]) as {
      type: string;
      payload: { ok: boolean };
    };
    expect(msg.type).toBe(WS_TYPES.SESSION_REJECT_RESULT);
    expect(msg.payload.ok).toBe(true);
  });
});
