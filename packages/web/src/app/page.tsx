import { SessionList } from "@/components/SessionList";

export default function HomePage() {
  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Sessions</h1>
      <SessionList />
    </main>
  );
}