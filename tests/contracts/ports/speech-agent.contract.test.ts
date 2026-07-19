import { describe, expect, it } from "vitest";
import type { SpeechAgent } from "@/contracts";
import { createFakeSpeechAgent } from "@/adapters/fake/fakeSpeechAgent";

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
