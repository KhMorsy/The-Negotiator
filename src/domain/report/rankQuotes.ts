import type { Quote, Vendor } from "@/contracts";
import { scoreTrust } from "./scoreTrust";

function score(quote: Quote, vendor: Vendor) {
  return scoreTrust(vendor) * 2 - quote.normalizedTotal - (quote.redFlag ? 1000 : 0);
}

export function rankQuotes(quotes: Quote[], vendors: Record<string, Vendor>) {
  const rankedQuotes = [...quotes].sort((a, b) => score(b, vendors[b.vendorId]) - score(a, vendors[a.vendorId]));
  return { rankedQuotes, recommendedQuoteId: rankedQuotes[0]?.id ?? "" };
}
