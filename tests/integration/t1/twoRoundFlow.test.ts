import { beforeEach, describe, expect, it } from "vitest";
import {
  createContainer,
  resetContainerForTests,
} from "@/app/composition/createContainer";
import { buildJobSpec } from "@/domain/jobSpec/buildJobSpec";

describe("T1 two-round negotiation flow", () => {
  beforeEach(() => {
    resetContainerForTests();
  });

  it("round 2 produces audit event with priceAfter less than priceBefore", async () => {
    const container = createContainer();
    const draft = buildJobSpec(
      { sqft: 2000, bedrooms: 3, bathrooms: 2, pets: true },
      { leverageQuoteAmount: 185 },
      {
        geo: "Austin, TX",
        jobType: "recurring_weekly",
        frequency: "weekly",
      },
    );
    const jobSpec = await container.repos.jobSpecs.create(draft);
    await container.repos.jobSpecs.confirm(jobSpec.id);

    const result = await container.callOrchestrator.runFullNegotiation(jobSpec.id);
    expect(result.callIds.length).toBeGreaterThanOrEqual(3);

    const audits = await container.listAuditByJobSpec(jobSpec.id);
    const priceMoves = audits.filter(
      (event) =>
        event.priceBefore !== null &&
        event.priceAfter !== null &&
        event.priceAfter < event.priceBefore,
    );
    expect(priceMoves.length).toBeGreaterThanOrEqual(1);

    const report = await container.reportComposer.compose(jobSpec.id);
    expect(report.recommendedQuoteId).toBeTruthy();
    expect(report.rankedQuotes.length).toBeGreaterThanOrEqual(3);
  });
});

