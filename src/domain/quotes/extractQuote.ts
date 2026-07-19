import type {
  CallRound,
  JobSpec,
  LLMParser,
  Quote,
  QuoteRepository,
} from "@/contracts";

export interface ExtractQuoteInput {
  callId: string;
  jobSpec: JobSpec;
  vendorId: string;
  round: CallRound;
  transcript: { turns: Array<{ role: string; text: string }> };
}

export interface ExtractQuoteDeps {
  parser: LLMParser;
  quoteRepo: QuoteRepository;
}

export async function extractQuote(
  deps: ExtractQuoteDeps,
  input: ExtractQuoteInput,
): Promise<Quote> {
  const parsed = await deps.parser.extractQuoteFromTranscript({
    transcript: input.transcript,
    jobSpec: input.jobSpec,
  });

  return deps.quoteRepo.create({
    callId: input.callId,
    jobSpecId: input.jobSpec.id,
    vendorId: input.vendorId,
    basePrice: parsed.basePrice,
    normalizedTotal: parsed.normalizedTotal,
    pricingModel: parsed.pricingModel,
    redFlag: parsed.redFlag,
    round: input.round,
    fees: parsed.fees,
  });
}

