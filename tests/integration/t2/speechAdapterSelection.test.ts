import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createContainer,
  resetContainerForTests,
} from "@/app/composition/createContainer";

describe("speech adapter selection", () => {
  beforeEach(() => resetContainerForTests());

  afterEach(() => {
    delete process.env.USE_SIMULATED_SPEECH;
    delete process.env.ELEVENLABS_API_KEY;
    delete process.env.ELEVENLABS_AGENT_ID;
    resetContainerForTests();
  });

  it("defaults to the fake SpeechAgent", () => {
    expect(createContainer().speechAgentKind).toBe("fake");
  });

  it("selects ElevenLabs only with an explicit flag and both credentials", () => {
    process.env.USE_SIMULATED_SPEECH = "false";
    process.env.ELEVENLABS_API_KEY = "key";
    process.env.ELEVENLABS_AGENT_ID = "agent";

    expect(createContainer().speechAgentKind).toBe("elevenlabs");
  });
});
