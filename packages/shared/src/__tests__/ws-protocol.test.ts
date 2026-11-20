import { describe, it, expect } from "vitest";
import { WS_TYPES, type WSMessage, type WSMessageType } from "../ws-protocol.js";

describe("ws-protocol", () => {
  it("WS_TYPES has all session message types", () => {
    expect(WS_TYPES.SESSION_LIST).toBe("session:list");
    expect(WS_TYPES.SESSION_LIST_RESULT).toBe("session:list:result");
    expect(WS_TYPES.SESSION_NEW).toBe("session:new");
    expect(WS_TYPES.SESSION_ANSWER).toBe("session:answer");
    expect(WS_TYPES.SESSION_ANSWER_RESULT).toBe("session:answer:result");
    expect(WS_TYPES.SESSION_REJECT).toBe("session:reject");
    expect(WS_TYPES.SESSION_REJECT_RESULT).toBe("session:reject:result");
    expect(WS_TYPES.SESSION_STATUS).toBe("session:status");
    expect(WS_TYPES.SESSION_REMOVED).toBe("session:removed");
  });

  it("WS_TYPES has all config message types", () => {
    expect(WS_TYPES.CONFIG_GET).toBe("config:get");
    expect(WS_TYPES.CONFIG_GET_RESULT).toBe("config:get:result");
    expect(WS_TYPES.CONFIG_SET).toBe("config:set");
    expect(WS_TYPES.CONFIG_SET_RESULT).toBe("config:set:result");
    expect(WS_TYPES.CONFIG_RESET).toBe("config:reset");
    expect(WS_TYPES.CONFIG_RESET_RESULT).toBe("config:reset:result");
    expect(WS_TYPES.CONFIG_EXPORT).toBe("config:export");
    expect(WS_TYPES.CONFIG_EXPORT_RESULT).toBe("config:export:result");
    expect(WS_TYPES.CONFIG_IMPORT).toBe("config:import");
    expect(WS_TYPES.CONFIG_IMPORT_RESULT).toBe("config:import:result");
  });

  it("WS_TYPES has all history message types", () => {
    expect(WS_TYPES.HISTORY_LIST).toBe("history:list");
    expect(WS_TYPES.HISTORY_LIST_RESULT).toBe("history:list:result");
    expect(WS_TYPES.HISTORY_DETAIL).toBe("history:detail");
    expect(WS_TYPES.HISTORY_DETAIL_RESULT).toBe("history:detail:result");
  });

  it("WS_TYPES has all system message types", () => {
    expect(WS_TYPES.SYSTEM_SYNC).toBe("system:sync");
    expect(WS_TYPES.SYSTEM_UPDATE).toBe("system:update");
    expect(WS_TYPES.SYSTEM_PING).toBe("system:ping");
    expect(WS_TYPES.SYSTEM_PONG).toBe("system:pong");
  });

  it("WSMessage envelope type is structurally correct", () => {
    const msg: WSMessage<{ sessions: string[] }> = {
      type: WS_TYPES.SESSION_LIST_RESULT,
      payload: { sessions: ["abc", "def"] },
      requestId: "req-1",
      timestamp: new Date().toISOString(),
    };
    expect(msg.type).toBe("session:list:result");
    expect(msg.payload?.sessions).toHaveLength(2);
  });

  it("WSMessageType covers all constants", () => {
    const types = Object.values(WS_TYPES) as WSMessageType[];
    expect(types.length).toBe(27);
  });
});