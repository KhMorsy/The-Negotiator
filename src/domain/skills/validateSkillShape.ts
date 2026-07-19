import { CatalogSkillSchema } from "@/contracts";
import type { CatalogSkill } from "@/contracts";
import { loadSkillCatalog } from "./loadSkillCatalog";
import { validateCatalog } from "./validateCatalog";

export function validateGeneratedSkill(input: unknown): CatalogSkill {
  const skill = CatalogSkillSchema.parse(input) as CatalogSkill;
  const violations = validateCatalog([...loadSkillCatalog(), skill]);
  if (violations.length > 0) {
    throw new Error(`Generated skill violates ${violations.map((violation) => violation.rule).join(", ")}`);
  }
  return skill;
}
