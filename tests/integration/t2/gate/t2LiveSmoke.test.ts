import { describe, expect, it } from "vitest";
import { createElevenLabsAgentAdapter } from "@/adapters/speech/elevenLabsAgent";

const runLive = process.env.RUN_LIVE_SMOKE === "1";

describe.skipIf(!runLive)("T2 live smoke — manual only", () => {
  it("starts an ElevenLabs intake session", async () => {
    const agent = createElevenLabsAgentAdapter();
    const { sessionId } = await agent.startIntakeSession("smoke-draft");

    expect(sessionId).toBeTruthy();
  }, 30_000);
});
