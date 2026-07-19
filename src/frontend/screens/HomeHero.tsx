"use client";

import { useState } from "react";
import Image from "next/image";
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
    <section className="relative overflow-hidden rounded-3xl border border-linen bg-white px-8 py-12 sm:px-12">
      <div
        aria-hidden
        className="absolute -right-16 -top-24 h-96 w-96 bg-apricot-soft"
        style={{ borderRadius: "58% 42% 55% 45% / 45% 52% 48% 55%" }}
      />
      <div
        aria-hidden
        className="absolute right-72 top-48 h-36 w-36 bg-sage"
        style={{ borderRadius: "45% 55% 60% 40% / 55% 45% 55% 45%" }}
      />
      <div className="relative flex flex-col items-center gap-10 lg:flex-row">
        <div className="max-w-xl flex-1 space-y-6">
          <span className="inline-flex rounded-full bg-sage px-4 py-2 text-sm font-extrabold text-pine">
            For busy households
          </span>
          <h1 className="font-display text-5xl font-semibold leading-tight">
            Hagal calls the cleaners.{" "}
            <em className="not-italic text-terracotta">You keep your evening.</em>
          </h1>
          <p className="max-w-md text-lg leading-relaxed text-muted-warm">
            Built for the busy dual-income family who wants reliable home cleaning
            without spending evenings on hold or overpaying for hidden fees.
          </p>
          <div className="flex max-w-md rounded-full border-2 border-pine bg-white p-1.5 shadow-lg shadow-pine/10">
            <label htmlFor="geo" className="sr-only">
              Your area
            </label>
            <input
              id="geo"
              value={geo}
              onChange={(event) => setGeo(event.target.value)}
              className="w-full flex-1 border-0 bg-transparent px-4 outline-none"
              placeholder="Your city, e.g. Austin, TX"
            />
            <button
              type="button"
              data-testid="start-intake-button"
              onClick={handleStart}
              disabled={loading}
              className="whitespace-nowrap rounded-full bg-terracotta px-6 py-3 font-extrabold text-white hover:bg-terracotta-dark disabled:opacity-50"
            >
              {loading ? "Sending Hagal…" : "Send Hagal →"}
            </button>
          </div>
          <div className="flex flex-wrap gap-5 text-sm font-bold text-pine">
            <span>
              <span className="text-terracotta">✓</span> No calls for you
            </span>
            <span>
              <span className="text-terracotta">✓</span> Real negotiated quotes
            </span>
            <span>
              <span className="text-terracotta">✓</span> Free to compare
            </span>
          </div>
          {error && <p className="text-sm font-bold text-terracotta-dark">{error}</p>}
        </div>
        <div className="relative shrink-0">
          <div className="absolute -left-6 -top-2 z-10 rounded-2xl border-2 border-pine bg-white px-4 py-2 text-sm font-extrabold text-pine shadow-md">
            Leave the haggling to me!
          </div>
          <Image
            src="/hagal/hagal-fox.png"
            alt="Hagal the fox holding a phone"
            width={280}
            height={280}
            priority
          />
        </div>
      </div>
    </section>
  );
}
