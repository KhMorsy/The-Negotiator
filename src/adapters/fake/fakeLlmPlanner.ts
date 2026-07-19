import type { LLMPlanner } from "@/contracts";

export function createFakeLlmPlanner(pickSkillId?: string): LLMPlanner {
  return {
    async chooseSkill({ eligibleSkills }) {
      const skillId = pickSkillId ?? eligibleSkills[0]!.id;
      return {
        skillId,
        suggestedPhrasing: `Applying skill ${skillId}`,
      };
    },
  };
}

