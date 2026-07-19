import type { JobSpec, Quote } from "@/contracts";

export interface SkillEligibilityContext {
  jobSpec: JobSpec;
  quotesInHand: Quote[];
}
