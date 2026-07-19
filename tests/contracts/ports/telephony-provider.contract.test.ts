import { describe, expect, it } from "vitest";
import type { TelephonyProvider } from "@/contracts";
import { createSimulatedCallAdapter } from "@/adapters/fake/simulatedTelephony";
import { createTwilioElevenLabsAdapter } from "@/adapters/telephony/twilioElevenLabs";

export function runTelephonyProviderContract(
  label: string,
  factory: () => TelephonyProvider,
) {
  describe(`TelephonyProvider contract — ${label}`, () => {
    it("starts a call and ends it", async () => {
      const telephony = factory();
      const { callId } = await telephony.startCall({
        jobSpecId: "job-1",
        vendorId: "vendor-tough",
        round: 1,
      });

      expect(callId).toBeTruthy();
      await expect(telephony.endCall(callId)).resolves.toBeUndefined();
    });
  });
}

runTelephonyProviderContract("simulated", () => {
  const adapter = createSimulatedCallAdapter();
  return {
    startCall: adapter.startCall.bind(adapter),
    endCall: adapter.endCall.bind(adapter),
  };
});

runTelephonyProviderContract("twilio-mocked", () =>
  createTwilioElevenLabsAdapter({
    twilio: { calls: { create: async () => ({ sid: "CA-contract" }) } },
    resolveVendorPhone: async () => "+15125550101",
    connectUrl: "https://api.elevenlabs.io/v1/convai/twilio/connect",
    fromNumber: "+15125550000",
  }),
);
