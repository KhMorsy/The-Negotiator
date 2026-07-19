import { describe, expect, it } from "vitest";
import { appendAuditEvent } from "@/domain/audit/appendAuditEvent";
import { createInMemoryAuditRepository } from "@/adapters/fake/inMemoryAuditRepository";

describe("appendAuditEvent", () => {
  it("delegates to AuditRepository.append", async () => {
    const repo = createInMemoryAuditRepository();

    const event = await appendAuditEvent(repo, {
      callId: "call-1",
      skillId: "challenge_trip_fee",
      authorizingEvidence: { utterance: "trip fee $35" },
      priceBefore: 235,
      priceAfter: null,
    });

    expect(event.skillId).toBe("challenge_trip_fee");
    await expect(repo.listByCall("call-1")).resolves.toHaveLength(1);
  });
});
