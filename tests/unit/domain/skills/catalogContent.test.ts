import { describe, expect, it } from "vitest";
import feeChallenges from "@/../config/skills/catalog/fee_challenges.json";
import commitmentLeverage from "@/../config/skills/catalog/commitment_leverage.json";
import marketLeverage from "@/../config/skills/catalog/market_leverage.json";
import clarification from "@/../config/skills/catalog/clarification.json";
import trustVerification from "@/../config/skills/catalog/trust_verification.json";
import timingFlexibility from "@/../config/skills/catalog/timing_flexibility.json";
import { loadHomeCleaningSkills } from "@/domain/skills/loadSkills";
import type { CatalogSkill } from "@/domain/skills/catalogTypes";
import { validateCatalog } from "@/domain/skills/validateCatalog";

const catalog = [
  ...feeChallenges,
  ...commitmentLeverage,
  ...marketLeverage,
  ...clarification,
  ...trustVerification,
  ...timingFlexibility,
] as CatalogSkill[];

describe("home-cleaning skill catalog", () => {
  it("is valid, balanced, and distinct from the seed library", () => {
    expect(validateCatalog(catalog)).toEqual([]);
    expect(catalog.length).toBeGreaterThanOrEqual(50);
    for (const category of ["fee_challenges", "commitment_leverage", "market_leverage", "clarification", "trust_verification", "timing_flexibility"]) {
      expect(catalog.filter((skill) => skill.category === category)).toHaveLength(9);
    }
    const seedIds = new Set(loadHomeCleaningSkills().map((skill) => skill.id));
    expect(catalog.every((skill) => !seedIds.has(skill.id))).toBe(true);
  });
});
