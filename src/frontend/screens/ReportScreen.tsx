import type { ReportPrimary } from "@/contracts";

export function ReportScreen({ report }: { report: ReportPrimary }) {
  return (
    <section className="space-y-6" data-testid="report-screen">
      <h1 className="text-2xl font-semibold">Your ranked quotes</h1>
      <ol className="space-y-3">
        {report.rankedQuotes.map((quote, index) => (
          <li
            key={quote.id}
            data-testid="report-quote-row"
            className="rounded-lg border p-4"
          >
            <span className="font-medium">#{index + 1}</span> — Vendor{" "}
            {quote.vendorId}: ${quote.normalizedTotal}
            {quote.id === report.recommendedQuoteId && (
              <span className="ml-2 rounded bg-green-100 px-2 py-0.5 text-xs text-green-800">
                Recommended
              </span>
            )}
          </li>
        ))}
      </ol>
      <div
        data-testid="report-recommendation"
        className="rounded-lg bg-gray-50 p-4 text-sm"
      >
        {report.plainLanguageWhy}
      </div>
    </section>
  );
}
