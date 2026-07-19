import { randomUUID } from "node:crypto";
import type { Quote, QuoteFee, QuoteRepository } from "@/contracts";

export function createInMemoryQuoteRepository(): QuoteRepository {
  const quotes = new Map<string, Quote>();
  const feesByQuote = new Map<string, QuoteFee[]>();

  return {
    async create(input) {
      const quoteId = randomUUID();
      const fees: QuoteFee[] = input.fees.map((fee) => ({
        id: randomUUID(),
        quoteId,
        feeType: fee.feeType,
        amount: fee.amount,
      }));

      const quote: Quote = {
        id: quoteId,
        callId: input.callId,
        jobSpecId: input.jobSpecId,
        vendorId: input.vendorId,
        basePrice: input.basePrice,
        normalizedTotal: input.normalizedTotal,
        pricingModel: input.pricingModel,
        redFlag: input.redFlag,
        round: input.round,
        fees,
      };

      quotes.set(quoteId, quote);
      feesByQuote.set(quoteId, fees);
      return quote;
    },

    async listByJobSpec(jobSpecId) {
      return [...quotes.values()].filter((q) => q.jobSpecId === jobSpecId);
    },

    async getById(id) {
      return quotes.get(id) ?? null;
    },
  };
}

