"use client";

import type { SessionStatusValue } from "@auq/core";
import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { StatusBadge } from "./StatusBadge";
import { useSSE } from "../hooks/useSSE";

type SessionFilter = "all" | "pending" | "completed" | "rejected";

type SessionListItem = {
  answered: boolean;
  createdAt: string;
  id: string;
  questionCount: number;
  status: SessionStatusValue;
  updatedAt: string;
};

const FILTERS: Array<{ label: string; value: SessionFilter }> = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Completed", value: "completed" },
  { label: "Rejected", value: "rejected" },
];

function formatRelativeTime(isoTimestamp: string): string {
  const timestamp = new Date(isoTimestamp).getTime();
  const now = Date.now();
  const diffMs = now - timestamp;

  if (!Number.isFinite(timestamp) || diffMs < 0) {
    return "just now";
  }

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) {
    return "just now";
  }
  if (diffMs < hour) {
    return `${Math.floor(diffMs / minute)}m ago`;
  }
  if (diffMs < day) {
    return `${Math.floor(diffMs / hour)}h ago`;
  }

  return `${Math.floor(diffMs / day)}d ago`;
}

function truncateSessionId(sessionId: string): string {
  if (sessionId.length <= 14) {
    return sessionId;
  }

  return `${sessionId.slice(0, 8)}...${sessionId.slice(-4)}`;
}

export function SessionList() {
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [filter, setFilter] = useState<SessionFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const { latestEvent, connectionStatus } = useSSE();

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filter !== "all") {
        params.set("status", filter);
      }

      const query = params.toString();
      const response = await fetch(`/api/sessions${query ? `?${query}` : ""}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch sessions: ${response.status}`);
      }

      const data: SessionListItem[] = await response.json();
      setSessions(data);
    } catch (fetchError) {
      const message =
        fetchError instanceof Error ? fetchError.message : "Failed to fetch sessions";
      setError(message);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void fetchSessions();
    }, 10000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [fetchSessions]);

  useEffect(() => {
    if (!latestEvent) {
      return;
    }

    if (
      latestEvent.type === "session-created" ||
      latestEvent.type === "session-answered" ||
      latestEvent.type === "session-rejected"
    ) {
      void fetchSessions();
    }
  }, [fetchSessions, latestEvent]);

  const handleDelete = useCallback(
    async (sessionId: string) => {
      const confirmed = window.confirm(
        "Delete this session? This action cannot be undone.",
      );

      if (!confirmed) {
        return;
      }

      setIsDeleting(sessionId);
      setError(null);

      try {
        const response = await fetch(`/api/sessions/${sessionId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error(`Failed to delete session: ${response.status}`);
        }

        await fetchSessions();
      } catch (deleteError) {
        const message =
          deleteError instanceof Error
            ? deleteError.message
            : "Failed to delete session";
        setError(message);
      } finally {
        setIsDeleting(null);
      }
    },
    [fetchSessions],
  );

  const tableContent = useMemo(() => {
    if (loading) {
      return Array.from({ length: 4 }).map((_, index) => (
        <tr key={`skeleton-${index}`} className="border-t border-slate-200">
          <td className="px-4 py-3" colSpan={5}>
            <div className="h-9 w-full animate-pulse rounded bg-slate-100" aria-hidden="true" />
          </td>
        </tr>
      ));
    }

    if (sessions.length === 0) {
      return (
        <tr>
          <td className="px-4 py-10 text-center text-sm text-slate-500" colSpan={5}>
            No sessions found.
          </td>
        </tr>
      );
    }

    return sessions.map((session) => (
      <tr key={session.id} className="border-t border-slate-200">
        <td className="px-4 py-3 font-mono text-sm text-slate-700" title={session.id}>
          {truncateSessionId(session.id)}
        </td>
        <td className="px-4 py-3">
          <StatusBadge status={session.status} />
        </td>
        <td className="px-4 py-3 text-sm text-slate-700">{session.questionCount}</td>
        <td className="px-4 py-3 text-sm text-slate-700">
          {formatRelativeTime(session.createdAt)}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <Link
              href={`/sessions/${session.id}`}
              className="inline-flex items-center rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              View
            </Link>
            <button
              type="button"
              onClick={() => void handleDelete(session.id)}
              disabled={isDeleting === session.id}
              className="inline-flex items-center rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDeleting === session.id ? "Deleting..." : "Delete"}
            </button>
          </div>
        </td>
      </tr>
    ));
  }, [handleDelete, isDeleting, loading, sessions]);

  return (
    <section className="space-y-4" aria-labelledby="sessions-heading">
      <h2 id="sessions-heading" className="sr-only">
        Session list
      </h2>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex w-full overflow-x-auto rounded-lg border border-slate-200 bg-white p-1 sm:w-auto">
          {FILTERS.map((tab) => {
            const active = filter === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setFilter(tab.value)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${
                  active
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void fetchSessions()}
            className="inline-flex items-center rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            Refresh
          </button>
          <span className="text-xs text-slate-500" data-testid="sse-status" aria-live="polite">
            SSE: {connectionStatus}
          </span>
        </div>
      </div>

      {error ? (
        <div className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between" role="alert">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => void fetchSessions()}
            className="inline-flex items-center rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
          >
            Retry
          </button>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-[640px] w-full border-collapse">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                Session ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                Question Count
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                Created At
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>{tableContent}</tbody>
        </table>
      </div>
    </section>
  );
}