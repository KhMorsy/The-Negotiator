"use client";
import { useEffect, useState } from "react";
import type { ReportPrimary } from "@/contracts";
import { ReportDrilldownStub } from "@/frontend/components/ReportDrilldownStub";
export function ReportScreen({ report: initialReport, jobId }: { report?: ReportPrimary; jobId?: string }) {
  const [report, setReport] = useState<ReportPrimary | null>(initialReport ?? null);
  useEffect(() => { if (!initialReport && jobId) void fetch(`/api/reports/${jobId}`).then((response) => response.json()).then((body) => setReport(body.report)); }, [initialReport, jobId]);
  if (!report) return <p data-testid="report-loading">Loading report…</p>;
  return <section className="space-y-6" data-testid="report-screen"><h1 className="text-2xl font-semibold">Your ranked quotes</h1><ol className="space-y-3">{report.rankedQuotes.map((quote, index) => <li key={quote.id} data-testid="report-quote-row" className="rounded-lg border p-4"><span className="font-medium">#{index + 1}</span> — Vendor {quote.vendorId}: ${quote.normalizedTotal}{quote.redFlag && <span className="ml-2 text-xs text-red-600">Red flag</span>}{quote.id === report.recommendedQuoteId && <span className="ml-2 rounded bg-green-100 px-2 py-0.5 text-xs text-green-800">Recommended</span>}</li>)}</ol><div data-testid="report-recommendation" className="rounded-lg bg-gray-50 p-4 text-sm">{report.plainLanguageWhy}</div><div className="space-y-3 border-t pt-4"><ReportDrilldownStub testId="drilldown-savings" title="D — Savings delta" /><ReportDrilldownStub testId="drilldown-red-flags" title="E — Red-flag callouts" /><ReportDrilldownStub testId="drilldown-trust" title="F — Trust signals" /></div></section>;
}
