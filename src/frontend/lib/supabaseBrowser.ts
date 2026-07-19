"use client";

import { createClient } from "@supabase/supabase-js";
import type { Call } from "@/contracts";

let client: ReturnType<typeof createClient> | undefined;

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY required");
  }

  client ??= createClient(url, key);
  return client;
}

function mapCallRow(row: Record<string, unknown>): Call {
  return {
    id: String(row.id),
    jobSpecId: String(row.job_spec_id),
    vendorId: String(row.vendor_id),
    round: Number(row.round) as Call["round"],
    outcome: (row.outcome as Call["outcome"]) ?? null,
    recordingUrl: row.recording_url == null ? null : String(row.recording_url),
  };
}

export function subscribeCalls(
  jobId: string,
  onUpdate: (call: Call) => void,
): () => void {
  const supabase = getClient();
  const channel = supabase
    .channel(`calls:${jobId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "calls", filter: `job_spec_id=eq.${jobId}` },
      (payload) => onUpdate(mapCallRow(payload.new as Record<string, unknown>)),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
