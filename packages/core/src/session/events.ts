import { EventEmitter } from "node:events";

import type { SessionAnswer, SessionRequest } from "../shared/types.js";

export interface SessionEventMap {
  "session:created": [sessionId: string, request: SessionRequest];
  "session:answered": [sessionId: string, answers: SessionAnswer["answers"]];
  "session:rejected": [sessionId: string, reason?: string];
  "session:timeout": [sessionId: string];
}

type SessionEventName = keyof SessionEventMap;
type SessionEventListener<K extends SessionEventName> = (
  ...args: SessionEventMap[K]
) => void;

export type SessionEventEmitter = Omit<
  EventEmitter,
  "on" | "once" | "off" | "removeListener" | "emit"
> & {
  on<K extends SessionEventName>(
    eventName: K,
    listener: SessionEventListener<K>,
  ): SessionEventEmitter;
  once<K extends SessionEventName>(
    eventName: K,
    listener: SessionEventListener<K>,
  ): SessionEventEmitter;
  off<K extends SessionEventName>(
    eventName: K,
    listener: SessionEventListener<K>,
  ): SessionEventEmitter;
  removeListener<K extends SessionEventName>(
    eventName: K,
    listener: SessionEventListener<K>,
  ): SessionEventEmitter;
  emit<K extends SessionEventName>(
    eventName: K,
    ...args: SessionEventMap[K]
  ): boolean;
};

export const createSessionEventEmitter = (): SessionEventEmitter => {
  return new EventEmitter() as SessionEventEmitter;
};