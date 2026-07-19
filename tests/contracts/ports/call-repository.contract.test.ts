import { beforeEach, describe, expect, it } from "vitest";
import type { CallRepository } from "@/contracts";

export function callRepositoryContract(
  name: string,
  factory: () => CallRepository,
) {
  describe(`CallRepository contract: ${name}`, () => {
    let repo: CallRepository;
    const jobSpecId = "11111111-1111-4111-8111-111111111111";
    const vendorId = "22222222-2222-4222-8222-222222222222";

    beforeEach(() => {
      repo = factory();
    });

    it("create returns call with null outcome", async () => {
      const call = await repo.create({ jobSpecId, vendorId, round: 1 });
      expect(call.id).toBeTruthy();
      expect(call.jobSpecId).toBe(jobSpecId);
      expect(call.vendorId).toBe(vendorId);
      expect(call.round).toBe(1);
      expect(call.outcome).toBeNull();
      expect(call.recordingUrl).toBeNull();
    });

    it("updateOutcome persists outcome", async () => {
      const call = await repo.create({ jobSpecId, vendorId, round: 1 });
      const updated = await repo.updateOutcome(call.id, "itemized_quote");
      expect(updated.outcome).toBe("itemized_quote");
    });

    it("listByJobSpec returns calls for job", async () => {
      await repo.create({ jobSpecId, vendorId, round: 1 });
      await repo.create({ jobSpecId, vendorId, round: 2 });
      const other = await repo.create({
        jobSpecId: "33333333-3333-4333-8333-333333333333",
        vendorId,
        round: 1,
      });
      expect(other.jobSpecId).not.toBe(jobSpecId);
      const listed = await repo.listByJobSpec(jobSpecId);
      expect(listed).toHaveLength(2);
    });
  });
}

import { createInMemoryCallRepository } from "@/adapters/fake/inMemoryCallRepository";

callRepositoryContract("in-memory", createInMemoryCallRepository);

