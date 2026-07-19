import { NextResponse } from "next/server";
import type { CallRound, JobSpec, Quote } from "@/contracts";
import { createContainer } from "@/app/composition/createContainer";
import { handleSkillToolCall } from "@/app/webhooks/handleSkillToolCall";
import { handleTranscriptEvent } from "@/app/webhooks/handleTranscriptEvent";

type ElevenLabsWebhookBody =
  | {
      type: "skill_tool_call";
      callId: string;
      jobSpec: JobSpec;
      quotesInHand?: Quote[];
      lastVendorUtterance: string;
      priceBefore: number | null;
    }
  | {
      type: "transcript_complete";
      callId: string;
      jobSpec: JobSpec;
      vendorId: string;
      round: CallRound;
      transcript: { turns: Array<{ role: string; text: string }> };
    };

export async function POST(request: Request) {
  const body = (await request.json()) as ElevenLabsWebhookBody;
  const container = createContainer();

  if (body.type === "skill_tool_call") {
    const result = await handleSkillToolCall(container, {
      callId: body.callId,
      jobSpec: body.jobSpec,
      quotesInHand: body.quotesInHand ?? [],
      lastVendorUtterance: body.lastVendorUtterance,
      priceBefore: body.priceBefore,
    });
    return NextResponse.json(result);
  }

  if (body.type === "transcript_complete") {
    const result = await handleTranscriptEvent(container, {
      callId: body.callId,
      jobSpec: body.jobSpec,
      vendorId: body.vendorId,
      round: body.round,
      transcript: body.transcript,
    });
    if (result.kind === "fallback") {
      return NextResponse.json({
        outcome: result.outcome,
        messageId: result.messageId,
      });
    }
    return NextResponse.json({ quote: result.quote });
  }

  return NextResponse.json({ error: "unsupported event type" }, { status: 400 });
}

