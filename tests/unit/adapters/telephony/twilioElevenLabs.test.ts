import { describe, expect, it, vi } from "vitest";
import { createTwilioElevenLabsAdapter } from "@/adapters/telephony/twilioElevenLabs";

describe("createTwilioElevenLabsAdapter", () => {
  it("starts an outbound call with the ElevenLabs connect URL", async () => {
    const createCall = vi.fn().mockResolvedValue({ sid: "CA123" });
    const telephony = createTwilioElevenLabsAdapter({
      twilio: { calls: { create: createCall } },
      resolveVendorPhone: async () => "+15125550101",
      connectUrl: "https://api.elevenlabs.io/v1/convai/twilio/connect",
      fromNumber: "+15125550000",
    });

    const { callId } = await telephony.startCall({
      jobSpecId: "job-1",
      vendorId: "vendor-tough",
      round: 1,
    });

    expect(callId).toBe("CA123");
    expect(createCall).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "+15125550101",
        from: "+15125550000",
        url: expect.stringContaining("convai/twilio/connect"),
      }),
    );
  });
});
