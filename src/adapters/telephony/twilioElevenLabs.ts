import type { TelephonyProvider } from "@/contracts";

type TwilioCallsApi = {
  create(input: Record<string, string>): Promise<{ sid: string }>;
};

export function createTwilioHttpClient(
  accountSid: string,
  authToken: string,
): { calls: TwilioCallsApi } {
  const authorization = `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`;
  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`;

  return {
    calls: {
      async create(input) {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            authorization,
            "content-type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams(input),
        });
        if (!response.ok) {
          throw new Error(`Twilio start failed: ${response.status}`);
        }

        const body = (await response.json()) as { sid: string };
        return { sid: body.sid };
      },
    },
  };
}

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
