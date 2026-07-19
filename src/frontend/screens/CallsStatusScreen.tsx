"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { AuditEvent, Vendor } from "@/contracts";

export function CallsStatusScreen({
  jobId,
  vendors,
}: {
  jobId: string;
  vendors?: Vendor[];
}) {
  const [auditEvents, setAuditEvents] = useState<AuditEvent[] | null>(null);

  useEffect(() => {
    if (vendors) return;
    void fetch(`/api/audit/${jobId}`).then(async (response) => {
      if (!response.ok) return;
      setAuditEvents(
        ((await response.json()) as { auditEvents: AuditEvent[] }).auditEvents,
      );
    });
  }, [jobId, vendors]);

  return (
    <section className="space-y-6" data-testid="calls-screen">
      <h1 className="text-2xl font-semibold">Live call status</h1>
      <p className="text-gray-600">Job {jobId}</p>
      {vendors ? (
        <ul className="divide-y rounded-lg border">
          {vendors.map((vendor) => (
            <li
              key={vendor.id}
              data-testid="call-status-row"
              className="flex items-center justify-between px-4 py-3"
            >
              <span>{vendor.name}</span>
              <span className="text-sm text-gray-500">Queued (simulated)</span>
            </li>
          ))}
        </ul>
      ) : auditEvents === null ? (
        <p data-testid="calls-loading">Loading negotiation results…</p>
      ) : auditEvents.length === 0 ? (
        <p className="text-gray-600">
          No negotiation moves recorded yet. Confirm the job spec to start
          calling vendors.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {auditEvents.map((event) => (
            <li
              key={event.id}
              data-testid="call-status-row"
              className="flex items-center justify-between px-4 py-3"
            >
              <span className="text-sm">
                Skill <span className="font-medium">{event.skillId}</span>
              </span>
              <span className="text-sm text-green-700">
                {event.priceBefore !== null && event.priceAfter !== null
                  ? `$${event.priceBefore} → $${event.priceAfter}`
                  : "no price move"}
              </span>
            </li>
          ))}
        </ul>
      )}
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
