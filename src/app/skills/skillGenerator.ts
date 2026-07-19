import type { CatalogSkill, JobSpec, LLMPlanner, SkillRepository } from "@/contracts";
import { loadSkillCatalog } from "@/domain/skills/loadSkillCatalog";
import { validateGeneratedSkill } from "@/domain/skills/validateSkillShape";

export async function generateSkillFromAsk(
  deps: { planner: LLMPlanner; skillRepo: SkillRepository },
  input: { customerAsk: string; jobSpec: JobSpec },
): Promise<CatalogSkill> {
  const plan = await deps.planner.chooseSkill({
    eligibleSkills: loadSkillCatalog(),
    context: { jobSpec: input.jobSpec, quotesInHand: [], lastVendorUtterance: input.customerAsk },
    kbSnippets: [`Customer ask: ${input.customerAsk}`, "Return JSON for a NEW categorized skill with honest preconditions."],
  });
  return deps.skillRepo.saveGenerated(validateGeneratedSkill(JSON.parse(plan.suggestedPhrasing)));
}
