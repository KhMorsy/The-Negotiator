import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SpeechAgent } from "@/contracts";
import { createFakeSpeechAgent } from "@/adapters/fake/fakeSpeechAgent";
import { createElevenLabsAgentAdapter } from "@/adapters/speech/elevenLabsAgent";

export function runSpeechAgentContract(
  label: string,
  factory: () => SpeechAgent,
) {
  describe(`SpeechAgent contract — ${label}`, () => {
    it("starts a session with a non-empty id", async () => {
      const agent = factory();
      const { sessionId } = await agent.startIntakeSession("draft-job-1");

      expect(sessionId).toBeTruthy();
      expect(typeof sessionId).toBe("string");
    });

    it("returns transcript turns after a session starts", async () => {
      const agent = factory();
      const { sessionId } = await agent.startIntakeSession("draft-job-2");
      const transcript = await agent.getIntakeTranscript(sessionId);

      expect(Array.isArray(transcript.turns)).toBe(true);
      expect(transcript.turns.length).toBeGreaterThan(0);
      expect(transcript.turns[0]).toHaveProperty("role");
      expect(transcript.turns[0]).toHaveProperty("text");
    });
  });
}

runSpeechAgentContract("fake", createFakeSpeechAgent);

describe("SpeechAgent contract — elevenlabs (mocked HTTP)", () => {
  beforeEach(() => {
    vi.stubEnv("ELEVENLABS_API_KEY", "test-key");
    vi.stubEnv("ELEVENLABS_AGENT_ID", "agent-123");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            transcript: [{ role: "agent", message: "Hello" }],
          }),
        }),
    );
  });

  runSpeechAgentContract("elevenlabs-mocked", createElevenLabsAgentAdapter);
});
