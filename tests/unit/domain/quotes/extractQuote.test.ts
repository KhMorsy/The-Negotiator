import { describe, expect, it } from "vitest";
import { createFakeLlmParser } from "@/adapters/fake/fakeLlmParser";
import { createInMemoryQuoteRepository } from "@/adapters/fake/inMemoryQuoteRepository";
import type { JobSpec } from "@/contracts";
import { extractQuote } from "@/domain/quotes/extractQuote";

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

describe("extractQuote", () => {
  it("parses transcript and persists quote with fees", async () => {
    const quoteRepo = createInMemoryQuoteRepository();
    const parser = createFakeLlmParser();

    const quote = await extractQuote(
      { parser, quoteRepo },
      {
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
      },
    );

    expect(quote.id).toBeTruthy();
    expect(quote.callId).toBe("call-1");
    expect(quote.vendorId).toBe("vendor-1");
    expect(quote.normalizedTotal).toBe(235);
    expect(quote.fees).toHaveLength(1);

    const listed = await quoteRepo.listByJobSpec(jobSpec.id);
    expect(listed).toHaveLength(1);
    expect(listed[0].id).toBe(quote.id);
  });
});

