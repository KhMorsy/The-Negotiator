import type { Skill } from "@/contracts";
import type { SkillEligibilityContext } from "./types";

function isRecurringJob(context: SkillEligibilityContext): boolean {
  return (
    context.jobSpec.frequency !== "once" ||
    context.jobSpec.jobType.startsWith("recurring_")
  );
}

function realQuoteCount(context: SkillEligibilityContext): number {
  return context.quotesInHand.filter((quote) => quote.normalizedTotal > 0).length;
}

export function filterEligibleSkills(
  skills: Skill[],
  context: SkillEligibilityContext,
): Skill[] {
  const quotesInHand = realQuoteCount(context);

  return skills.filter((skill) => {
    const preconditions = skill.preconditions;

    if (preconditions.requiresCompetingQuote && quotesInHand === 0) {
      return false;
    }

    if (preconditions.requiresRecurringJob && !isRecurringJob(context)) {
      return false;
    }

    return (
      preconditions.minQuotesInHand == null ||
      quotesInHand >= preconditions.minQuotesInHand
    );
  });
}
