"use client";

import { useEffect, useState, type ComponentType } from "react";
import Link from "next/link";
import type { JobSpec } from "@/contracts";
import { JourneyStepper } from "@/frontend/components/JourneyStepper";

export function IntakeScreen({
  jobSpec: initialJobSpec,
  jobId,
  sessionId,
  LiveVoiceInterviewComponent,
}: {
  jobSpec?: JobSpec;
  jobId?: string;
  sessionId?: string;
  LiveVoiceInterviewComponent?: ComponentType<{
    jobSpecId: string;
    onSynced: (jobSpec: JobSpec) => void;
  }>;
}) {
  const id = initialJobSpec?.id ?? jobId ?? "";
  const LiveVoiceInterview = LiveVoiceInterviewComponent;
  const session = sessionId ?? `fake-session-${id}`;
  const [jobSpec, setJobSpec] = useState<JobSpec | null>(initialJobSpec ?? null);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [voiceSynced, setVoiceSynced] = useState(false);
  const [uploadedAmount, setUploadedAmount] = useState<number | null>(null);
  const [photosMerged, setPhotosMerged] = useState(false);

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

  async function handlePhotoUpload(files: FileList) {
    setBusy(true);
    const form = new FormData();
    form.set("jobSpecId", id);
    Array.from(files).forEach((file) => form.append("photos", file));
    const response = await fetch("/api/intake/upload-photos", {
      method: "POST",
      body: form,
    });
    if (response.ok) {
      const { jobSpec: updated } = (await response.json()) as { jobSpec: JobSpec };
      setJobSpec(updated);
      setPhotosMerged(true);
    }
    setBusy(false);
  }

  if (notFound) {
    return (
      <section className="space-y-4" data-testid="intake-screen">
        <h1 className="font-display text-3xl text-pine">Job not found</h1>
        <p className="text-muted-warm">
          This job doesn&apos;t exist (the in-memory store resets when the server
          restarts).{" "}
          <Link href="/" className="font-bold text-terracotta underline">
            Start a new quote from the home page.
          </Link>
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-8" data-testid="intake-screen">
      <JourneyStepper current="intake" />
      <div className="space-y-1">
        <h1 className="font-display text-3xl text-pine">Tell Hagal about your home</h1>
        <p className="text-sm text-muted-warm">Job draft: {id}</p>
      </div>
      {LiveVoiceInterview && <LiveVoiceInterview jobSpecId={id} onSynced={setJobSpec} />}
      <div
        data-testid="intake-voice-widget"
        className="space-y-3 rounded-2xl border-2 border-dashed border-apricot bg-apricot-soft/40 p-8 text-center"
      >
        <p className="text-muted-warm">
          Simulated fallback — use this only if the live ElevenLabs interview is unavailable.
        </p>
        <button
          type="button"
          data-testid="intake-voice-sync-button"
          onClick={handleVoiceSync}
          disabled={busy || voiceSynced}
          className="rounded-full bg-pine px-5 py-2.5 font-bold text-white hover:bg-pine/90 disabled:opacity-50"
        >
          {voiceSynced ? "Simulated interview synced" : "Run simulated fallback"}
        </button>
        {voiceSynced && jobSpec && (
          <p className="text-sm font-bold text-pine">
            Captured: {jobSpec.sqft} sqft · {jobSpec.bedrooms} bed /{" "}
            {jobSpec.bathrooms} bath · {jobSpec.frequency}
            {jobSpec.pets ? " · pets" : ""}
          </p>
        )}
      </div>
      <div
        data-testid="intake-upload-quote"
        className="rounded-2xl border border-linen bg-white p-5"
      >
        <label className="block font-extrabold text-ink">
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
          <p className="mt-2 text-sm font-bold text-pine">
            Leverage quote captured: ${uploadedAmount}
          </p>
        )}
      </div>
      <div className="rounded-2xl border border-linen bg-white p-5">
        <label className="block font-extrabold text-ink">
          Upload room photos — optional vision estimate
        </label>
        <input
          type="file"
          accept="image/*"
          multiple
          data-testid="intake-room-photos"
          className="mt-2"
          disabled={busy}
          onChange={(event) => {
            const files = event.target.files;
            if (files && files.length > 0) void handlePhotoUpload(files);
          }}
        />
        {photosMerged && jobSpec && (
          <p className="mt-2 text-sm font-bold text-pine" data-testid="intake-photos-result">
            From photos: {jobSpec.sqft} sqft · {jobSpec.bedrooms} bed /{" "}
            {jobSpec.bathrooms} bath
            {jobSpec.conditionNotes ? ` — ${jobSpec.conditionNotes}` : ""}
          </p>
        )}
      </div>
      <Link
        href={`/confirm/${id}`}
        data-testid="intake-continue-link"
        className="inline-flex rounded-full bg-terracotta px-6 py-3 font-extrabold text-white hover:bg-terracotta-dark"
      >
        Continue — Hagal reads it back →
      </Link>
    </section>
  );
}
