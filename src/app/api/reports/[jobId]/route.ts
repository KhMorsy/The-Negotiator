import { NextResponse } from "next/server";
import { getReportComposer } from "@/app/composition/getReportComposer";

export async function GET(_request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  try {
    return NextResponse.json({ report: await (await getReportComposer()).compose((await params).jobId) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "unknown error" }, { status: 404 });
  }
}
