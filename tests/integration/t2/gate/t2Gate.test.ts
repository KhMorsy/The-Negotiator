import { beforeEach, describe, expect, it } from "vitest";
import {
  createContainer,
  resetContainerForTests,
} from "@/app/composition/createContainer";
import { buildJobSpec } from "@/domain/jobSpec/buildJobSpec";

describe("T2 integration gate — simulated path", () => {
  beforeEach(() => {
    resetContainerForTests();
    process.env.USE_SIMULATED_SPEECH = "true";
    process.env.USE_SIMULATED_TELEPHONY = "true";
  });

  it("G1: defaults to fake speech and simulated telephony", () => {
    const container = createContainer();

    expect(container.speechAgentKind).toBe("fake");
    expect(container.telephonyKind).toBe("simulated");
  });

  it("G2: produces a report, drilldowns, and persisted call rows", async () => {
    const container = createContainer();
    const job = await createConfirmedJob(container, 2000);

    await container.callOrchestrator.runFullNegotiation(job.id);
    const [report, drilldowns, calls] = await Promise.all([
      container.reportComposer.compose(job.id),
      container.reportComposer.composeDrilldowns(job.id),
      container.repos.calls.listByJobSpec(job.id),
    ]);

    expect(report.rankedQuotes.length).toBeGreaterThanOrEqual(3);
    expect(drilldowns.savings?.negotiatedTotal).toBeLessThanOrEqual(
      drilldowns.savings?.initialTotal ?? Infinity,
    );
    expect(calls.length).toBeGreaterThanOrEqual(3);
  });

  it("G3: records at least one round-two price movement", async () => {
    const container = createContainer();
    const job = await createConfirmedJob(container, 1800);

    await container.callOrchestrator.runFullNegotiation(job.id);
    const auditEvents = await container.listAuditByJobSpec(job.id);

    expect(
      auditEvents.some(
        (event) =>
          event.priceBefore !== null &&
          event.priceAfter !== null &&
          event.priceAfter < event.priceBefore,
      ),
    ).toBe(true);
  });
});

async function createConfirmedJob(
  container: ReturnType<typeof createContainer>,
  sqft: number,
) {
  const draft = buildJobSpec(
    { sqft, bedrooms: 3, bathrooms: 2, pets: true },
    { leverageQuoteAmount: 185 },
    {
      geo: "Austin, TX",
      jobType: "recurring_weekly",
      frequency: "weekly",
    },
  );
  const job = await container.repos.jobSpecs.create(draft);
  return container.repos.jobSpecs.confirm(job.id);
}
