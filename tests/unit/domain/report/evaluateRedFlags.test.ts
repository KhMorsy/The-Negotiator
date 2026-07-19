import { describe, expect, it } from "vitest";
import { evaluateRedFlags } from "@/domain/report/evaluateRedFlags";
import { BELOW_MARKET_PERCENT, MARKET_BENCHMARK_WEEKLY } from "@/domain/report/benchmarks";
import type { Quote } from "@/contracts";

const quote: Quote = { id: "q", callId: "c", jobSpecId: "j", vendorId: "v", basePrice: 180, normalizedTotal: 200, pricingModel: "flat", fees: [], redFlag: false, round: 1 };
describe("evaluateRedFlags", () => {
  it.each([[200, false], [180, false], [150, true], [140, true]])("marks %s correctly", (total, redFlag) => {
    const result = evaluateRedFlags({ ...quote, normalizedTotal: total }, MARKET_BENCHMARK_WEEKLY, BELOW_MARKET_PERCENT);
    expect(result.redFlag).toBe(redFlag);
    if (redFlag) expect(result.reasons).toContain("more than 30% below market benchmark");
  });
});
