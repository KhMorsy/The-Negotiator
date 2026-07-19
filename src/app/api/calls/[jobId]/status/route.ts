import { NextResponse } from "next/server";
import { createContainer } from "@/app/composition/createContainer";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;
  const calls = await createContainer().repos.calls.listByJobSpec(jobId);
  return NextResponse.json({ calls });
}
