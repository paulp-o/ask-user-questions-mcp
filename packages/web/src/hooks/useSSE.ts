"use client";

import { useEffect, useState } from "react";

export type SessionSseEventType =
  | "session-created"
  | "session-answered"
  | "session-rejected"
  | "session-timeout";

type SessionSseEventData = {
  sessionId: string;
  reason?: string | null;
};

export type SessionSseEvent = {
  type: SessionSseEventType;
  data: SessionSseEventData;
};

export type SseConnectionStatus = "connecting" | "connected" | "disconnected";

type UseSseOptions = {
  reconnectDelayMs?: number;
};

const EVENT_NAMES: SessionSseEventType[] = [
  "session-created",
  "session-answered",
  "session-rejected",
  "session-timeout",
];

function parseEvent(
  type: SessionSseEventType,
  payload: string,
): SessionSseEvent | null {
  try {
    const parsed = JSON.parse(payload) as Partial<SessionSseEventData>;
    if (typeof parsed.sessionId !== "string") {
      return null;
    }

    return {
      type,
      data: {
        sessionId: parsed.sessionId,
        reason: typeof parsed.reason === "string" ? parsed.reason : null,
      },
    };
  } catch {
    return null;
  }
}

export function useSSE(
  endpoint: string = "/api/sse",
  options: UseSseOptions = {},
): { latestEvent: SessionSseEvent | null; connectionStatus: SseConnectionStatus } {
  const reconnectDelayMs = options.reconnectDelayMs ?? 2000;
  const [latestEvent, setLatestEvent] = useState<SessionSseEvent | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<SseConnectionStatus>("connecting");

  useEffect(() => {
    let source: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;

    const cleanupSource = () => {
      if (source) {
        source.close();
        source = null;
      }
    };

    const connect = () => {
      if (stopped) {
        return;
      }

      setConnectionStatus("connecting");
      cleanupSource();

      source = new EventSource(endpoint);

      source.onopen = () => {
        setConnectionStatus("connected");
      };

      for (const eventName of EVENT_NAMES) {
        source.addEventListener(eventName, (event) => {
          if (!(event instanceof MessageEvent)) {
            return;
          }

          const parsed = parseEvent(eventName, event.data);
          if (parsed) {
            setLatestEvent(parsed);
          }
        });
      }

      source.onerror = () => {
        setConnectionStatus("disconnected");
        cleanupSource();
        if (!stopped) {
          reconnectTimer = setTimeout(connect, reconnectDelayMs);
        }
      };
    };

    connect();

    return () => {
      stopped = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      cleanupSource();
    };
  }, [endpoint, reconnectDelayMs]);

  return { latestEvent, connectionStatus };
}