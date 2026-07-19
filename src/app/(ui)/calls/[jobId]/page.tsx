import { CallsStatusScreen } from "@/frontend/screens/CallsStatusScreen";
import { mockVendors } from "@/frontend/mocks/fixtures";

export default async function CallsPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  return <CallsStatusScreen jobId={jobId} vendors={mockVendors} />;
}
