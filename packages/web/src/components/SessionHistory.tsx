"use client";

import React from "react";
import type { SessionAnswer, SessionRequest, SessionStatus, UserAnswer } from "@auq/core";
import Link from "next/link";

type SessionDetail = {
  answers: SessionAnswer | null;
  id: string;
  request: SessionRequest;
  status: SessionStatus;
};

type SessionHistoryProps = {
  session: SessionDetail;
};

type TimelineEvent = {
  description?: string;
  label: string;
  timestamp: string;
};

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  return date.toLocaleString();
}

function formatAnswer(answer: UserAnswer): string {
  if (answer.selectedOptions?.length) {
    return answer.selectedOptions.join(", ");
  }

  if (answer.selectedOption) {
    return answer.selectedOption;
  }

  if (answer.customText) {
    return answer.customText;
  }

  return "No answer provided";
}

function buildTimeline(session: SessionDetail): TimelineEvent[] {
  const timeline: TimelineEvent[] = [
    {
      label: "Session created",
      timestamp: session.status.createdAt,
      description: `${session.request.questions.length} question(s) submitted`,
    },
  ];

  if (session.status.status === "completed" && session.answers) {
    timeline.push({
      label: "Session completed",
      timestamp: session.answers.timestamp,
      description: `${session.answers.answers.length} answer(s) submitted`,
    });
  } else if (session.status.status === "rejected") {
    timeline.push({
      label: "Session rejected",
      timestamp: session.status.lastModified,
      description: session.status.rejectionReason ?? "No reason provided",
    });
  } else if (session.status.status === "timed_out") {
    timeline.push({
      label: "Session timed out",
      timestamp: session.status.lastModified,
    });
  } else if (session.status.status !== "pending") {
    timeline.push({
      label: `Status changed to ${session.status.status.replace("-", " ")}`,
      timestamp: session.status.lastModified,
    });
  }

  return timeline;
}

export function SessionHistory({ session }: SessionHistoryProps) {
  const timeline = buildTimeline(session);

  const handleExportJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      session,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `session-${session.id}.json`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex items-center rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          Back to sessions
        </Link>
        <button
          type="button"
          onClick={handleExportJson}
          className="inline-flex items-center rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          Export JSON
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="font-mono text-sm text-slate-700">Session: {session.id}</p>
        <p className="mt-2 text-sm text-slate-600">
          Status: <span className="font-medium text-slate-900">{session.status.status}</span>
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-base font-semibold text-slate-900">Timeline</h2>
        <ol className="mt-4 space-y-5">
          {timeline.map((event, index) => (
            <li key={`${event.label}-${event.timestamp}`} className="relative pl-8">
              <span className="absolute left-3 top-0 h-full w-px bg-slate-200" aria-hidden="true" />
              <span className="absolute left-1.5 top-1.5 h-3 w-3 rounded-full border-2 border-white bg-slate-900" />
              <p className="text-sm font-medium text-slate-900">{event.label}</p>
              {event.description ? <p className="text-sm text-slate-600">{event.description}</p> : null}
              <p className="text-xs text-slate-500">{formatTimestamp(event.timestamp)}</p>
              {index === timeline.length - 1 ? (
                <span className="absolute left-3 top-5 h-[calc(100%-20px)] w-px bg-white" aria-hidden="true" />
              ) : null}
            </li>
          ))}
        </ol>
      </div>

      {session.answers ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-base font-semibold text-slate-900">Question & answers</h2>
          <div className="mt-4 space-y-4">
            {session.request.questions.map((question, index) => {
              const answer = session.answers?.answers.find(
                (item) => item.questionIndex === index,
              );

              return (
                <article key={`${question.title}-${index}`} className="rounded-lg border border-slate-100 p-4">
                  <p className="text-sm font-medium text-slate-900">
                    {index + 1}. {question.title}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">{question.prompt}</p>
                  <p className="mt-2 text-sm text-slate-800">
                    <span className="font-medium">Answer:</span>{" "}
                    {answer ? formatAnswer(answer) : "No answer provided"}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}