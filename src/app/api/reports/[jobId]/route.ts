import { NextResponse } from "next/server";
import { createContainer } from "@/app/composition/createContainer";
import { getReportComposer } from "@/app/composition/getReportComposer";

export async function GET(_request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  try {
    const composer = createContainer().reportComposer;
    return NextResponse.json({
      report: await composer.compose(jobId),
      drilldowns: await composer.composeDrilldowns(jobId),
    });
  } catch (error) {
    try {
      const composer = await getReportComposer();
      return NextResponse.json({
        report: await composer.compose(jobId),
        drilldowns: await composer.composeDrilldowns(jobId),
      });
    } catch {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "unknown error" },
        { status: 404 },
      );
    }
  }
}
