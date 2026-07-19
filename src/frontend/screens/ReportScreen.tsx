"use client";

import { useEffect, useState } from "react";
import type { ReportDrilldowns, ReportPrimary } from "@/contracts";
import { ReportDrilldownsPanel } from "@/frontend/components/ReportDrilldownsPanel";

export function ReportScreen({
  report: initialReport,
  drilldowns: initialDrilldowns,
  jobId,
}: {
  report?: ReportPrimary;
  drilldowns?: ReportDrilldowns;
  jobId?: string;
}) {
  const [report, setReport] = useState<ReportPrimary | null>(initialReport ?? null);
  const [drilldowns, setDrilldowns] = useState<ReportDrilldowns>(initialDrilldowns ?? {});

  useEffect(() => {
    if (initialReport || !jobId) {
      return;
    }

    void fetch(`/api/reports/${jobId}`)
      .then((response) => response.json())
      .then((body: { report: ReportPrimary; drilldowns?: ReportDrilldowns }) => {
        setReport(body.report);
        setDrilldowns(body.drilldowns ?? {});
      });
  }, [initialReport, jobId]);

  if (!report) {
    return <p data-testid="report-loading">Loading report…</p>;
  }

  return (
    <section className="space-y-6" data-testid="report-screen">
      <h1 className="text-2xl font-semibold">Your ranked quotes</h1>
      <ol className="space-y-3">
        {report.rankedQuotes.map((quote, index) => (
          <li key={quote.id} data-testid="report-quote-row" className="rounded-lg border p-4">
            <span className="font-medium">#{index + 1}</span> — Vendor {quote.vendorId}: $
            {quote.normalizedTotal}
            {quote.redFlag && <span className="ml-2 text-xs text-red-600">Red flag</span>}
            {quote.id === report.recommendedQuoteId && (
              <span className="ml-2 rounded bg-green-100 px-2 py-0.5 text-xs text-green-800">
                Recommended
              </span>
            )}
          </li>
        ))}
      </ol>
      <div data-testid="report-recommendation" className="rounded-lg bg-gray-50 p-4 text-sm">
        {report.plainLanguageWhy}
      </div>
      <ReportDrilldownsPanel drilldowns={drilldowns} />
    </section>
  );
}
