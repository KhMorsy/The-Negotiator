import { describe, expect, it, vi } from "vitest";
import { chooseNextSkill } from "@/domain/skills/skillEngine";
import { loadHomeCleaningSkills } from "@/domain/skills/loadSkills";
import { createInMemoryAuditRepository } from "@/adapters/fake/inMemoryAuditRepository";
import type { JobSpec, KnowledgeBase, LLMPlanner, Quote } from "@/contracts";

const jobSpec: JobSpec = {
  id: "job-1",
  jobType: "deep_clean",
  sqft: 1200,
  bedrooms: 2,
  bathrooms: 2,
  frequency: "once",
  addOns: [],
  suppliesProvided: false,
  pets: false,
  accessNotes: "",
  conditionNotes: "",
  geo: "Oakland, CA",
  confirmed: true,
};

function createKnowledgeBase(): KnowledgeBase {
  return {
    retrieve: vi.fn(async () => [
      { id: "kb-1", text: "Average deep clean $0.20/sqft", score: 0.9 },
    ]),
  };
}

describe("chooseNextSkill", () => {
  it("never plans leverage_competing_bid without quotes in hand", async () => {
    const planner: LLMPlanner = {
      chooseSkill: vi.fn(async ({ eligibleSkills }) => ({
        skillId: eligibleSkills[0]!.id,
        suggestedPhrasing: "test phrasing",
      })),
    };

    const result = await chooseNextSkill(
      { planner, kb: createKnowledgeBase(), auditRepo: createInMemoryAuditRepository() },
      {
        callId: "call-1",
        skills: loadHomeCleaningSkills(),
        context: { jobSpec, quotesInHand: [] },
        lastVendorUtterance: "Our price is $280 plus trip fee",
        priceBefore: 280,
      },
    );

    expect(result.eligibleSkillIds).not.toContain("leverage_competing_bid");
    expect(result.auditEvent.skillId).toBe(result.skillId);
    expect(result.auditEvent.authorizingEvidence).toMatchObject({
      eligibleSkillIds: result.eligibleSkillIds,
    });
  });

  it("allows leverage_competing_bid when a competing quote exists", async () => {
    const quote: Quote = {
      id: "q-1",
      callId: "call-2",
      jobSpecId: jobSpec.id,
      vendorId: "v-other",
      basePrice: 200,
      normalizedTotal: 240,
      pricingModel: "flat",
      fees: [],
      redFlag: false,
      round: 1,
    };
    const planner: LLMPlanner = {
      chooseSkill: vi.fn(async () => ({
        skillId: "leverage_competing_bid",
        suggestedPhrasing: "I have a written quote at $240 all-in.",
      })),
    };

    const result = await chooseNextSkill(
      { planner, kb: createKnowledgeBase(), auditRepo: createInMemoryAuditRepository() },
      {
        callId: "call-2",
        skills: loadHomeCleaningSkills(),
        context: { jobSpec, quotesInHand: [quote] },
        lastVendorUtterance: "We charge $280",
        priceBefore: 280,
      },
    );

    expect(result.skillId).toBe("leverage_competing_bid");
    expect(result.eligibleSkillIds).toContain("leverage_competing_bid");
  });

  it("rejects a planner-selected leverage skill without a real quote", async () => {
    const planner: LLMPlanner = {
      chooseSkill: vi.fn(async () => ({
        skillId: "leverage_competing_bid",
        suggestedPhrasing: "I have another bid.",
      })),
    };

    await expect(
      chooseNextSkill(
        { planner, kb: createKnowledgeBase(), auditRepo: createInMemoryAuditRepository() },
        {
          callId: "call-3",
          skills: loadHomeCleaningSkills(),
          context: { jobSpec, quotesInHand: [] },
          lastVendorUtterance: "We charge $280",
          priceBefore: 280,
        },
      ),
    ).rejects.toThrow("Planner selected an ineligible skill");
  });
});
