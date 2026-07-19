import { describe, expect, it } from "vitest";
import { createInMemoryAuditRepository } from "@/adapters/fake/inMemoryAuditRepository";
import { createInMemoryQuoteRepository } from "@/adapters/fake/inMemoryQuoteRepository";
import { ReportComposer } from "@/app/report/reportComposer";
import {
  createContainer,
  resetContainerForTests,
} from "@/app/composition/createContainer";
import { GET } from "@/app/api/reports/[jobId]/route";
import { buildJobSpec } from "@/domain/jobSpec/buildJobSpec";
import type { JobSpec, Vendor } from "@/contracts";

const jobSpec: JobSpec = {
  id: "job-drilldowns-1",
  jobType: "recurring_weekly",
  sqft: 2000,
  bedrooms: 3,
  bathrooms: 2,
  frequency: "weekly",
  addOns: [],
  suppliesProvided: false,
  pets: false,
  accessNotes: "",
  conditionNotes: "",
  geo: "Austin, TX",
  confirmed: true,
};

const vendors: Vendor[] = [
  {
    id: "vendor-a",
    name: "Sparkle Pro",
    phone: "+1",
    rating: 4.8,
    reviewCount: 400,
    insuredBonded: true,
    hasGuarantee: true,
    source: "fake",
  },
  {
    id: "vendor-b",
    name: "Budget Co",
    phone: "+1",
    rating: 3.5,
    reviewCount: 30,
    insuredBonded: false,
    hasGuarantee: false,
    source: "fake",
  },
];

describe("ReportComposer.composeDrilldowns", () => {
  it("returns savings, red flags, and trust signals", async () => {
    const quoteRepo = createInMemoryQuoteRepository();
    const auditRepo = createInMemoryAuditRepository();
    const quote = await quoteRepo.create({
      callId: "call-1",
      jobSpecId: jobSpec.id,
      vendorId: "vendor-a",
      basePrice: 225,
      normalizedTotal: 225,
      pricingModel: "flat",
      fees: [],
      redFlag: false,
      round: 1,
    });
    await quoteRepo.create({
      callId: "call-2",
      jobSpecId: jobSpec.id,
      vendorId: "vendor-b",
      basePrice: 99,
      normalizedTotal: 99,
      pricingModel: "hourly_with_minimum",
      fees: [],
      redFlag: false,
      round: 1,
    });
    const audit = await auditRepo.append({
      callId: "call-1-round-2",
      skillId: "leverage_competing_bid",
      authorizingEvidence: { jobSpecId: jobSpec.id },
      priceBefore: 225,
      priceAfter: 195,
    });

    const composer = new ReportComposer({
      quoteRepo,
      getAuditEvents: async () => [audit],
      getJobSpec: async () => jobSpec,
      getVendors: async () => vendors,
    });
    const drilldowns = await composer.composeDrilldowns(jobSpec.id);

    expect(drilldowns.savings).toEqual({
      initialTotal: 225,
      negotiatedTotal: 195,
      marketBenchmark: 220,
    });
    expect(drilldowns.redFlags).toContainEqual(
      expect.objectContaining({ reasons: expect.any(Array) }),
    );
    expect(drilldowns.redFlags?.some((redFlag) => redFlag.quoteId === quote.id)).toBe(false);
    expect(drilldowns.trust?.find((trust) => trust.vendorId === "vendor-a")?.score).toBeGreaterThan(50);
  });
});

describe("GET /api/reports/[jobId]", () => {
  it("includes drilldowns with the report JSON", async () => {
    resetContainerForTests();
    const container = createContainer();
    const draft = buildJobSpec(
      { sqft: 1800, bedrooms: 3, bathrooms: 2, pets: false },
      {},
      {
        geo: "Austin, TX",
        jobType: "recurring_weekly",
        frequency: "weekly",
      },
    );
    const job = await container.repos.jobSpecs.create(draft);
    await container.repos.jobSpecs.confirm(job.id);
    await container.callOrchestrator.runFullNegotiation(job.id);

    const response = await GET(new Request(`http://localhost/api/reports/${job.id}`), {
      params: Promise.resolve({ jobId: job.id }),
    });
    const body = (await response.json()) as { drilldowns?: unknown };

    expect(response.status).toBe(200);
    expect(body.drilldowns).toBeDefined();
  });
});
