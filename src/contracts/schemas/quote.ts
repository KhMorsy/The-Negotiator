import { z } from "zod";

export const PricingModelSchema = z.enum([
  "flat",
  "hourly_with_minimum",
  "per_sqft",
]);

export const QuoteFeeSchema = z
  .object({
    id: z.string(),
    quoteId: z.string(),
    feeType: z.string(),
    amount: z.number(),
  })
  .strict();

export const QuoteSchema = z
  .object({
    id: z.string(),
    callId: z.string(),
    jobSpecId: z.string(),
    vendorId: z.string(),
    basePrice: z.number(),
    normalizedTotal: z.number(),
    pricingModel: PricingModelSchema,
    fees: z.array(QuoteFeeSchema),
    redFlag: z.boolean(),
    round: z.union([z.literal(1), z.literal(2)]),
  })
  .strict();

