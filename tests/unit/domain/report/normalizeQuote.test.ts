import { describe, expect, it } from "vitest";
import { normalizeQuote } from "@/domain/report/normalizeQuote";
import type { JobSpec, Quote } from "@/contracts";

const jobSpec: JobSpec = { id: "j", jobType: "recurring_weekly", sqft: 2000, bedrooms: 3, bathrooms: 2, frequency: "weekly", addOns: [], suppliesProvided: false, pets: false, accessNotes: "", conditionNotes: "", geo: "Austin, TX", confirmed: true };
const cases: Array<[Quote, number]> = [
  [{ id: "q1", callId: "c", jobSpecId: "j", vendorId: "v", basePrice: 180, normalizedTotal: 0, pricingModel: "flat", fees: [{ id: "f", quoteId: "q1", feeType: "supplies", amount: 20 }], redFlag: false, round: 1 }, 200],
  [{ id: "q2", callId: "c", jobSpecId: "j", vendorId: "v", basePrice: 45, normalizedTotal: 0, pricingModel: "hourly_with_minimum", fees: [{ id: "f", quoteId: "q2", feeType: "trip", amount: 25 }], redFlag: false, round: 1 }, 205],
  [{ id: "q3", callId: "c", jobSpecId: "j", vendorId: "v", basePrice: 0.12, normalizedTotal: 0, pricingModel: "per_sqft", fees: [{ id: "f", quoteId: "q3", feeType: "premium", amount: 50 }], redFlag: false, round: 1 }, 290],
];
describe("normalizeQuote", () => it.each(cases)("normalizes quote", (quote, total) => expect(normalizeQuote(quote, jobSpec).normalizedTotal).toBe(total)));
