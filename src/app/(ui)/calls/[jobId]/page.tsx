import { CallsStatusScreen } from "@/frontend/screens/CallsStatusScreen";

export default async function CallsPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  return <CallsStatusScreen jobId={jobId} />;
}
