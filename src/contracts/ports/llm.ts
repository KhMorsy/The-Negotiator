import type { JobSpec, Quote, QuoteFee, Skill } from "../types";

export interface LLMPlanner {
  chooseSkill(input: {
    eligibleSkills: Skill[];
    context: {
      jobSpec: JobSpec;
      quotesInHand: Quote[];
      lastVendorUtterance: string;
    };
    kbSnippets: string[];
  }): Promise<{ skillId: string; suggestedPhrasing: string }>;
}

export interface LLMParser {
  extractQuoteFromTranscript(input: {
    transcript: { turns: Array<{ role: string; text: string }> };
    jobSpec: JobSpec;
  }): Promise<
    Omit<Quote, "id" | "callId"> & {
      fees: Omit<QuoteFee, "id" | "quoteId">[];
    }
  >;
}

