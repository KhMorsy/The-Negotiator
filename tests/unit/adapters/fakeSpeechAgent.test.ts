import { describe, expect, it } from "vitest";
import { createFakeSpeechAgent } from "@/adapters/fake/fakeSpeechAgent";

describe("createFakeSpeechAgent", () => {
  it("starts session and returns deterministic transcript", async () => {
    const agent = createFakeSpeechAgent();
    const { sessionId } = await agent.startIntakeSession("draft-001");
    expect(sessionId).toMatch(/^fake-session-/);
    const { turns } = await agent.getIntakeTranscript(sessionId);
    expect(turns.some((turn) => turn.text.includes("1800"))).toBe(true);
  });
});
