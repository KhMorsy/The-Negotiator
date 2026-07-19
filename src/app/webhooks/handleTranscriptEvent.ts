import type { CallOutcome, CallRound, JobSpec, Quote } from "@/contracts";
import { handleEmailFallback } from "@/app/calls/emailFallbackHandler";
import { detectQuoteRefusal } from "@/domain/calls/detectQuoteRefusal";
import { extractQuote } from "@/domain/quotes/extractQuote";
import type { AppContainer } from "./types";

export interface TranscriptEventPayload {
  callId: string;
  jobSpec: JobSpec;
  vendorId: string;
  round: CallRound;
  transcript: { turns: Array<{ role: string; text: string }> };
  vendorName?: string;
  vendorEmail?: string;
}

export type TranscriptEventResult =
  | { kind: "quote"; quote: Quote }
  | { kind: "fallback"; outcome: CallOutcome; messageId?: string };

export async function handleTranscriptEvent(
  container: AppContainer,
  payload: TranscriptEventPayload,
): Promise<TranscriptEventResult> {
  const lastVendorUtterance =
    [...payload.transcript.turns]
      .reverse()
      .find((turn) => turn.role === "vendor" || turn.role === "agent")
      ?.text ?? "";

  const { refused } = detectQuoteRefusal(lastVendorUtterance);
  if (refused) {
    const fallback = await handleEmailFallback(
      {
        emailNotifier: container.emailNotifier,
        callRepo: container.repos.calls,
      },
      {
        callId: payload.callId,
        jobSpec: payload.jobSpec,
        vendorEmail:
          payload.vendorEmail ?? `quotes+${payload.vendorId}@example.com`,
        vendorName: payload.vendorName ?? payload.vendorId,
        lastVendorUtterance,
      },
    );
    return { kind: "fallback", ...fallback };
  }

  const quote = await extractQuote(
    {
      parser: container.parser,
      quoteRepo: container.repos.quotes,
    },
    payload,
  );
  return { kind: "quote", quote };
}
