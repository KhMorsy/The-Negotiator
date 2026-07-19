import type { Quote } from "@/contracts";

export function evaluateRedFlags(quote: Quote, marketBenchmark: number, belowMarketPercent: number) {
  const reasons: string[] = [];
  if (quote.normalizedTotal < marketBenchmark * (1 - belowMarketPercent / 100)) {
    reasons.push("more than 30% below market benchmark");
  }
  if (quote.pricingModel === "hourly_with_minimum" && quote.fees.length === 0) {
    reasons.push("open-ended hourly with no fee breakdown");
  }
  return { redFlag: reasons.length > 0, reasons };
}
