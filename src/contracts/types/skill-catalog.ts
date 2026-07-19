import type { Skill } from "./skill";

export type SkillCategory =
  | "fee_challenges"
  | "commitment_leverage"
  | "market_leverage"
  | "clarification"
  | "trust_verification"
  | "timing_flexibility";

export interface CatalogSkill extends Skill {
  category: SkillCategory;
  avoidWhen?: string;
}
