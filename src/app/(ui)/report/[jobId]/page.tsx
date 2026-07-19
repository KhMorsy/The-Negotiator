import { ReportScreen } from "@/frontend/screens/ReportScreen";
import { mockReportPrimary } from "@/frontend/mocks/fixtures";

export default async function ReportPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  return <ReportScreen report={{ ...mockReportPrimary, jobSpecId: jobId }} />;
}
