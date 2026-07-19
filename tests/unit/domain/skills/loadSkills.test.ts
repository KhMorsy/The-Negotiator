import { describe, expect, it } from "vitest";
import { loadHomeCleaningSkills } from "@/domain/skills/loadSkills";

describe("loadHomeCleaningSkills", () => {
  it("loads 12 skills including leverage_competing_bid", () => {
    const skills = loadHomeCleaningSkills();

    expect(skills).toHaveLength(12);
    const leverage = skills.find((skill) => skill.id === "leverage_competing_bid");
    expect(leverage).toBeDefined();
    expect(leverage?.preconditions.requiresCompetingQuote).toBe(true);
  });
});
