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
    <div className="space-y-3 rounded-lg border border-green-300 p-4" data-testid="live-voice-interview">
      <p className="text-sm font-medium">Live ElevenLabs interview</p>
      <button
        type="button"
        onClick={status === "connected" ? endSession : startInterview}
        disabled={!agentId || syncing || status === "connecting"}
        className="rounded-lg bg-green-700 px-4 py-2 text-white disabled:opacity-50"
      >
        {status === "connected" ? "End and sync interview" : "Start live voice interview"}
      </button>
      {status === "connected" && <p className="text-sm text-green-700">Connected — the interview saves and ends automatically when Alex has the details.</p>}
      {syncing && <p className="text-sm text-gray-600">Syncing your interview details…</p>}
      {(error || message) && <p className="text-sm text-red-600">{error ?? message}</p>}
    </div>
  );
}
