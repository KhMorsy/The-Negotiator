import { LiveCallsScreen } from "@/frontend/screens/LiveCallsScreen";

export default async function CallsPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  return <LiveCallsScreen jobId={jobId} />;
}
