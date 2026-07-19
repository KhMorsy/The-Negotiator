import { NextResponse } from "next/server";
import { createContainer } from "@/app/composition/createContainer";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;

  try {
    const result = await createContainer().callOrchestrator.runFullNegotiation(jobId);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    const status = message.includes("confirmed") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

