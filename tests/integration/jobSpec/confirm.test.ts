// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import { resetJobSpecRepositoryForTests } from "@/app/composition/jobSpecRepository";
import { buildJobSpec } from "@/domain/jobSpec/buildJobSpec";
import { POST } from "@/app/api/job-specs/[id]/confirm/route";

describe("job spec confirm flow", () => {
  let jobSpecId: string;
  beforeEach(async () => {
    const repo = resetJobSpecRepositoryForTests();
    const draft = buildJobSpec(
      { sqft: 1800, bedrooms: 3, bathrooms: 2 },
      { leverageQuoteAmount: 185 },
      { geo: "Austin, TX", jobType: "recurring_weekly", frequency: "weekly" },
    );
    jobSpecId = (await repo.create(draft)).id;
  });

  it("confirm sets confirmed true", async () => {
    const response = await POST(new Request(`http://localhost/api/job-specs/${jobSpecId}/confirm`, { method: "POST" }), {
      params: Promise.resolve({ id: jobSpecId }),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ jobSpec: { confirmed: true, leverageQuoteAmount: 185 } });
  });
});
