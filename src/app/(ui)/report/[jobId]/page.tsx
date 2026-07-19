import { ReportScreen } from "@/frontend/screens/ReportScreen";

export default async function ReportPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  return <ReportScreen jobId={jobId} />;
}
