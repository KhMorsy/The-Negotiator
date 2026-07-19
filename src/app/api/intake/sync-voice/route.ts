import { NextResponse } from "next/server";
import { createContainer } from "@/app/composition/createContainer";

export async function POST(request: Request) {
  const { jobSpecId, sessionId } = (await request.json()) as {
    jobSpecId: string;
    sessionId: string;
  };
  const jobSpec = await createContainer().intakeOrchestrator.syncVoiceTranscript(
    jobSpecId,
    sessionId,
  );
  return NextResponse.json({ jobSpec });
}

