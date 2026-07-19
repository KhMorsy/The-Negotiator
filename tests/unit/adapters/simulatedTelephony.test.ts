import { describe, expect, it } from "vitest";
import { createSimulatedCallAdapter } from "@/adapters/fake/simulatedTelephony";

describe("createSimulatedCallAdapter", () => {
  it("starts call and simulates round-2 price drop for tough vendor", async () => {
    const telephony = createSimulatedCallAdapter();
    const { callId } = await telephony.startCall({
      jobSpecId: "job-1",
      vendorId: "vendor-tough",
      round: 1,
    });
    expect(callId).toMatch(/^sim-call-/);

    await telephony.simulateQuoteExtracted(callId, {
      basePrice: 210,
      normalizedTotal: 225,
      pricingModel: "flat",
    });

    const roundTwo = await telephony.startCall({
      jobSpecId: "job-1",
      vendorId: "vendor-tough",
      round: 2,
    });
    const negotiation = await telephony.simulateNegotiationOutcome(roundTwo.callId);
    expect(negotiation.priceBefore).toBe(225);
    expect(negotiation.priceAfter).toBeLessThan(225);
  });

  it("lowball persona has hidden fees red-flag pattern", async () => {
    const telephony = createSimulatedCallAdapter();
    const { callId } = await telephony.startCall({
      jobSpecId: "job-1",
      vendorId: "vendor-lowball",
      round: 1,
    });
    const quote = await telephony.simulateQuoteExtracted(callId, {
      basePrice: 99,
      normalizedTotal: 99,
      pricingModel: "hourly_with_minimum",
    });
    expect(quote.pricingModel).toBe("hourly_with_minimum");
  });

  it("upseller persona returns higher base on round 1", async () => {
    const telephony = createSimulatedCallAdapter();
    const { callId } = await telephony.startCall({
      jobSpecId: "job-1",
      vendorId: "vendor-upseller",
      round: 1,
    });
    const quote = await telephony.simulateQuoteExtracted(callId, {
      basePrice: 0.14,
      normalizedTotal: 330,
      pricingModel: "per_sqft",
    });
    expect(quote.normalizedTotal).toBeGreaterThan(250);
  });
});

