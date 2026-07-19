// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import {
  createContainer,
  resetContainerForTests,
} from "@/app/composition/createContainer";
import { buildJobSpec } from "@/domain/jobSpec/buildJobSpec";
import { GET } from "@/app/api/calls/[jobId]/status/route";

describe("GET /api/calls/[jobId]/status", () => {
  beforeEach(() => resetContainerForTests());

  it("returns persisted call rows for a job", async () => {
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
    await container.callOrchestrator.startRound1(job.id);

    const response = await GET(new Request("http://localhost/api/calls/status"), {
      params: Promise.resolve({ jobId: job.id }),
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as { calls: Array<Record<string, unknown>> };
    expect(body.calls).toHaveLength(3);
    expect(body.calls[0]).toMatchObject({ jobSpecId: job.id, round: 1 });
  });
});
