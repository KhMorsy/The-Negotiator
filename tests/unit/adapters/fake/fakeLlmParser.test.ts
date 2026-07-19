import { describe, expect, it } from "vitest";
import { createFakeLlmParser } from "@/adapters/fake/fakeLlmParser";
import type { JobSpec } from "@/contracts";

const jobSpec: JobSpec = {
  id: "job-1",
  jobType: "deep_clean",
  sqft: 1200,
  bedrooms: 2,
  bathrooms: 2,
  frequency: "once",
  addOns: [],
  suppliesProvided: false,
  pets: false,
  accessNotes: "",
  conditionNotes: "",
  geo: "Oakland, CA",
  confirmed: true,
};

describe("createFakeLlmParser", () => {
  it("extracts base price and trip fee from vendor utterance", async () => {
    const parser = createFakeLlmParser();
    const parsed = await parser.extractQuoteFromTranscript({
      jobSpec,
      transcript: {
        turns: [
          { role: "agent", text: "What is your price for a deep clean?" },
          {
            role: "vendor",
            text: "We charge $200 base plus a $35 trip fee, all flat rate.",
          },
        ],
      },
    });

    expect(parsed.basePrice).toBe(200);
    expect(parsed.normalizedTotal).toBe(235);
    expect(parsed.pricingModel).toBe("flat");
    expect(parsed.fees).toEqual(
      expect.arrayContaining([{ feeType: "trip_fee", amount: 35 }]),
    );
  });
});

