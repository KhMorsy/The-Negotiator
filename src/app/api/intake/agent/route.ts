import { NextResponse } from "next/server";

export async function GET() {
  if (
    process.env.USE_SIMULATED_SPEECH !== "false" ||
    !process.env.ELEVENLABS_AGENT_ID
  ) {
    return NextResponse.json({ error: "Live voice interview is unavailable" }, { status: 409 });
  }

  return NextResponse.json({ agentId: process.env.ELEVENLABS_AGENT_ID });
}
