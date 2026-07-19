"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { JobSpec } from "@/contracts";

export function ConfirmJobSpecScreen({
  jobSpec: initial,
  jobId,
}: {
  jobSpec?: JobSpec;
  jobId?: string;
}) {
  const [jobSpec, setJobSpec] = useState<JobSpec | null>(initial ?? null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [callsStarted, setCallsStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initial || !jobId) return;
    void fetch(`/api/job-specs/${jobId}`).then(async (response) => {
      if (!response.ok) {
        setNotFound(true);
        return;
      }
      setJobSpec(((await response.json()) as { jobSpec: JobSpec }).jobSpec);
    });
  }, [initial, jobId]);

  async function handleConfirm() {
    if (!jobSpec) return;
    setLoading(true);
    setError(null);
    const response = await fetch(`/api/job-specs/${jobSpec.id}/confirm`, {
      method: "POST",
    });
    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      setError(body.error ?? `confirm failed (${response.status})`);
      setLoading(false);
      return;
    }
    const confirmed = ((await response.json()) as { jobSpec: JobSpec }).jobSpec;
    setJobSpec(confirmed);
    const callsResponse = await fetch(`/api/calls/${confirmed.id}/start`, {
      method: "POST",
    });
    if (callsResponse.ok) {
      setCallsStarted(true);
    } else {
      const body = (await callsResponse.json()) as { error?: string };
      setError(body.error ?? `starting calls failed (${callsResponse.status})`);
    }
    setLoading(false);
  }

  if (notFound) {
    return (
      <section className="space-y-4" data-testid="confirm-screen">
        <h1 className="text-2xl font-semibold">Job not found</h1>
        <p className="text-gray-600">
          <Link href="/" className="underline">
            Start a new quote from the home page.
          </Link>
        </p>
      </section>
    );
  }

  if (!jobSpec) {
    return <p data-testid="confirm-loading">Loading job spec…</p>;
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
      {jobSpec.sqft <= 0 && !jobSpec.confirmed && (
        <p className="text-sm text-amber-700">
          Job spec is incomplete — run the voice interview on the intake page
          first.
        </p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {callsStarted && (
        <Link
          href={`/calls/${jobSpec.id}`}
          data-testid="view-calls-link"
          className="inline-flex rounded-lg border border-black px-5 py-3 hover:bg-gray-50"
        >
          Negotiation started — view call status
        </Link>
      )}
    </section>
  );
}
