import { NextResponse } from "next/server";
import { createContainer } from "@/app/composition/createContainer";
import { getReportComposer } from "@/app/composition/getReportComposer";

export async function GET(_request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  try {
    return NextResponse.json({
      report: await createContainer().reportComposer.compose(jobId),
    });
  } catch (error) {
    try {
      return NextResponse.json({ report: await (await getReportComposer()).compose(jobId) });
    } catch {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "unknown error" },
        { status: 404 },
      );
    }
  }
}
