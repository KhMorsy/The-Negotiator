import { beforeEach, describe, expect, it } from "vitest";
import type { QuoteRepository } from "@/contracts";

export function quoteRepositoryContract(
  name: string,
  factory: () => QuoteRepository,
) {
  describe(`QuoteRepository contract: ${name}`, () => {
    let repo: QuoteRepository;

    beforeEach(() => {
      repo = factory();
    });

    it("create persists quote with generated fee ids", async () => {
      const quote = await repo.create({
        callId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        jobSpecId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        vendorId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        basePrice: 200,
        normalizedTotal: 235,
        pricingModel: "flat",
        redFlag: false,
        round: 1,
        fees: [
          { feeType: "trip_fee", amount: 35 },
          { feeType: "supplies", amount: 0 },
        ],
      });

      expect(quote.id).toBeTruthy();
      expect(quote.fees).toHaveLength(2);
      expect(quote.fees[0].quoteId).toBe(quote.id);
      expect(quote.fees[0].id).toBeTruthy();
    });

    it("listByJobSpec filters by jobSpecId", async () => {
      const jobA = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
      const jobB = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

      await repo.create({
        callId: "call-a",
        jobSpecId: jobA,
        vendorId: "vendor-1",
        basePrice: 180,
        normalizedTotal: 180,
        pricingModel: "flat",
        redFlag: false,
        round: 1,
        fees: [],
      });

      await repo.create({
        callId: "call-b",
        jobSpecId: jobB,
        vendorId: "vendor-2",
        basePrice: 190,
        normalizedTotal: 190,
        pricingModel: "flat",
        redFlag: false,
        round: 1,
        fees: [],
      });

      const listed = await repo.listByJobSpec(jobA);
      expect(listed).toHaveLength(1);
      expect(listed[0].jobSpecId).toBe(jobA);
    });
  });
}

import { createInMemoryQuoteRepository } from "@/adapters/fake/inMemoryQuoteRepository";

quoteRepositoryContract("in-memory", createInMemoryQuoteRepository);

