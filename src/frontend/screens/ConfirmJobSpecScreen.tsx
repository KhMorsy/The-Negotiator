"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { JobSpec } from "@/contracts";
import { JourneyStepper } from "@/frontend/components/JourneyStepper";

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
        <h1 className="font-display text-3xl text-pine">Job not found</h1>
        <p className="text-muted-warm">
          <Link href="/" className="font-bold text-terracotta underline">
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
    <section className="space-y-8" data-testid="confirm-screen">
      <JourneyStepper current="confirm" />
      <h1 className="font-display text-3xl text-pine">
        Confirm your job — Hagal reads it back
      </h1>
      <div className="rounded-2xl border border-linen bg-white p-6">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-extrabold uppercase tracking-wide text-muted-warm">
              Square feet
            </dt>
            <dd className="font-display text-lg text-ink">{jobSpec.sqft}</dd>
          </div>
          <div>
            <dt className="text-xs font-extrabold uppercase tracking-wide text-muted-warm">
              Leverage quote
            </dt>
            <dd className="font-display text-lg text-ink">
              {jobSpec.leverageQuoteAmount ? `$${jobSpec.leverageQuoteAmount}` : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-extrabold uppercase tracking-wide text-muted-warm">
              Bedrooms / Bathrooms
            </dt>
            <dd className="font-display text-lg text-ink">
              {jobSpec.bedrooms} / {jobSpec.bathrooms}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-extrabold uppercase tracking-wide text-muted-warm">
              Frequency
            </dt>
            <dd className="font-display text-lg text-ink">{jobSpec.frequency}</dd>
          </div>
          <div>
            <dt className="text-xs font-extrabold uppercase tracking-wide text-muted-warm">
              Job type
            </dt>
            <dd className="font-display text-lg text-ink">{jobSpec.jobType}</dd>
          </div>
        </dl>
      </div>
      <button
        type="button"
        data-testid="confirm-job-spec-button"
        className="rounded-full bg-terracotta px-6 py-3 font-extrabold text-white hover:bg-terracotta-dark disabled:opacity-50"
        disabled={jobSpec.confirmed || loading}
        onClick={handleConfirm}
      >
        {jobSpec.confirmed ? "Confirmed" : "Looks right — send Hagal to negotiate"}
      </button>
      {jobSpec.sqft <= 0 && !jobSpec.confirmed && (
        <p className="rounded-2xl bg-apricot-soft px-4 py-3 text-sm font-bold text-terracotta-dark">
          Job spec is incomplete — run the voice interview on the intake page first.
        </p>
      )}
      {error && <p className="text-sm font-bold text-terracotta-dark">{error}</p>}
      {callsStarted && (
        <Link
          href={`/calls/${jobSpec.id}`}
          data-testid="view-calls-link"
          className="inline-flex rounded-full border-2 border-pine px-6 py-3 font-extrabold text-pine hover:bg-sage/40"
        >
          Negotiation started — watch Hagal&apos;s calls
        </Link>
      )}
    </section>
  );
}
