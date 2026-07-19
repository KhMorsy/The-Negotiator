import { ConfirmJobSpecScreen } from "@/frontend/screens/ConfirmJobSpecScreen";
import { mockJobSpec } from "@/frontend/mocks/fixtures";

export default async function ConfirmPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  return <ConfirmJobSpecScreen jobSpec={{ ...mockJobSpec, id: jobId }} />;
}
