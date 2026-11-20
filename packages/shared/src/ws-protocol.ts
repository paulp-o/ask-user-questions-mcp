export interface WSMessage<T = unknown> {
  type: string;
  payload?: T;
  requestId?: string;
  timestamp: string;
}

export const WS_TYPES = {
  // Session messages
  SESSION_LIST: "session:list",
  SESSION_LIST_RESULT: "session:list:result",
  SESSION_NEW: "session:new",
  SESSION_ANSWER: "session:answer",
  SESSION_ANSWER_RESULT: "session:answer:result",
  SESSION_REJECT: "session:reject",
  SESSION_REJECT_RESULT: "session:reject:result",
  SESSION_STATUS: "session:status",
  SESSION_REMOVED: "session:removed",

  // Config messages
  CONFIG_GET: "config:get",
  CONFIG_GET_RESULT: "config:get:result",
  CONFIG_SET: "config:set",
  CONFIG_SET_RESULT: "config:set:result",
  CONFIG_RESET: "config:reset",
  CONFIG_RESET_RESULT: "config:reset:result",
  CONFIG_EXPORT: "config:export",
  CONFIG_EXPORT_RESULT: "config:export:result",
  CONFIG_IMPORT: "config:import",
  CONFIG_IMPORT_RESULT: "config:import:result",

  // History messages
  HISTORY_LIST: "history:list",
  HISTORY_LIST_RESULT: "history:list:result",
  HISTORY_DETAIL: "history:detail",
  HISTORY_DETAIL_RESULT: "history:detail:result",

  // System messages
  SYSTEM_SYNC: "system:sync",
  SYSTEM_UPDATE: "system:update",
  SYSTEM_PING: "system:ping",
  SYSTEM_PONG: "system:pong",
} as const;

export type WSMessageType = (typeof WS_TYPES)[keyof typeof WS_TYPES];