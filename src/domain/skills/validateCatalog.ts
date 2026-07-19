import type { CatalogSkill, SkillCategory } from "./catalogTypes";

export interface CatalogViolation {
  skillId: string;
  rule: string;
  message: string;
}

const categories: SkillCategory[] = ["fee_challenges", "commitment_leverage", "market_leverage", "clarification", "trust_verification", "timing_flexibility"];
const idPattern = /^(challenge|ask|leverage|clarify|confirm|negotiate|request|waive)_[a-z0-9_]+$/;
const allowedVariables = new Set(["competingTotal", "targetTotal", "frequency", "jobType", "feeAmount", "feeType"]);
const leveragePattern = /quote|competing|other (company|cleaner)|beat|match.*price/i;

export function validateCatalog(skills: CatalogSkill[]): CatalogViolation[] {
  const violations: CatalogViolation[] = [];
  const ids = new Set<string>();
  const categoryCounts = new Map<SkillCategory, number>();

  for (const skill of skills) {
    categoryCounts.set(skill.category, (categoryCounts.get(skill.category) ?? 0) + 1);
    if (ids.has(skill.id)) violations.push({ skillId: skill.id, rule: "ids/unique", message: "Skill ids must be unique." });
    ids.add(skill.id);
    if (!idPattern.test(skill.id)) violations.push({ skillId: skill.id, rule: "ids/format", message: "Skill id must be snake_case and verb-first." });
    if (leveragePattern.test(skill.moveTemplate) && !skill.preconditions.requiresCompetingQuote) violations.push({ skillId: skill.id, rule: "honesty/leverage-requires-quote", message: "Leverage language requires a real competing quote." });
    if (skill.moveTemplate.length > 200 || (skill.moveTemplate.match(/[.!?]/g) ?? []).length > 1) violations.push({ skillId: skill.id, rule: "move-template/single-sentence-max-length", message: "Move template must be one sentence of 200 characters or fewer." });
    const variables = [...skill.moveTemplate.matchAll(/{{([^}]+)}}/g)].map((match) => match[1]);
    if (variables.some((variable) => !allowedVariables.has(variable))) violations.push({ skillId: skill.id, rule: "template-variables/allowed-set", message: "Move template contains an unknown variable." });
    const signals = skill.selectionSignals;
    if (signals.length < 2 || signals.length > 6 || signals.some((signal) => signal !== signal.toLowerCase()) || new Set(signals).size !== signals.length) violations.push({ skillId: skill.id, rule: "selection-signals/valid", message: "Signals must be 2–6 unique lowercase phrases." });
    if (skill.preconditions.requiresRecurringJob && skill.category !== "commitment_leverage" && skill.category !== "timing_flexibility") violations.push({ skillId: skill.id, rule: "recurring/category", message: "Recurring-only skills belong in commitment_leverage or timing_flexibility." });
  }

  if (skills.length < 50) violations.push({ skillId: "catalog", rule: "catalog/minimum-total", message: "Catalog needs at least 50 skills." });
  for (const category of categories) if ((categoryCounts.get(category) ?? 0) < 5) violations.push({ skillId: category, rule: "category/minimum-balance", message: "Each category needs at least five skills." });
  return violations;
}
