import { describe, expect, it } from "vitest";
import { rankQuotes } from "@/domain/report/rankQuotes";
import type { Quote, Vendor } from "@/contracts";

const vendors: Record<string, Vendor> = {
  a: { id: "a", name: "A", phone: "+1", rating: 4.5, reviewCount: 100, insuredBonded: true, hasGuarantee: true, source: "fake" },
  b: { id: "b", name: "B", phone: "+1", rating: 3, reviewCount: 5, insuredBonded: false, hasGuarantee: false, source: "fake" },
};
const quotes: Quote[] = [
  { id: "qa", callId: "c", jobSpecId: "j", vendorId: "a", basePrice: 210, normalizedTotal: 210, pricingModel: "flat", fees: [], redFlag: false, round: 1 },
  { id: "qb", callId: "c", jobSpecId: "j", vendorId: "b", basePrice: 120, normalizedTotal: 120, pricingModel: "flat", fees: [], redFlag: true, round: 1 },
];
describe("rankQuotes", () => {
  it("ranks non-red-flag insured quote first", () => expect(rankQuotes(quotes, vendors).recommendedQuoteId).toBe("qa"));
  it("deprioritizes red-flag quotes", () => expect(rankQuotes(quotes, vendors).rankedQuotes.at(-1)?.id).toBe("qb"));
});
