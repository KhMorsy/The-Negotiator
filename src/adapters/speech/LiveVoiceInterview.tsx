"use client";

import {
  ConversationProvider,
  useConversationClientTool,
  useConversationControls,
  useConversationStatus,
} from "@elevenlabs/react";
import { useEffect, useRef, useState } from "react";
import type { JobSpec } from "@/contracts";

export function LiveVoiceInterview({
  jobSpecId,
  onSynced,
}: {
  jobSpecId: string;
  onSynced: (jobSpec: JobSpec) => void;
}) {
  return (
    <ConversationProvider>
      <LiveVoiceInterviewControls jobSpecId={jobSpecId} onSynced={onSynced} />
    </ConversationProvider>
  );
}

function LiveVoiceInterviewControls({
  jobSpecId,
  onSynced,
}: {
  jobSpecId: string;
  onSynced: (jobSpec: JobSpec) => void;
}) {
  const { startSession, endSession } = useConversationControls();
  const { status, message } = useConversationStatus();
  const conversationId = useRef<string | null>(null);
  const completedByAgent = useRef(false);
  const [agentId, setAgentId] = useState<string>();
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    void fetch("/api/intake/agent")
      .then(async (response) => {
        if (!response.ok) throw new Error("Live voice interview is unavailable");
        return response.json() as Promise<{ agentId: string }>;
      })
      .then(({ agentId: nextAgentId }) => setAgentId(nextAgentId))
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load agent"));
  }, []);

  async function syncTranscript() {
    if (!conversationId.current) return;
    setSyncing(true);
    try {
      const response = await fetch("/api/intake/sync-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobSpecId, sessionId: conversationId.current }),
      });
      if (!response.ok) throw new Error("Unable to sync interview transcript");
      onSynced(((await response.json()) as { jobSpec: JobSpec }).jobSpec);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to sync transcript");
    } finally {
      setSyncing(false);
    }
  }

  async function completeInterview(details: Record<string, unknown>) {
    setSyncing(true);
    try {
      const response = await fetch(`/api/intake/${jobSpecId}/complete-live`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(details),
      });
      if (!response.ok) throw new Error("Unable to save interview details");
      completedByAgent.current = true;
      onSynced(((await response.json()) as { jobSpec: JobSpec }).jobSpec);
      return "Interview details saved. Briefly tell the customer their information is saved, then end the conversation.";
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save interview details");
      return "I could not save the interview details. Please try again.";
    } finally {
      setSyncing(false);
    }
  }

  useConversationClientTool("complete_intake", completeInterview);

  function startInterview() {
    if (!agentId) return;
    setError(undefined);
    startSession({
      agentId,
      onConnect: ({ conversationId: nextConversationId }) => {
        conversationId.current = nextConversationId;
        completedByAgent.current = false;
      },
      onDisconnect: () => {
        if (!completedByAgent.current) {
          void syncTranscript();
        }
      },
      onError: (nextMessage) => setError(nextMessage),
    });
  }

  return (
    <div
      className="space-y-3 rounded-2xl border border-linen bg-white p-5 shadow-sm"
      data-testid="live-voice-interview"
    >
      <div>
        <p className="font-extrabold text-ink">Talk to Hagal</p>
        <p className="text-sm text-muted-warm">A live voice interview captures your cleaning details.</p>
      </div>
      <button
        type="button"
        onClick={status === "connected" ? endSession : startInterview}
        disabled={!agentId || syncing || status === "connecting"}
        className="rounded-full bg-terracotta px-5 py-2.5 font-bold text-white hover:bg-terracotta-dark disabled:opacity-50"
      >
        {status === "connected" ? "End voice interview" : "Start voice interview"}
      </button>
      {status === "connected" && (
        <p className="rounded-xl bg-sage px-3 py-2 text-sm font-bold text-pine">
          Connected — Hagal saves and ends automatically when it has the details.
        </p>
      )}
      {syncing && <p className="text-sm font-bold text-muted-warm">Syncing your interview details…</p>}
      {(error || message) && (
        <p className="rounded-xl bg-apricot-soft px-3 py-2 text-sm font-bold text-terracotta-dark">
          {error ?? message}
        </p>
      )}
    </div>
  );
}
