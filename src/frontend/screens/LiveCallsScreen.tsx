"use client";

import Link from "next/link";
import { useCallStatusFeed } from "@/frontend/hooks/useCallStatusFeed";
import { JourneyStepper } from "@/frontend/components/JourneyStepper";

function vendorInitials(vendorId: string): string {
  return vendorId
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function LiveCallsScreen({ jobId }: { jobId: string }) {
  const { calls, loading, transport } = useCallStatusFeed(jobId);

  if (loading) {
    return <p data-testid="live-calls-loading">Loading call status…</p>;
  }

  return (
    <section className="space-y-8" data-testid="live-calls-screen">
      <JourneyStepper current="calls" />
      <div className="space-y-1">
        <h1 className="font-display text-3xl text-pine">
          Live calls — Hagal is on the line
        </h1>
        <p className="text-xs text-muted-warm" data-testid="live-transport-mode">
          Transport: {transport}
        </p>
      </div>
      <ul className="space-y-3">
        {calls.map((call) => (
          <li
            key={call.id}
            data-testid="call-status-row"
            className="flex items-center justify-between gap-4 rounded-2xl border border-linen bg-white px-5 py-4 shadow-sm"
          >
            <span className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-pine font-extrabold text-white">
                {vendorInitials(call.vendorId)}
              </span>
              <span data-testid="live-call-row" className="font-bold">
                Round {call.round} — {call.vendorId}
              </span>
            </span>
            {call.outcome ? (
              <span className="rounded-full bg-sage px-3 py-1 text-xs font-extrabold text-pine">
                {call.outcome.replace(/_/g, " ")}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full bg-apricot-soft px-3 py-1 text-xs font-extrabold text-terracotta-dark">
                <span className="h-2 w-2 animate-pulse rounded-full bg-terracotta" />
                In progress
              </span>
            )}
          </li>
        ))}
      </ul>
      <Link
        href={`/report/${jobId}`}
        data-testid="view-report-link"
        className="inline-flex rounded-full bg-terracotta px-6 py-3 font-extrabold text-white hover:bg-terracotta-dark"
      >
        See Hagal&apos;s report →
      </Link>
    </section>
  );
}
