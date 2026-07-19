"use client";

import { useState } from "react";
import type { JobSpec } from "@/contracts";

export function ConfirmJobSpecScreen({ jobSpec: initial }: { jobSpec: JobSpec }) {
  const [jobSpec, setJobSpec] = useState(initial);
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    const response = await fetch(`/api/job-specs/${jobSpec.id}/confirm`, { method: "POST" });
    const body = await response.json();
    setJobSpec(body.jobSpec);
    setLoading(false);
  }
  return (
    <section className="space-y-6" data-testid="confirm-screen">
      <h1 className="text-2xl font-semibold">Confirm your job spec</h1>
      <dl className="grid grid-cols-2 gap-4 text-sm">
        <dt className="font-medium">Square feet</dt>
        <dd>{jobSpec.sqft}</dd>
        <dt className="font-medium">Leverage quote</dt>
        <dd>{jobSpec.leverageQuoteAmount ? `$${jobSpec.leverageQuoteAmount}` : "—"}</dd>
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
        className="rounded-lg bg-black px-5 py-3 text-white disabled:opacity-50"
        disabled={jobSpec.confirmed || loading}
        onClick={handleConfirm}
      >
        {jobSpec.confirmed ? "Confirmed" : "Confirm and start calling vendors"}
      </button>
    </section>
  );
}
