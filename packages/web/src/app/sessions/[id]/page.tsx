"use client";

import type { SessionAnswer, SessionRequest, SessionStatus } from "@auq/core";
import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useState } from "react";
import { QuestionStepper } from "@/components/QuestionStepper";
import { StatusBadge } from "@/components/StatusBadge";

type SessionDetail = {
  answers: SessionAnswer | null;
  id: string;
  request: SessionRequest;
  status: SessionStatus;
};

type SessionPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatAnswerSummary(answer: SessionAnswer): string[] {
  return answer.answers.map((item) => {
    if (item.selectedOptions && item.selectedOptions.length > 0) {
      return item.customText
        ? `${item.selectedOptions.join(", ")} (${item.customText})`
        : item.selectedOptions.join(", ");
    }

    if (item.selectedOption) {
      return item.customText
        ? `${item.selectedOption} (${item.customText})`
        : item.selectedOption;
    }

    return item.customText ?? "No answer";
  });
}

export default function SessionDetailPage({ params }: SessionPageProps) {
  const resolvedParams = use(params);
  const sessionId = resolvedParams.id;
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSession = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    setError(null);

    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        cache: "no-store",
      });

      if (response.status === 404) {
        setNotFound(true);
        setSession(null);
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to load session: ${response.status}`);
      }

      const data = (await response.json()) as SessionDetail;
      setSession(data);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error ? fetchError.message : "Failed to load session.",
      );
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void fetchSession();
  }, [fetchSession]);

  const answerSummary = useMemo(() => {
    if (!session?.answers) {
      return [];
    }

    return formatAnswerSummary(session.answers);
  }, [session?.answers]);

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        >
          Back to sessions
        </Link>
      </div>

      {loading ? (
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-6" aria-live="polite" aria-busy="true">
          <div className="h-6 w-48 animate-pulse rounded bg-slate-100" aria-hidden="true" />
          <div className="h-4 w-full animate-pulse rounded bg-slate-100" aria-hidden="true" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" aria-hidden="true" />
          <div className="inline-flex items-center gap-2 text-sm text-slate-600">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" aria-hidden="true" />
            Loading session...
          </div>
        </section>
      ) : null}

      {!loading && notFound ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
          <h1 className="text-xl font-semibold text-slate-900">Session not found</h1>
          <p className="mt-2 text-sm text-slate-600">
            This session may have been deleted or never existed.
          </p>
        </section>
      ) : null}

      {!loading && error ? (
        <section className="rounded-xl border border-red-200 bg-red-50 p-4 sm:p-6" role="alert">
          <p className="text-sm text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => void fetchSession()}
            className="mt-3 inline-flex items-center rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
          >
            Retry
          </button>
        </section>
      ) : null}

      {!loading && session ? (
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <h1 className="break-all text-2xl font-semibold tracking-tight text-slate-900">
                Session {session.id}
              </h1>
              <p className="text-sm text-slate-600">
                {session.request.questions.length} question
                {session.request.questions.length === 1 ? "" : "s"}
              </p>
            </div>
            <StatusBadge status={session.status.status} />
          </div>

          {session.status.status === "pending" ? (
            <QuestionStepper
              sessionId={session.id}
              questions={session.request.questions}
              onComplete={() => {
                void fetchSession();
              }}
            />
          ) : null}

          {session.status.status === "completed" ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                <h2 className="text-lg font-semibold text-green-900">Completed</h2>
                <p className="text-sm text-green-800">This session has already been answered.</p>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
                  Answer summary
                </h3>
                {answerSummary.length > 0 ? (
                  <ul className="space-y-2">
                    {session.request.questions.map((question, index) => (
                      <li
                        key={`${question.title}-${index}`}
                        className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                      >
                        <p className="text-sm font-medium text-slate-900">
                          {index + 1}. {question.title}
                        </p>
                        <p className="mt-1 text-sm text-slate-700">
                          {answerSummary[index] ?? "No answer"}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-600">No recorded answers.</p>
                )}
              </div>
            </div>
          ) : null}

          {session.status.status === "rejected" ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <h2 className="text-lg font-semibold text-red-900">Rejected</h2>
              <p className="mt-1 text-sm text-red-800">
                {session.status.rejectionReason?.trim() || "No reason provided."}
              </p>
            </div>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}