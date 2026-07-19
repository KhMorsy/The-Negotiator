import { beforeEach, describe, expect, it } from "vitest";
import type { JobSpecRepository } from "@/contracts";
import { sampleJobSpecDraft } from "./_fixtures/jobSpecFixtures";

export function jobSpecRepositoryContract(
  name: string,
  factory: () => JobSpecRepository,
) {
  describe(`JobSpecRepository contract: ${name}`, () => {
    let repo: JobSpecRepository;

    beforeEach(() => {
      repo = factory();
    });

    it("create assigns id and confirmed=false", async () => {
      const created = await repo.create(sampleJobSpecDraft);
      expect(created.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      expect(created.confirmed).toBe(false);
      expect(created.sqft).toBe(1200);
    });

    it("getById returns null for missing id", async () => {
      const found = await repo.getById("00000000-0000-4000-8000-000000000000");
      expect(found).toBeNull();
    });

    it("confirm sets confirmed=true", async () => {
      const created = await repo.create(sampleJobSpecDraft);
      const confirmed = await repo.confirm(created.id);
      expect(confirmed.confirmed).toBe(true);
      const reloaded = await repo.getById(created.id);
      expect(reloaded?.confirmed).toBe(true);
    });

    it("updateDraft merges patch", async () => {
      const created = await repo.create(sampleJobSpecDraft);
      const updated = await repo.updateDraft(created.id, { sqft: 1400 });
      expect(updated.sqft).toBe(1400);
      expect(updated.bedrooms).toBe(2);
    });
  });
}

import { createInMemoryJobSpecRepository } from "@/adapters/fake/inMemoryJobSpecRepository";

jobSpecRepositoryContract("in-memory", createInMemoryJobSpecRepository);

