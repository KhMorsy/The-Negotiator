"use client";

import { useEffect, useState } from "react";
import type { Call } from "@/contracts";

const POLL_INTERVAL_MS = 2_000;

export function useCallStatusFeed(jobId: string): {
  calls: Call[];
  transport: "realtime" | "polling";
  loading: boolean;
} {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const usePolling =
    process.env.NEXT_PUBLIC_USE_FAKE_REALTIME === "true" ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  useEffect(() => {
    let cancelled = false;
    let unsubscribe = () => {};

    async function loadCalls() {
      const response = await fetch(`/api/calls/${jobId}/status`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Call status request failed: ${response.status}`);
      }
      const body = (await response.json()) as { calls: Call[] };
      if (!cancelled) {
        setCalls(body.calls);
        setLoading(false);
      }
    }

    void loadCalls().catch(() => {
      if (!cancelled) {
        setLoading(false);
      }
    });

    if (usePolling) {
      const interval = setInterval(() => {
        void loadCalls().catch(() => undefined);
      }, POLL_INTERVAL_MS);
      return () => {
        cancelled = true;
        clearInterval(interval);
      };
    }

    void import("@/frontend/lib/supabaseBrowser")
      .then(({ subscribeCalls }) => {
        if (cancelled) {
          return;
        }
        unsubscribe = subscribeCalls(jobId, (updatedCall) => {
          setCalls((currentCalls) => {
            const existing = currentCalls.findIndex((call) => call.id === updatedCall.id);
            if (existing === -1) {
              return [...currentCalls, updatedCall];
            }
            return currentCalls.map((call) =>
              call.id === updatedCall.id ? updatedCall : call,
            );
          });
        });
      })
      .catch(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [jobId, usePolling]);

  return {
    calls,
    loading,
    transport: usePolling ? "polling" : "realtime",
  };
}
