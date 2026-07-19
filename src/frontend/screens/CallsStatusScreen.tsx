import type { Vendor } from "@/contracts";

export function CallsStatusScreen({
  jobId,
  vendors,
}: {
  jobId: string;
  vendors: Vendor[];
}) {
  return (
    <section className="space-y-6" data-testid="calls-screen">
      <h1 className="text-2xl font-semibold">Live call status</h1>
      <p className="text-gray-600">Job {jobId}</p>
      <ul className="divide-y rounded-lg border">
        {vendors.map((vendor) => (
          <li
            key={vendor.id}
            data-testid="call-status-row"
            className="flex items-center justify-between px-4 py-3"
          >
            <span>{vendor.name}</span>
            <span className="text-sm text-gray-500">Queued (simulated)</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
