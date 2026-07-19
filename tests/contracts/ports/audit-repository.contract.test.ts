import { beforeEach, describe, expect, it } from "vitest";
import type { AuditRepository } from "@/contracts";

export function auditRepositoryContract(
  name: string,
  factory: () => AuditRepository,
) {
  describe(`AuditRepository contract: ${name}`, () => {
    let repo: AuditRepository;
    const callId = "ffffffff-ffff-4fff-8fff-ffffffffffff";

    beforeEach(() => {
      repo = factory();
    });

    it("append assigns id and ISO createdAt", async () => {
      const event = await repo.append({
        callId,
        skillId: "challenge_trip_fee",
        authorizingEvidence: { feeMentioned: "trip fee $35" },
        priceBefore: 235,
        priceAfter: null,
      });

      expect(event.id).toBeTruthy();
      expect(event.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(event.skillId).toBe("challenge_trip_fee");
    });

    it("listByCall returns events in append order", async () => {
      await repo.append({
        callId,
        skillId: "skill_a",
        authorizingEvidence: {},
        priceBefore: 200,
        priceAfter: null,
      });
      await repo.append({
        callId,
        skillId: "skill_b",
        authorizingEvidence: {},
        priceBefore: 200,
        priceAfter: 180,
      });

      const listed = await repo.listByCall(callId);
      expect(listed).toHaveLength(2);
      expect(listed[0].skillId).toBe("skill_a");
      expect(listed[1].skillId).toBe("skill_b");
    });
  });
}

import { createInMemoryAuditRepository } from "@/adapters/fake/inMemoryAuditRepository";

auditRepositoryContract("in-memory", createInMemoryAuditRepository);
