export type ElevenLabsClient = {
  startConversation(
    agentId: string,
    metadata: Record<string, string>,
  ): Promise<{ conversationId: string }>;
  getTranscript(
    conversationId: string,
  ): Promise<Array<{ role: string; message: string }>>;
};

export function createElevenLabsHttpClient(apiKey: string): ElevenLabsClient {
  const baseUrl = "https://api.elevenlabs.io/v1/convai/conversations";
  const headers = {
    "content-type": "application/json",
    "xi-api-key": apiKey,
  };

  return {
    async startConversation(agentId, metadata) {
      const response = await fetch(baseUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({ agent_id: agentId, metadata }),
      });
      if (!response.ok) {
        throw new Error(`ElevenLabs start failed: ${response.status}`);
      }

      const body = (await response.json()) as { conversation_id: string };
      return { conversationId: body.conversation_id };
    },

    async getTranscript(conversationId) {
      const response = await fetch(`${baseUrl}/${conversationId}`, { headers });
      if (!response.ok) {
        throw new Error(`ElevenLabs transcript failed: ${response.status}`);
      }

      const body = (await response.json()) as {
        transcript: Array<{ role: string; message: string }>;
      };
      return body.transcript;
    },
  };
}
