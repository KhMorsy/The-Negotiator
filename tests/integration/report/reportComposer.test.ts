// @vitest-environment node
import { describe, expect, it } from "vitest";
import { ReportComposer } from "@/app/report/reportComposer";
import { createInMemoryQuoteRepository } from "@/adapters/fake/inMemoryRepos";
import type { JobSpec, Vendor } from "@/contracts";

const jobSpec: JobSpec = { id: "job-report-1", jobType: "recurring_weekly", sqft: 2000, bedrooms: 3, bathrooms: 2, frequency: "weekly", addOns: [], suppliesProvided: false, pets: false, accessNotes: "", conditionNotes: "", geo: "Austin, TX", confirmed: true };
const vendors: Vendor[] = [
  { id: "vendor-a", name: "Sparkle Pro", phone: "+1", rating: 4.7, reviewCount: 300, insuredBonded: true, hasGuarantee: true, source: "fake" },
  { id: "vendor-b", name: "Budget Co", phone: "+1", rating: 3.8, reviewCount: 40, insuredBonded: false, hasGuarantee: false, source: "fake" },
];
describe("ReportComposer", () => {
  it("returns ranked quotes and a plain-language recommendation", async () => {
    const quoteRepo = createInMemoryQuoteRepository();
    await quoteRepo.create({ callId: "c1", jobSpecId: jobSpec.id, vendorId: "vendor-a", basePrice: 195, normalizedTotal: 0, pricingModel: "flat", fees: [{ feeType: "supplies", amount: 15 }], redFlag: false, round: 1 });
    await quoteRepo.create({ callId: "c2", jobSpecId: jobSpec.id, vendorId: "vendor-b", basePrice: 120, normalizedTotal: 0, pricingModel: "flat", fees: [], redFlag: false, round: 1 });
    const report = await new ReportComposer({ quoteRepo, getJobSpec: async () => jobSpec, getVendors: async () => vendors }).compose(jobSpec.id);
    expect(report.rankedQuotes).toHaveLength(2);
    expect(report.recommendedQuoteId).toBeTruthy();
    expect(report.plainLanguageWhy).toMatch(/Sparkle Pro|insured/i);
  });
});
