import { createInMemoryQuoteRepository } from "@/adapters/fake/inMemoryRepos";
import type { JobSpec, Vendor } from "@/contracts";
import { ReportComposer } from "../report/reportComposer";

const jobSpec: JobSpec = { id: "job-report-1", jobType: "recurring_weekly", sqft: 2000, bedrooms: 3, bathrooms: 2, frequency: "weekly", addOns: [], suppliesProvided: false, pets: false, accessNotes: "", conditionNotes: "", geo: "Austin, TX", confirmed: true };
const vendors: Vendor[] = [{ id: "vendor-a", name: "Sparkle Pro", phone: "+1", rating: 4.7, reviewCount: 300, insuredBonded: true, hasGuarantee: true, source: "fake" }];
const quoteRepo = createInMemoryQuoteRepository();
let seeded = false;

export async function getReportComposer() {
  if (!seeded) {
    await quoteRepo.create({ callId: "report-call", jobSpecId: jobSpec.id, vendorId: "vendor-a", basePrice: 195, normalizedTotal: 0, pricingModel: "flat", fees: [], redFlag: false, round: 1 });
    seeded = true;
  }
  return new ReportComposer({ quoteRepo, getJobSpec: async (id) => id === jobSpec.id ? jobSpec : null, getVendors: async () => vendors });
}
