import feeChallenges from "../../../config/skills/catalog/fee_challenges.json";
import commitmentLeverage from "../../../config/skills/catalog/commitment_leverage.json";
import marketLeverage from "../../../config/skills/catalog/market_leverage.json";
import clarification from "../../../config/skills/catalog/clarification.json";
import trustVerification from "../../../config/skills/catalog/trust_verification.json";
import timingFlexibility from "../../../config/skills/catalog/timing_flexibility.json";
import { loadHomeCleaningSkills } from "./loadSkills";
import type { CatalogSkill, SkillCategory } from "./catalogTypes";
import { validateCatalog } from "./validateCatalog";

const seedCategories: Record<string, SkillCategory> = {
  leverage_competing_bid: "market_leverage", challenge_trip_fee: "fee_challenges", challenge_first_clean_premium: "fee_challenges", challenge_supplies_fee: "fee_challenges", challenge_weekend_surcharge: "fee_challenges", ask_recurring_discount: "commitment_leverage", ask_bundle_discount: "commitment_leverage", clarify_pricing_model: "clarification", confirm_insurance_guarantee: "trust_verification", negotiate_minimum_hours: "fee_challenges", request_all_in_total: "clarification", waive_cancellation_fee: "fee_challenges",
};

const catalogSkills = [...feeChallenges, ...commitmentLeverage, ...marketLeverage, ...clarification, ...trustVerification, ...timingFlexibility] as CatalogSkill[];

export function loadSkillCatalog(): CatalogSkill[] {
  const seeds = loadHomeCleaningSkills().map((skill) => ({
    ...skill,
    selectionSignals: skill.selectionSignals.map((signal) => signal.toLowerCase()),
    category: seedCategories[skill.id]!,
  }));
  const skills = [...seeds, ...catalogSkills];
  const violations = validateCatalog(skills);
  if (violations.length > 0) throw new Error(`Invalid skill catalog: ${violations.map((violation) => violation.rule).join(", ")}`);
  return skills;
}

export function loadSkillsByCategory(category: SkillCategory): CatalogSkill[] {
  return loadSkillCatalog().filter((skill) => skill.category === category);
}
