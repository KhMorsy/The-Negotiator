import type { JobSpec } from "@/contracts";

export function ConfirmJobSpecScreen({ jobSpec }: { jobSpec: JobSpec }) {
  return (
    <section className="space-y-6" data-testid="confirm-screen">
      <h1 className="text-2xl font-semibold">Confirm your job spec</h1>
      <dl className="grid grid-cols-2 gap-4 text-sm">
        <dt className="font-medium">Square feet</dt>
        <dd>{jobSpec.sqft}</dd>
        <dt className="font-medium">Bedrooms / Bathrooms</dt>
        <dd>
          {jobSpec.bedrooms} / {jobSpec.bathrooms}
        </dd>
        <dt className="font-medium">Frequency</dt>
        <dd>{jobSpec.frequency}</dd>
        <dt className="font-medium">Job type</dt>
        <dd>{jobSpec.jobType}</dd>
      </dl>
      <button
        type="button"
        data-testid="confirm-job-spec-button"
        className="rounded-lg bg-black px-5 py-3 text-white"
        disabled={jobSpec.confirmed}
      >
        {jobSpec.confirmed ? "Confirmed" : "Confirm and start calling vendors"}
      </button>
    </section>
  );
}
