"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { ReportDrilldowns, ReportPrimary } from "@/contracts";
import { ReportDrilldownsPanel } from "@/frontend/components/ReportDrilldownsPanel";
import { JourneyStepper } from "@/frontend/components/JourneyStepper";

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
    <section className="space-y-8" data-testid="report-screen">
      <JourneyStepper current="report" />
      <h1 className="font-display text-3xl text-pine">
        Hagal&apos;s report — your ranked quotes
      </h1>
      <ol className="space-y-3">
        {report.rankedQuotes.map((quote, index) => {
          const isWinner = quote.id === report.recommendedQuoteId;
          if (isWinner) {
            return (
              <li
                key={quote.id}
                data-testid="report-quote-row"
                className="rounded-3xl bg-pine p-7 text-white"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wide text-sage">
                      #{index + 1} — Vendor {quote.vendorId}
                    </p>
                    <p className="font-display text-4xl font-bold text-apricot">
                      ${quote.normalizedTotal}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {quote.redFlag && (
                      <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-extrabold text-apricot-soft">
                        Red flag
                      </span>
                    )}
                    <span className="rounded-full bg-apricot px-3 py-1 text-xs font-extrabold text-ink">
                      Recommended
                    </span>
                  </div>
                </div>
              </li>
            );
          }
          return (
            <li
              key={quote.id}
              data-testid="report-quote-row"
              className="flex items-center justify-between gap-4 rounded-2xl border border-linen bg-white px-5 py-4"
            >
              <span className="flex items-center gap-3">
                <span className="font-display text-lg font-bold text-pine">
                  #{index + 1}
                </span>
                <span className="font-bold">Vendor {quote.vendorId}</span>
                {quote.redFlag && (
                  <span className="rounded-full bg-terracotta/10 px-3 py-1 text-xs font-extrabold text-terracotta-dark">
                    Red flag
                  </span>
                )}
              </span>
              <span className="font-display text-xl font-bold text-pine">
                ${quote.normalizedTotal}
              </span>
            </li>
          );
        })}
      </ol>
      <div
        data-testid="report-recommendation"
        className="flex items-center gap-4 rounded-2xl bg-sage/40 p-4 text-sm text-pine"
      >
        <Image
          src="/hagal/hagal-fox.png"
          alt="Hagal the fox"
          width={56}
          height={56}
          className="shrink-0 rounded-full bg-apricot-soft"
        />
        <p>
          <span className="font-extrabold">Hagal says: </span>
          {report.plainLanguageWhy}
        </p>
      </div>
      <ReportDrilldownsPanel drilldowns={drilldowns} />
    </section>
  );
}
