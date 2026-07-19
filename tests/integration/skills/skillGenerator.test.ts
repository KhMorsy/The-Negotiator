import { describe, expect, it } from "vitest";
import { generateSkillFromAsk } from "@/app/skills/skillGenerator";
import type { JobSpec, SkillRepository } from "@/contracts";

const jobSpec: JobSpec = { id: "job-1", jobType: "recurring_weekly", sqft: 1200, bedrooms: 2, bathrooms: 2, frequency: "weekly", addOns: [], suppliesProvided: false, pets: true, accessNotes: "", conditionNotes: "", geo: "Austin, TX", confirmed: true };

describe("generateSkillFromAsk", () => {
  it("validates and persists a generated catalog skill", async () => {
    let saved = false;
    const repo: SkillRepository = { listGenerated: async () => [], saveGenerated: async (skill) => { saved = true; return skill; } };
    const planner = { chooseSkill: async () => ({ skillId: "ask_pet_fee_waiver", suggestedPhrasing: JSON.stringify({ id: "ask_pet_fee_waiver", name: "Pet fee waiver", category: "commitment_leverage", selectionSignals: ["pet fee", "pet surcharge"], preconditions: { requiresRecurringJob: true }, moveTemplate: "Can you waive the pet fee for recurring service?" }) }) };
    await expect(generateSkillFromAsk({ planner, skillRepo: repo }, { customerAsk: "Can you waive the pet fee?", jobSpec })).resolves.toMatchObject({ id: "ask_pet_fee_waiver" });
    expect(saved).toBe(true);
  });
});
