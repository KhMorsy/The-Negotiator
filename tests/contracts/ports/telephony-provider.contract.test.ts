import { describe, expect, it } from "vitest";
import type { TelephonyProvider } from "@/contracts";
import { createSimulatedCallAdapter } from "@/adapters/fake/simulatedTelephony";

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
