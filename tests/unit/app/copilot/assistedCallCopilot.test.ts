import { afterEach, describe, expect, it } from "vitest";
import {
  createCopilotSession,
  isAssistedCallCopilotEnabled,
} from "@/app/copilot/assistedCallCopilot";

describe("assistedCallCopilot", () => {
  afterEach(() => {
    delete process.env.FEATURE_ASSISTED_CALL_COPILOT;
  });

  it("disabled by default", () => {
    expect(isAssistedCallCopilotEnabled()).toBe(false);
  });

  it("returns stub session when flag false", async () => {
    const session = await createCopilotSession({
      jobSpecId: "job-1",
      customerPhone: "+15125551212",
    });
    expect(session.enabled).toBe(false);
    expect(session.sessionId).toBeNull();
  });

  it("returns enabled stub when flag true", async () => {
    process.env.FEATURE_ASSISTED_CALL_COPILOT = "true";
    const session = await createCopilotSession({
      jobSpecId: "job-1",
      customerPhone: "+15125551212",
    });
    expect(session.enabled).toBe(true);
    expect(session.sessionId).toMatch(/^copilot-/);
  });
});
