import { describe, expect, it } from "vitest";
import { createTestContainer } from "@/app/composition/createTestContainer";
import { handleTranscriptEvent } from "@/app/webhooks/handleTranscriptEvent";
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

describe("handleTranscriptEvent", () => {
  it("extracts and persists quote from transcript", async () => {
    const container = createTestContainer();

    const result = await handleTranscriptEvent(container, {
      callId: "call-1",
      jobSpec,
      vendorId: "vendor-1",
      round: 1,
      transcript: {
        turns: [
          {
            role: "vendor",
            text: "We charge $200 base plus a $35 trip fee.",
          },
        ],
      },
    });
    expect(result.kind).toBe("quote");
    if (result.kind !== "quote") throw new Error("expected quote");
    const quote = result.quote;

    expect(quote.normalizedTotal).toBe(235);
    const listed = await container.repos.quotes.listByJobSpec(jobSpec.id);
    expect(listed).toHaveLength(1);
  });
});

