import type { TelephonyProvider } from "@/contracts";

type TwilioCallsApi = {
  create(input: Record<string, string>): Promise<{ sid: string }>;
};

export function createTwilioElevenLabsAdapter(deps: {
  twilio: { calls: TwilioCallsApi };
  resolveVendorPhone(vendorId: string): Promise<string>;
  connectUrl: string;
  fromNumber: string;
}): TelephonyProvider {
  return {
    async startCall(input) {
      const to = await deps.resolveVendorPhone(input.vendorId);
      const connectUrl = new URL(deps.connectUrl);
      connectUrl.searchParams.set("jobSpecId", input.jobSpecId);
      connectUrl.searchParams.set("vendorId", input.vendorId);
      connectUrl.searchParams.set("round", String(input.round));
      const call = await deps.twilio.calls.create({
        to,
        from: deps.fromNumber,
        url: connectUrl.toString(),
      });
      return { callId: call.sid };
    },

    async endCall() {
      // Twilio status callbacks complete the live call lifecycle.
    },
  };
}
