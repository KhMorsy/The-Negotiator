import { appendAuditEvent } from "@/domain/audit/appendAuditEvent";
import type {
  AuditEvent,
  AuditRepository,
  KnowledgeBase,
  LLMPlanner,
  Skill,
} from "@/contracts";
import { filterEligibleSkills } from "./filterEligibleSkills";
import type { SkillEligibilityContext } from "./types";

export interface SkillEngineInput {
  callId: string;
  skills: Skill[];
  context: SkillEligibilityContext;
  lastVendorUtterance: string;
  priceBefore: number | null;
  priceAfter?: number | null;
  kbQuery?: string;
}

export interface SkillEngineDeps {
  planner: LLMPlanner;
  kb: KnowledgeBase;
  auditRepo: AuditRepository;
}

export async function chooseNextSkill(
  deps: SkillEngineDeps,
  input: SkillEngineInput,
): Promise<{
  skillId: string;
  suggestedPhrasing: string;
  eligibleSkillIds: string[];
  auditEvent: AuditEvent;
}> {
  const eligibleSkills = filterEligibleSkills(input.skills, input.context);
  const eligibleSkillIds = eligibleSkills.map((skill) => skill.id);

  if (eligibleSkills.length === 0) {
    throw new Error("No eligible skills after honesty gate");
  }

  const kbSnippets = await deps.kb.retrieve({
    query:
      input.kbQuery ??
      `${input.lastVendorUtterance} ${input.context.jobSpec.jobType} ${input.context.jobSpec.geo}`,
    topK: 5,
  });
  const plan = await deps.planner.chooseSkill({
    eligibleSkills,
    context: {
      jobSpec: input.context.jobSpec,
      quotesInHand: input.context.quotesInHand,
      lastVendorUtterance: input.lastVendorUtterance,
    },
    kbSnippets: kbSnippets.map((snippet) => snippet.text),
  });

  if (!eligibleSkillIds.includes(plan.skillId)) {
    throw new Error("Planner selected an ineligible skill");
  }

  const auditEvent = await appendAuditEvent(deps.auditRepo, {
    callId: input.callId,
    skillId: plan.skillId,
    authorizingEvidence: {
      eligibleSkillIds,
      kbSnippetIds: kbSnippets.map((snippet) => snippet.id),
      lastVendorUtterance: input.lastVendorUtterance,
      quotesInHand: input.context.quotesInHand.map((quote) => ({
        quoteId: quote.id,
        normalizedTotal: quote.normalizedTotal,
      })),
    },
    priceBefore: input.priceBefore,
    priceAfter: input.priceAfter ?? null,
  });

  return {
    skillId: plan.skillId,
    suggestedPhrasing: plan.suggestedPhrasing,
    eligibleSkillIds,
    auditEvent,
  };
}
