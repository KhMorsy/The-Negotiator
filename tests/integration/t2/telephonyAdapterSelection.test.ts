import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createContainer,
  resetContainerForTests,
} from "@/app/composition/createContainer";

describe("telephony adapter selection", () => {
  beforeEach(() => resetContainerForTests());

  afterEach(() => {
    delete process.env.USE_SIMULATED_TELEPHONY;
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_FROM_NUMBER;
    delete process.env.ELEVENLABS_TWILIO_CONNECT_URL;
    resetContainerForTests();
  });

  it("defaults to simulated telephony", () => {
    expect(createContainer().telephonyKind).toBe("simulated");
  });

  it("selects Twilio only with explicit configuration", () => {
    process.env.USE_SIMULATED_TELEPHONY = "false";
    process.env.TWILIO_ACCOUNT_SID = "AC-test";
    process.env.TWILIO_AUTH_TOKEN = "test-token";
    process.env.TWILIO_FROM_NUMBER = "+15125550000";
    process.env.ELEVENLABS_TWILIO_CONNECT_URL =
      "https://api.elevenlabs.io/v1/convai/twilio/connect";

    expect(createContainer().telephonyKind).toBe("twilio");
  });
});
