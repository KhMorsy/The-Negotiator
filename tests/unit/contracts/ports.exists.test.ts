import { describe, expect, it } from "vitest";
import type { TelephonyProvider } from "@/contracts/ports";

describe("TelephonyProvider", () => {
  it("defines startCall and endCall", async () => {
    await import("@/contracts/ports");

    const fake: TelephonyProvider = {
      async startCall() {
        return { callId: "c1" };
      },
      async endCall() {},
    };

    const started = await fake.startCall({
      jobSpecId: "js",
      vendorId: "v",
      round: 1,
    });
    expect(started.callId).toBe("c1");
  });
});

