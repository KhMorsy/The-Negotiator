import { ConfirmJobSpecScreen } from "@/frontend/screens/ConfirmJobSpecScreen";

export default async function ConfirmPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  return <ConfirmJobSpecScreen jobId={jobId} />;
}
