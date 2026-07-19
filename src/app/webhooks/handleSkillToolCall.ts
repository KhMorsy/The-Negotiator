import type { JobSpec, Quote } from "@/contracts";
import { chooseNextSkill } from "@/domain/skills/skillEngine";
import type { AppContainer } from "./types";

export interface SkillToolCallPayload {
  callId: string;
  jobSpec: JobSpec;
  quotesInHand: Quote[];
  lastVendorUtterance: string;
  priceBefore: number | null;
}

export async function handleSkillToolCall(
  container: AppContainer,
  payload: SkillToolCallPayload,
): Promise<{
  skillId: string;
  suggestedPhrasing: string;
  eligibleSkillIds: string[];
}> {
  const result = await chooseNextSkill(
    {
      planner: container.planner,
      kb: container.kb,
      auditRepo: container.repos.audit,
    },
    {
      callId: payload.callId,
      skills: container.skills,
      context: {
        jobSpec: payload.jobSpec,
        quotesInHand: payload.quotesInHand,
      },
      lastVendorUtterance: payload.lastVendorUtterance,
      priceBefore: payload.priceBefore,
    },
  );

  return {
    skillId: result.skillId,
    suggestedPhrasing: result.suggestedPhrasing,
    eligibleSkillIds: result.eligibleSkillIds,
  };
}

