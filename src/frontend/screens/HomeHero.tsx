"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function HomeHero() {
  const router = useRouter();
  const [geo, setGeo] = useState("Austin, TX");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/intake/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ geo }),
      });
      if (!response.ok) throw new Error(`intake start failed (${response.status})`);
      const { jobSpecId, sessionId } = (await response.json()) as {
        jobSpecId: string;
        sessionId: string;
      };
      router.push(`/intake/${jobSpecId}?session=${encodeURIComponent(sessionId)}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "unknown error");
      setLoading(false);
    }
  }

  return (
    <section className="space-y-6">
      <h1 className="text-4xl font-bold tracking-tight">The Negotiator</h1>
      <p className="max-w-2xl text-lg text-gray-600">
        Built for the busy dual-income family who wants reliable home cleaning
        without spending evenings on hold or overpaying for hidden fees.
      </p>
      <div className="flex max-w-md items-center gap-3">
        <label htmlFor="geo" className="sr-only">
          Your area
        </label>
        <input
          id="geo"
          value={geo}
          onChange={(event) => setGeo(event.target.value)}
          className="w-full rounded-lg border border-gray-300 px-4 py-3"
          placeholder="Your city, e.g. Austin, TX"
        />
      </div>
      <button
        type="button"
        data-testid="start-intake-button"
        onClick={handleStart}
        disabled={loading}
        className="inline-flex rounded-lg bg-black px-5 py-3 text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {loading ? "Creating your job…" : "Start your cleaning quote"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </section>
  );
}
