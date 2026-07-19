import type { ReportDrilldowns } from "@/contracts";

export function ReportDrilldownsPanel({
  drilldowns,
}: {
  drilldowns: ReportDrilldowns;
}) {
  const savings = drilldowns.savings;
  const saved = savings ? savings.initialTotal - savings.negotiatedTotal : 0;

  return (
    <div className="space-y-3 border-t border-linen pt-5">
      <details
        data-testid="drilldown-savings"
        open
        className="rounded-2xl border border-linen bg-white px-5 py-4"
      >
        <summary className="cursor-pointer font-extrabold text-pine">
          D — Savings delta
        </summary>
        <p className="mt-2 text-sm">
          ${saved} saved versus the initial high quote (${savings?.initialTotal ?? 0}) → $
          {savings?.negotiatedTotal ?? 0} after negotiation. Market benchmark: $
          {savings?.marketBenchmark ?? 0}/visit.
        </p>
      </details>
      <details
        data-testid="drilldown-red-flags"
        className="rounded-2xl border border-linen bg-white px-5 py-4"
      >
        <summary className="cursor-pointer font-extrabold text-pine">
          E — Red-flag callouts
        </summary>
        <ul className="mt-2 list-disc pl-5 text-sm">
          {(drilldowns.redFlags ?? []).map((redFlag) => (
            <li key={redFlag.quoteId}>
              Quote {redFlag.quoteId}: {redFlag.reasons.join("; ")}
            </li>
          ))}
          {(drilldowns.redFlags ?? []).length === 0 && <li>No red flags detected.</li>}
        </ul>
      </details>
      <details
        data-testid="drilldown-trust"
        className="rounded-2xl border border-linen bg-white px-5 py-4"
      >
        <summary className="cursor-pointer font-extrabold text-pine">
          F — Trust signals
        </summary>
        <ul className="mt-2 space-y-1 text-sm">
          {(drilldowns.trust ?? []).map((trust) => (
            <li key={trust.vendorId}>
              {trust.vendorId}: trust score {trust.score}/100
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
