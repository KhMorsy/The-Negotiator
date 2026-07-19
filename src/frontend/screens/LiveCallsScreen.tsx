"use client";

import Link from "next/link";
import { useCallStatusFeed } from "@/frontend/hooks/useCallStatusFeed";

export function LiveCallsScreen({ jobId }: { jobId: string }) {
  const { calls, loading, transport } = useCallStatusFeed(jobId);

  if (loading) {
    return <p data-testid="live-calls-loading">Loading call status…</p>;
  }

  return (
    <section className="space-y-6" data-testid="live-calls-screen">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Live calls</h1>
        <p className="text-xs text-gray-500" data-testid="live-transport-mode">
          Transport: {transport}
        </p>
      </div>
      <ul className="divide-y rounded-lg border">
        {calls.map((call) => (
          <li
            key={call.id}
            data-testid="call-status-row"
            className="flex items-center justify-between px-4 py-3"
          >
            <span data-testid="live-call-row" className="font-medium">
              Round {call.round} — {call.vendorId}
            </span>
            {call.outcome ? (
              <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-800">
                {call.outcome.replace(/_/g, " ")}
              </span>
            ) : (
              <span className="text-xs text-amber-600">In progress</span>
            )}
          </li>
        ))}
      </ul>
      <Link
        href={`/report/${jobId}`}
        data-testid="view-report-link"
        className="inline-flex rounded-lg bg-black px-5 py-3 text-white hover:bg-gray-800"
      >
        View your ranked report
      </Link>
    </section>
  );
}
