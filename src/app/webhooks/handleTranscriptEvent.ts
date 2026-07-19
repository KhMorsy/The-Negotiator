import type { CallRound, JobSpec, Quote } from "@/contracts";
import { extractQuote } from "@/domain/quotes/extractQuote";
import type { AppContainer } from "./types";

export interface TranscriptEventPayload {
  callId: string;
  jobSpec: JobSpec;
  vendorId: string;
  round: CallRound;
  transcript: { turns: Array<{ role: string; text: string }> };
}

export async function handleTranscriptEvent(
  container: AppContainer,
  payload: TranscriptEventPayload,
): Promise<Quote> {
  return extractQuote(
    {
      parser: container.parser,
      quoteRepo: container.repos.quotes,
    },
    payload,
  );
}

