import { describe, expect, it } from "vitest";
import { createTestContainer } from "@/app/composition/createTestContainer";
import { handleSkillToolCall } from "@/app/webhooks/handleSkillToolCall";
import type { JobSpec } from "@/contracts";

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

describe("handleSkillToolCall", () => {
  it("returns planner move and writes audit event", async () => {
    const container = createTestContainer();

    const result = await handleSkillToolCall(container, {
      callId: "call-1",
      jobSpec,
      quotesInHand: [],
      lastVendorUtterance: "Trip fee is $35",
      priceBefore: 235,
    });

    expect(result.skillId).toBeTruthy();
    expect(result.suggestedPhrasing).toContain(result.skillId);
    expect(result.eligibleSkillIds).not.toContain("leverage_competing_bid");

    const audit = await container.repos.audit.listByCall("call-1");
    expect(audit).toHaveLength(1);
    expect(audit[0].skillId).toBe(result.skillId);
  });
});

