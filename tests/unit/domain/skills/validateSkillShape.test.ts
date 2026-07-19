import { describe, expect, it } from "vitest";
import { validateGeneratedSkill } from "@/domain/skills/validateSkillShape";

describe("validateGeneratedSkill", () => {
  it("accepts an honest categorized skill", () => {
    expect(validateGeneratedSkill({ id: "ask_pet_fee_waiver", name: "Pet fee waiver", category: "commitment_leverage", selectionSignals: ["pet fee", "pet surcharge"], preconditions: { requiresRecurringJob: true }, moveTemplate: "Can you waive the pet fee for recurring service?" }).id).toBe("ask_pet_fee_waiver");
  });
  it("rejects dishonest competing-bid language", () => {
    expect(() => validateGeneratedSkill({ id: "ask_bad", name: "Bad skill", category: "market_leverage", selectionSignals: ["beat price", "other quote"], preconditions: {}, moveTemplate: "Can you beat their price?" })).toThrow(/honesty/);
  });
});
