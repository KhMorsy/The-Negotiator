import { NextResponse } from "next/server";
import { createCopilotSession } from "@/app/copilot/assistedCallCopilot";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    jobSpecId?: string;
    customerPhone?: string;
  };
  if (!body.jobSpecId || !body.customerPhone) {
    return NextResponse.json(
      { error: "jobSpecId and customerPhone required" },
      { status: 400 },
    );
  }

  const session = await createCopilotSession({
    jobSpecId: body.jobSpecId,
    customerPhone: body.customerPhone,
  });
  return NextResponse.json(session);
}
