import { describe, expect, it } from "vitest";
import { filterEligibleSkills } from "@/domain/skills/filterEligibleSkills";
import { loadSkillCatalog, loadSkillsByCategory } from "@/domain/skills/loadSkillCatalog";
import type { JobSpec } from "@/contracts";

const jobSpec: JobSpec = { id: "job-1", jobType: "deep_clean", sqft: 1200, bedrooms: 2, bathrooms: 2, frequency: "once", addOns: [], suppliesProvided: false, pets: false, accessNotes: "", conditionNotes: "", geo: "Oakland, CA", confirmed: true };

describe("loadSkillCatalog", () => {
  it("merges seed and category skills without duplicates", () => {
    const skills = loadSkillCatalog();
    expect(skills.length).toBeGreaterThanOrEqual(62);
    expect(new Set(skills.map((skill) => skill.id)).size).toBe(skills.length);
    expect(loadSkillsByCategory("market_leverage").length).toBeGreaterThanOrEqual(5);
  });

  it("keeps every competing-quote skill behind the zero-quote honesty gate", () => {
    const skills = loadSkillCatalog();
    const eligible = filterEligibleSkills(skills, { jobSpec, quotesInHand: [] });
    expect(eligible.some((skill) => skill.preconditions.requiresCompetingQuote)).toBe(false);
  });
});
