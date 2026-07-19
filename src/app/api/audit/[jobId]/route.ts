import { NextResponse } from "next/server";
import { createContainer } from "@/app/composition/createContainer";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;
  const auditEvents = await createContainer().listAuditByJobSpec(jobId);
  return NextResponse.json({ auditEvents });
}

