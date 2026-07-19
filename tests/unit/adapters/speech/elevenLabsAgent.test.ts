import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElevenLabsAgentAdapter } from "@/adapters/speech/elevenLabsAgent";

describe("createElevenLabsAgentAdapter", () => {
  beforeEach(() => {
    vi.stubEnv("ELEVENLABS_API_KEY", "test-key");
    vi.stubEnv("ELEVENLABS_AGENT_ID", "agent-123");
  });

  it("maps ElevenLabs conversations to the SpeechAgent transcript shape", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ conversation_id: "conv-abc" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          transcript: [
            { role: "agent", message: "How many bedrooms?" },
            { role: "user", message: "Three bedrooms." },
          ],
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const agent = createElevenLabsAgentAdapter();
    const { sessionId } = await agent.startIntakeSession("draft-1");
    const transcript = await agent.getIntakeTranscript(sessionId);

    expect(sessionId).toBe("conv-abc");
    expect(transcript.turns).toEqual([
      { role: "agent", text: "How many bedrooms?" },
      { role: "user", text: "Three bedrooms." },
    ]);
  });
});
