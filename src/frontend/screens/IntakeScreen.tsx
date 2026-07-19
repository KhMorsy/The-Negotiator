"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { JobSpec } from "@/contracts";

export function IntakeScreen({
  jobSpec: initialJobSpec,
  jobId,
  sessionId,
}: {
  jobSpec?: JobSpec;
  jobId?: string;
  sessionId?: string;
}) {
  const id = initialJobSpec?.id ?? jobId ?? "";
  const session = sessionId ?? `fake-session-${id}`;
  const [jobSpec, setJobSpec] = useState<JobSpec | null>(initialJobSpec ?? null);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [voiceSynced, setVoiceSynced] = useState(false);
  const [uploadedAmount, setUploadedAmount] = useState<number | null>(null);

  useEffect(() => {
    if (initialJobSpec || !jobId) return;
    void fetch(`/api/job-specs/${jobId}`).then(async (response) => {
      if (!response.ok) {
        setNotFound(true);
        return;
      }
      setJobSpec(((await response.json()) as { jobSpec: JobSpec }).jobSpec);
    });
  }, [initialJobSpec, jobId]);

  async function handleVoiceSync() {
    setBusy(true);
    const response = await fetch("/api/intake/sync-voice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobSpecId: id, sessionId: session }),
    });
    if (response.ok) {
      setJobSpec(((await response.json()) as { jobSpec: JobSpec }).jobSpec);
      setVoiceSynced(true);
    }
    setBusy(false);
  }

  async function handleUpload(file: File) {
    setBusy(true);
    const form = new FormData();
    form.set("jobSpecId", id);
    form.set("file", file);
    const response = await fetch("/api/intake/upload-quote", {
      method: "POST",
      body: form,
    });
    if (response.ok) {
      const { jobSpec: updated } = (await response.json()) as { jobSpec: JobSpec };
      setJobSpec(updated);
      setUploadedAmount(updated.leverageQuoteAmount ?? null);
    }
    setBusy(false);
  }

  if (notFound) {
    return (
      <section className="space-y-4" data-testid="intake-screen">
        <h1 className="text-2xl font-semibold">Job not found</h1>
        <p className="text-gray-600">
          This job doesn&apos;t exist (the in-memory store resets when the server
          restarts).{" "}
          <Link href="/" className="underline">
            Start a new quote from the home page.
          </Link>
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-6" data-testid="intake-screen">
      <h1 className="text-2xl font-semibold">Tell us about your home</h1>
      <p className="text-gray-600">Job draft: {id}</p>
      <div
        data-testid="intake-voice-widget"
        className="space-y-3 rounded-lg border border-dashed border-gray-300 p-8 text-center"
      >
        <p className="text-gray-600">
          Voice interview (simulated in T1 — real ElevenLabs agent arrives in T2)
        </p>
        <button
          type="button"
          data-testid="intake-voice-sync-button"
          onClick={handleVoiceSync}
          disabled={busy || voiceSynced}
          className="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {voiceSynced ? "Interview synced" : "Run simulated voice interview"}
        </button>
        {voiceSynced && jobSpec && (
          <p className="text-sm text-green-700">
            Captured: {jobSpec.sqft} sqft · {jobSpec.bedrooms} bed /{" "}
            {jobSpec.bathrooms} bath · {jobSpec.frequency}
            {jobSpec.pets ? " · pets" : ""}
          </p>
        )}
      </div>
      <div data-testid="intake-upload-quote">
        <label className="block text-sm font-medium">
          Upload existing quote (PDF/image) — optional leverage
        </label>
        <input
          type="file"
          accept=".pdf,image/*"
          className="mt-2"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleUpload(file);
          }}
        />
        {uploadedAmount !== null && (
          <p className="mt-2 text-sm text-green-700">
            Leverage quote captured: ${uploadedAmount}
          </p>
        )}
      </div>
      <Link
        href={`/confirm/${id}`}
        data-testid="intake-continue-link"
        className="inline-flex rounded-lg bg-black px-5 py-3 text-white hover:bg-gray-800"
      >
        Continue to confirm
      </Link>
    </section>
  );
}
