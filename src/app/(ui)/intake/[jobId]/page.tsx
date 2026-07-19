import { LiveIntakeScreen } from "@/app/composition/LiveIntakeScreen";

export default async function IntakePage({
  params,
  searchParams,
}: {
  params: Promise<{ jobId: string }>;
  searchParams: Promise<{ session?: string }>;
}) {
  const { jobId } = await params;
  const { session } = await searchParams;
  return <LiveIntakeScreen jobId={jobId} sessionId={session} />;
}
