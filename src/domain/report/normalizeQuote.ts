import type { JobSpec, Quote } from "@/contracts";
import { HOURLY_MINIMUM_HOURS } from "./benchmarks";

export function normalizeQuote(quote: Quote, jobSpec: JobSpec): Quote {
  const base = quote.pricingModel === "hourly_with_minimum"
    ? quote.basePrice * HOURLY_MINIMUM_HOURS
    : quote.pricingModel === "per_sqft" ? quote.basePrice * jobSpec.sqft : quote.basePrice;
  const fees = quote.fees.reduce((total, fee) => total + fee.amount, 0);
  return { ...quote, normalizedTotal: Math.round((base + fees) * 100) / 100 };
}
