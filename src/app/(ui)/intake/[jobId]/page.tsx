import { IntakeScreen } from "@/frontend/screens/IntakeScreen";
import { mockJobSpec } from "@/frontend/mocks/fixtures";

export default async function IntakePage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  return <IntakeScreen jobSpec={{ ...mockJobSpec, id: jobId }} />;
}
