import type { SpeechAgent } from "@/contracts";
import { createElevenLabsHttpClient } from "./elevenLabsClient";

export function createElevenLabsAgentAdapter(): SpeechAgent {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.ELEVENLABS_AGENT_ID;
  if (!apiKey || !agentId) {
    throw new Error("ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID required");
  }

  const client = createElevenLabsHttpClient(apiKey);

  return {
    async startIntakeSession(jobSpecDraftId) {
      const { conversationId } = await client.startConversation(agentId, {
        jobSpecDraftId,
      });
      return { sessionId: conversationId };
    },

    async getIntakeTranscript(sessionId) {
      const transcript = await client.getTranscript(sessionId);
      return {
        turns: transcript.map((turn) => ({
          role: turn.role,
          text: turn.message,
        })),
      };
    },
  };
}
