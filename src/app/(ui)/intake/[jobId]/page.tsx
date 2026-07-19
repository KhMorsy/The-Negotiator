import { IntakeScreen } from "@/frontend/screens/IntakeScreen";

export default async function IntakePage({
  params,
  searchParams,
}: {
  params: Promise<{ jobId: string }>;
  searchParams: Promise<{ session?: string }>;
}) {
  const { jobId } = await params;
  const { session } = await searchParams;
  return <IntakeScreen jobId={jobId} sessionId={session} />;
}
