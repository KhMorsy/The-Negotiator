// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createInMemoryJobSpecRepository } from "@/adapters/fake/inMemoryRepos";
import { buildJobSpec } from "@/domain/jobSpec/buildJobSpec";
import { CallOrchestrator, UnconfirmedJobSpecError } from "@/app/calls/callOrchestrator";

describe("CallOrchestrator guard", () => {
  it("rejects round 1 when job spec is unconfirmed", async () => {
    const repo = createInMemoryJobSpecRepository();
    const job = await repo.create(buildJobSpec({ sqft: 1800, bedrooms: 3, bathrooms: 2 }, {}, { geo: "Austin, TX", jobType: "recurring_weekly", frequency: "weekly" }));
    await expect(new CallOrchestrator({ jobSpecRepo: repo }).startRound1(job.id)).rejects.toThrow(UnconfirmedJobSpecError);
  });
  it("allows round 1 after confirm", async () => {
    const repo = createInMemoryJobSpecRepository();
    const job = await repo.create(buildJobSpec({ sqft: 1800, bedrooms: 3, bathrooms: 2 }, {}, { geo: "Austin, TX", jobType: "recurring_weekly", frequency: "weekly" }));
    await repo.confirm(job.id);
    expect((await new CallOrchestrator({ jobSpecRepo: repo }).startRound1(job.id)).callIds).toHaveLength(3);
  });
});
