import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { SessionHistory } from "@/components/SessionHistory";

type HistoryPageProps = {
  params: Promise<{ id: string }>;
};

type SessionDetailResponse = {
  answers: {
    answers: Array<{
      customText?: string;
      questionIndex: number;
      selectedOption?: string;
      selectedOptions?: string[];
      timestamp: string;
    }>;
    callId?: string;
    lastReadAt?: string;
    sessionId: string;
    timestamp: string;
    workingDirectory?: string;
  } | null;
  id: string;
  request: {
    callId?: string;
    questions: Array<{
      multiSelect?: boolean;
      options: Array<{
        description?: string;
        label: string;
      }>;
      prompt: string;
      title: string;
    }>;
    sessionId: string;
    status:
      | "completed"
      | "elaborate_requested"
      | "in-progress"
      | "pending"
      | "rejected"
      | "rephrase_requested"
      | "timed_out";
    timestamp: string;
    workingDirectory?: string;
  };
  status: {
    callId?: string;
    createdAt: string;
    currentQuestionIndex?: number;
    lastModified: string;
    rejectionReason?: string | null;
    sessionId: string;
    status:
      | "abandoned"
      | "completed"
      | "elaborate_requested"
      | "in-progress"
      | "pending"
      | "rejected"
      | "rephrase_requested"
      | "timed_out";
    totalQuestions: number;
    workingDirectory?: string;
  };
};

async function fetchSession(sessionId: string): Promise<SessionDetailResponse | null> {
  const headerStore = await headers();
  const host =
    headerStore.get("x-forwarded-host") ??
    headerStore.get("host") ??
    "localhost:3000";
  const protocol = headerStore.get("x-forwarded-proto") ?? "http";
  const response = await fetch(`${protocol}://${host}/api/sessions/${sessionId}`, {
    cache: "no-store",
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch session: ${response.status}`);
  }

  return (await response.json()) as SessionDetailResponse;
}

export default async function SessionHistoryPage({ params }: HistoryPageProps) {
  const { id } = await params;
  const session = await fetchSession(id);

  if (!session) {
    notFound();
  }

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Session history</h1>
      <SessionHistory session={session} />
    </main>
  );
}